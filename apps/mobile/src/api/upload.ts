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

type WebFile = { name: string; type: string };
type WebDoc = {
  createElement: (tag: string) => {
    style: Record<string, string>;
    setAttribute: (name: string, value: string) => void;
    click: () => void;
    addEventListener: (event: string, handler: () => void) => void;
    files: WebFile[] | null;
  };
  body: { appendChild: (n: unknown) => void; removeChild: (n: unknown) => void };
};

// Bypasses expo-image-picker's own web implementation on purpose.
// ExponentImagePicker.web.ts opens its hidden <input type="file"> via
// `input.dispatchEvent(new MouseEvent("click"))` — a *synthetic*,
// untrusted click (event.isTrusted is false). Desktop browsers are often
// lenient enough to still honor that for opening a file picker, but mobile
// Safari and many Android WebViews require a genuinely trusted click and
// silently ignore a synthetic one — no error thrown, the picker just never
// opens. Calling the real element.click() method here, synchronously
// within the same tap that triggered pickImage/captureSelfieBase64, works
// everywhere including mobile web. Using an offscreen styled element rather
// than `display: none` is required because mobile Safari ignores .click()
// on display: none elements.
// `capture` (e.g. "user" for the front camera) is only a hint mobile
// browsers may honor to open the camera directly instead of the gallery;
// desktop ignores it and shows a normal file picker.
function pickFileWeb(capture?: string): Promise<WebFile | null> {
  const doc = (globalThis as unknown as { document: WebDoc }).document;
  return new Promise((resolve, reject) => {
    const input = doc.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.style.position = "fixed";
    input.style.top = "-9999px";
    input.style.left = "-9999px";
    input.style.opacity = "0";
    input.style.pointerEvents = "none";
    input.style.width = "1px";
    input.style.height = "1px";
    if (capture) input.setAttribute("capture", capture);

    let resolved = false;
    const cleanup = () => {
      try {
        doc.body.removeChild(input);
      } catch {
        // ignore if already removed
      }
    };

    input.addEventListener("change", () => {
      if (resolved) return;
      resolved = true;
      const file = input.files?.[0] ?? null;
      cleanup();
      resolve(file);
    });
    input.addEventListener("cancel", () => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(null);
    });
    doc.body.appendChild(input);
    try {
      input.click();
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}

function webFileUrl(file: unknown): string {
  return (globalThis as unknown as { URL: { createObjectURL: (f: unknown) => string } }).URL
    .createObjectURL(file);
}

function webFileToBase64(file: unknown): Promise<string> {
  return new Promise((resolve, reject) => {
    const FileReaderCtor = (globalThis as unknown as { FileReader: new () => {
      onload: () => void;
      onerror: () => void;
      readAsDataURL: (f: unknown) => void;
      result: string;
    } }).FileReader;
    const reader = new FileReaderCtor();
    reader.onload = () => {
      // Strip the "data:image/jpeg;base64," prefix — callers want the raw
      // base64 payload, matching what expo-image-picker's own base64
      // option returns natively.
      resolve(reader.result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(new Error("Couldn't read that photo. Please try again."));
    reader.readAsDataURL(file);
  });
}

async function pickImage(): Promise<{ uri: string; fileName?: string | null }> {
  if (Platform.OS === "web") {
    const file = await pickFileWeb();
    if (!file) throw new ImagePickerCancelledError();
    return { uri: webFileUrl(file), fileName: file.name };
  }

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

// Best-effort — deleting a stale intermediate file is just cache hygiene,
// never worth failing the upload over if it doesn't work.
function deleteQuietly(uri: string) {
  if (Platform.OS === "web") {
    try {
      (globalThis as unknown as { URL?: { revokeObjectURL?: (u: string) => void } }).URL?.revokeObjectURL?.(uri);
    } catch {
      // ignore
    }
    return;
  }
  try {
    new ExpoFile(uri).delete();
  } catch {
    // ignore
  }
}

/**
 * Compresses an image on the web platform using native browser HTML5 Canvas.
 * Bypasses expo-image-manipulator's web action which uses a single-threaded
 * CPU-bound pixel loop (Hermite resample) that can freeze/crash mobile browsers
 * on multi-megapixel photos, and avoids CORS issues when setting crossOrigin
 * on local blob: URLs in Safari.
 */
function compressImageWeb(
  uri: string,
  width: number,
  quality: number,
): Promise<{ uri: string; size: number }> {
  return new Promise((resolve, reject) => {
    const ImgCtor = (globalThis as unknown as { Image?: new () => HTMLImageElement }).Image;
    if (!ImgCtor) {
      reject(new Error("Image constructor not available"));
      return;
    }
    const img = new ImgCtor();
    img.onload = () => {
      try {
        const sourceWidth = img.naturalWidth || img.width;
        const sourceHeight = img.naturalHeight || img.height;
        if (!sourceWidth || !sourceHeight) {
          reject(new Error("Invalid image dimensions"));
          return;
        }
        const scale = Math.min(1, width / sourceWidth);
        const targetWidth = Math.round(sourceWidth * scale);
        const targetHeight = Math.round(sourceHeight * scale);

        const doc = (globalThis as unknown as { document: Document }).document;
        const canvas = doc.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context unavailable"));
          return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to encode compressed image"));
              return;
            }
            const blobUrl = (
              globalThis as unknown as { URL: { createObjectURL: (b: Blob) => string } }
            ).URL.createObjectURL(blob);
            resolve({
              uri: blobUrl,
              size: blob.size,
            });
          },
          "image/jpeg",
          quality,
        );
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error("Could not load image for compression"));
    img.src = uri;
  });
}

/**
 * Resizes and re-compresses an image until it fits under the server's
 * upload cap. expo-image-picker's own `quality` option only controls JPEG
 * compression ratio, not pixel dimensions — a modern phone photo run
 * through that alone is routinely several MB, several times over
 * MAX_UPLOAD_BYTES, so without this step most real-world picks were
 * failing outright against uploads.controller.ts's 200KB limit. Skips
 * entirely if the original is already small enough (e.g. a screenshot or
 * an already-compressed image), to avoid a pointless quality hit.
 *
 * Each step is independently try/caught and any file it produced is
 * deleted before moving on — a lower-spec/low-storage phone (common
 * among this app's vendors) can genuinely fail to decode/re-encode a
 * large original at all (out of memory) rather than just producing a
 * file that's still too big, and without this a single failed attempt
 * used to abort the whole upload instead of falling through to a
 * cheaper, smaller attempt that might actually succeed. Cleaning up each
 * superseded attempt's file also matters more on a phone that's already
 * low on storage than it would elsewhere.
 */
async function compressImageUnderLimit(
  uri: string,
): Promise<{ uri: string; mimeType: string }> {
  const originalSize = await getFileSize(uri);
  if (originalSize > 0 && originalSize <= MAX_UPLOAD_BYTES) {
    return { uri, mimeType: "image/jpeg" };
  }

  let lastGoodUri: string | null = null;
  let anyStepSucceeded = false;

  for (const { width, quality } of COMPRESSION_STEPS) {
    try {
      let compressedUri: string;
      let size: number;

      if (Platform.OS === "web") {
        const res = await compressImageWeb(uri, width, quality);
        compressedUri = res.uri;
        size = res.size;
      } else {
        const context = ImageManipulator.manipulate(uri);
        context.resize({ width });
        const rendered = await context.renderAsync();
        const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: quality });
        compressedUri = result.uri;
        size = await getFileSize(result.uri);
      }
      anyStepSucceeded = true;

      if (size <= MAX_UPLOAD_BYTES) {
        if (lastGoodUri) deleteQuietly(lastGoodUri);
        return { uri: compressedUri, mimeType: "image/jpeg" };
      }

      // Still too big — keep it only as the fallback-of-last-resort below,
      // discarding whatever the previous (larger) attempt produced.
      if (lastGoodUri) deleteQuietly(lastGoodUri);
      lastGoodUri = compressedUri;
    } catch (error) {
      // This step couldn't even run (commonly out-of-memory decoding a
      // large original on a constrained device) — fall through to the
      // next, cheaper step rather than aborting the whole upload.
      if (__DEV__) {
        console.warn(`Image compression step (width=${width}) failed, trying a smaller one`, error);
      }
    }
  }

  if (lastGoodUri) {
    // Every step ran but stayed over the limit (an unusually dense/large
    // source image) — hand over the smallest version we managed anyway
    // rather than give up; the server rejects it with a clear message if
    // it's genuinely still too big, which beats never attempting the upload.
    return { uri: lastGoodUri, mimeType: "image/jpeg" };
  }

  if (!anyStepSucceeded) {
    // Every single step threw — genuinely couldn't process this image on
    // this device (out of memory/storage, or a corrupt file), not just
    // "still too large". A distinct message so the buyer/vendor knows a
    // different photo is the fix, not just retrying the same one.
    throw new Error(
      "This device couldn't process that photo. Try a smaller photo, or free up some storage and try again.",
    );
  }

  // Unreachable in practice (anyStepSucceeded implies lastGoodUri was set),
  // but keeps this function's return type honest without a `!`.
  return { uri, mimeType: "image/jpeg" };
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
 * On web, uses the same pickFileWeb helper as pickImage (with a "user"
 * capture hint for the front camera) rather than
 * ImagePicker.launchCameraAsync — see pickFileWeb's own comment for why:
 * expo-image-picker's web implementation opens its file input with a
 * synthetic (untrusted) click event, which mobile Safari/Chrome silently
 * ignore, so the camera/picker never opened there at all.
 */
export async function captureSelfieBase64(): Promise<string> {
  if (Platform.OS === "web") {
    const file = await pickFileWeb("user");
    if (!file) throw new ImagePickerCancelledError();
    return webFileToBase64(file);
  }

  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Camera permission is required for the liveness check.");
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
 *
 * `onProgress`, if given, is called with 0-100 as the actual HTTP upload
 * (not the pick/compress steps before it, which have no comparable
 * byte-level progress to report and are normally fast) advances — driven
 * by axios's real onUploadProgress, not a fake animated placeholder. See
 * components/UploadProgressBar.
 */
export async function pickAndUploadImage(
  type?: UploadType,
  onProgress?: (percent: number) => void,
): Promise<string> {
  const asset = await pickImage();
  const { uri, mimeType } = await compressImageUnderLimit(asset.uri);
  const rawName = asset.fileName ?? `photo-${Date.now()}.jpg`;
  const name = rawName.replace(/\.[^.]+$/, "") + ".jpg";

  // React Native's FormData accepts this { uri, name, type } shape for file fields;
  // axios/XHR sets the multipart boundary header automatically for FormData bodies.
  const formData = new FormData();
  formData.append("file", await uriToFormFile(uri, name, mimeType));
  if (type) {
    formData.append("type", type);
  }

  // On web, explicitly setting "Content-Type": "multipart/form-data" overrides
  // the browser's automatic boundary parameter generation (stripping the
  // boundary=... part), which causes Multer to reject the request with
  // "Multipart: Boundary not found" or "No file was uploaded". Leaving it
  // undefined on web lets Axios and the browser set the proper Content-Type
  // with multipart boundary.
  const response = await apiClient.post<UploadResultDto>("/uploads/image", formData, {
    headers: Platform.OS === "web" ? undefined : { "Content-Type": "multipart/form-data" },
    onUploadProgress: onProgress
      ? (event) => {
          if (event.total) {
            onProgress(Math.round((event.loaded / event.total) * 100));
          }
        }
      : undefined,
  });

  return response.data.url;
}
