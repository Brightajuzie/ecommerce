import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import type { UploadResultDto } from "@ikaystores/shared";
import { apiClient } from "./client";

export class ImagePickerCancelledError extends Error {}

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

// React Native's own FormData polyfill (native iOS/Android) special-cases a
// plain { uri, name, type } object as a file field. On web, FormData is the
// browser's native implementation, which has no such special-casing — it
// just stringifies a plain object ("[object Object]"), silently dropping
// the actual file content and producing a request the server rejects as
// "No file was uploaded". Web needs a real Blob/File instead, fetched from
// the asset's blob: URI that expo-image-picker's web implementation hands
// back.
async function assetToFormFile(asset: ImagePicker.ImagePickerAsset): Promise<Blob> {
  const name = asset.fileName ?? `photo-${Date.now()}.jpg`;
  const type = asset.mimeType ?? "image/jpeg";

  if (Platform.OS === "web") {
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    // A File (Blob subclass with a name) so the multipart part carries a
    // filename, matching what the server/multer expects.
    return new File([blob], name, { type: blob.type || type });
  }

  return { uri: asset.uri, name, type } as unknown as Blob;
}

/**
 * Opens the system image picker and uploads the selected photo, returning
 * the hosted (enhanced) image URL. Throws ImagePickerCancelledError if the
 * user backs out without picking anything.
 */
export async function pickAndUploadImage(): Promise<string> {
  const asset = await pickImage();

  // React Native's FormData accepts this { uri, name, type } shape for file fields;
  // axios/XHR sets the multipart boundary header automatically for FormData bodies.
  const formData = new FormData();
  formData.append("file", await assetToFormFile(asset));

  const response = await apiClient.post<UploadResultDto>("/uploads/image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data.url;
}
