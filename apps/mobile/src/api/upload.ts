import * as ImagePicker from "expo-image-picker";
import type { UploadResultDto } from "@ikstore/shared";
import { apiClient } from "./client";

export class ImagePickerCancelledError extends Error {}

async function uploadPickedAsset(asset: ImagePicker.ImagePickerAsset): Promise<string> {
  const fileName = asset.fileName ?? `photo-${Date.now()}.jpg`;
  const mimeType = asset.mimeType ?? "image/jpeg";

  const formData = new FormData();
  // React Native's FormData accepts this { uri, name, type } shape for file fields;
  // axios/XHR sets the multipart boundary header automatically for FormData bodies.
  formData.append("file", {
    uri: asset.uri,
    name: fileName,
    type: mimeType,
  } as unknown as Blob);

  const response = await apiClient.post<UploadResultDto>("/uploads/image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data.url;
}

/**
 * Opens the system image picker and uploads the selected photo, returning
 * the hosted (enhanced) image URL. Throws ImagePickerCancelledError if the
 * user backs out without picking anything.
 */
export async function pickAndUploadImage(): Promise<string> {
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

  return uploadPickedAsset(result.assets[0]);
}
