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

function assetToFormFile(asset: ImagePicker.ImagePickerAsset) {
  return {
    uri: asset.uri,
    name: asset.fileName ?? `photo-${Date.now()}.jpg`,
    type: asset.mimeType ?? "image/jpeg",
  } as unknown as Blob;
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
  formData.append("file", assetToFormFile(asset));

  const response = await apiClient.post<UploadResultDto>("/uploads/image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data.url;
}

/**
 * Opens the system image picker for a selfie and submits it directly to
 * /kyc/verify (not through Cloudinary — Smile ID needs the raw image bytes
 * server-side, not a hosted URL).
 */
export async function pickAndSubmitKyc(fields: {
  idType: string;
  idNumber: string;
  country: string;
}): Promise<void> {
  const asset = await pickImage();

  const formData = new FormData();
  formData.append("file", assetToFormFile(asset));
  formData.append("idType", fields.idType);
  formData.append("idNumber", fields.idNumber);
  formData.append("country", fields.country);

  await apiClient.post("/kyc/verify", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}
