import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
// Aliased — the global `File` (used below to build a web multipart part
// from a Blob) and expo-file-system's `File` (a filesystem-path wrapper,
// unrelated constructor signature) are two different things with the same
// name; importing it unaliased would silently shadow the web one.
import { File as ExpoFile } from "expo-file-system";
import type { UploadResultDto } from "@ikaystores/shared";
import { apiClient } from "./client";

export class ImagePickerCancelledError extends Error {}

// Must match apps/api/src/uploads/uploads.controller.ts's own
// MAX_FILE_SIZE_BYTES — that's the hard server-side cap (multer rejects
// anything over it before this app's code even runs), this is the client
// doing its best to land safely under it before ever sending the request.
const MAX_UPLOAD_BYTES = 200 * 1024;

export type UploadType = "product" | "document" | "banner" | "logo";

async function pickImage(): Promise<ImagePicker.ImagePickerAsset> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Photo library permission is required to pick an image.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.8,
    allowsEditing: true,
  });

  if (result.canceled || result.assets.length === 0) {
    throw new ImagePickerCancelledError();
  }

  return result.assets[0];
}

async function getFileSize(uri: string): Promise<number> {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const blob = await response.blob();
    return blob.size;
  }
  return new ExpoFile(uri).size ?? 0;
}

// A step-down ladder of (max dimension, JPEG quality) pairs, tried in
// order until the result fits under MAX_UPLOAD_BYTES. Re-manipulates from
// the original uri every attempt rather than the previous attempt's output
// — re-compressing an already-compressed JPEG compounds quality loss for
// no benefit, since we're not reusing any of the earlier work anyway.
const COMPRESSION_STEPS: { width: number; quality: number }[] = [
  { width: 1600, quality: 0.75 },
  { width: 1300, quality: 0.65 },
  { width: 1000, quality: 0.55 },
  { width: 800, quality: 0.45 },
  { width: 600, quality: 0.4 },
  { width: 450, quality: 0.35 },
];

/**
 * Resizes and re-compresses an image until it fits under the server's
 * upload cap. expo-image-picker's own `quality` option only controls JPEG
 * compression ratio, not pixel dimensions — a modern phone photo run
 * through that alone is routinely several MB, several times over
 * MAX_UPLOAD_BYTES, so without this step most real-world picks were
 * failing outright against uploads.controller.ts's 200KB limit. Skips
 * entirely if the original is already small enough (e.g. a screenshot or
 * an already-compressed image), to avoid a pointless quality hit.
 */
async function compressImageUnderLimit(
  uri: string,
): Promise<{ uri: string; mimeType: string }> {
  const originalSize = await getFileSize(uri);
  if (originalSize > 0 && originalSize <= MAX_UPLOAD_BYTES) {
    return { uri, mimeType: "image/jpeg" };
  }

  let lastUri = uri;
  for (const { width, quality } of COMPRESSION_STEPS) {
    const context = ImageManipulator.manipulate(uri);
    context.resize({ width, height: null });
    const rendered = await context.renderAsync();
    const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: quality });
    lastUri = result.uri;

    const size = await getFileSize(result.uri);
    if (size <= MAX_UPLOAD_BYTES) {
      return { uri: result.uri, mimeType: "image/jpeg" };
    }
  }

  // Every step tried and still over the limit (an unusually dense/large
  // source image) — hand over the smallest version we managed anyway
  // rather than give up; the server rejects it with a clear message if
  // it's genuinely still too big, which beats never attempting the upload.
  return { uri: lastUri, mimeType: "image/jpeg" };
}

// React Native's own FormData polyfill (native iOS/Android) special-cases a
// plain { uri, name, type } object as a file field. On web, FormData is the
// browser's native implementation, which has no such special-casing — it
// just stringifies a plain object ("[object Object]"), silently dropping
// the actual file content and producing a request the server rejects as
// "No file was uploaded". Web needs a real Blob/File instead, fetched from
// the uri (a blob: URL after compressImageUnderLimit on web).
async function uriToFormFile(uri: string, name: string, type: string): Promise<Blob> {
  if (Platform.OS === "web") {
    const response = await fetch(uri);
    const blob = await response.blob();
    // A File (Blob subclass with a name) so the multipart part carries a
    // filename, matching what the server/multer expects.
    return new File([blob], name, { type: blob.type || type }) as unknown as Blob;
  }

  return { uri, name, type } as unknown as Blob;
}

/**
 * Opens the front camera for a liveness-check selfie and returns it as a
 * base64 string (no data-URI prefix) — sent straight to
 * POST /kyc/check-liveness, never uploaded to Cloudinary or stored, unlike
 * pickAndUploadImage below. Throws ImagePickerCancelledError if the user
 * backs out without taking a photo.
 *
 * Per https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/, on web
 * launchCameraAsync "must be called immediately in a user interaction like
 * a button press, otherwise the browser will block the request without a
 * warning" — and requestCameraPermissionsAsync "does nothing on web"
 * anyway, since it's the browser's own getUserMedia permission prompt that
 * gates access there, not Expo's. Awaiting that no-op call first (as this
 * used to) burns the click's transient user-activation window, so the
 * camera silently never opens. Native platforms don't have that
 * restriction, and there the explicit request still surfaces a clearer
 * error than a bare camera-launch failure would.
 */
export async function captureSelfieBase64(): Promise<string> {
  if (Platform.OS !== "web") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new Error("Camera permission is required for the liveness check.");
    }
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    cameraType: ImagePicker.CameraType.front,
    quality: 0.7,
    base64: true,
    allowsEditing: false,
  });

  if (result.canceled || result.assets.length === 0) {
    throw new ImagePickerCancelledError();
  }

  const asset = result.assets[0];
  if (!asset.base64) {
    throw new Error("Couldn't read that photo. Please try again.");
  }
  return asset.base64;
}

/**
 * Opens the system image picker, compresses the selected photo down to fit
 * the server's upload cap, and uploads it — returning the hosted (enhanced)
 * image URL. Throws ImagePickerCancelledError if the user backs out without
 * picking anything.
 *
 * `type: "product"` gets UploadsService's ecommerce-standard treatment
 * (square pad on a white background, on top of the usual improve/sharpen)
 * — leave it unset for anything that shouldn't be forced into a square
 * white frame: KYC documents, banner slides, the store logo.
 */
export async function pickAndUploadImage(type?: UploadType): Promise<string> {
  const asset = await pickImage();
  const { uri, mimeType } = await compressImageUnderLimit(asset.uri);
  const name = asset.fileName ?? `photo-${Date.now()}.jpg`;

  // React Native's FormData accepts this { uri, name, type } shape for file fields;
  // axios/XHR sets the multipart boundary header automatically for FormData bodies.
  const formData = new FormData();
  formData.append("file", await uriToFormFile(uri, name, mimeType));
  if (type) {
    formData.append("type", type);
  }

  const response = await apiClient.post<UploadResultDto>("/uploads/image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data.url;
}
