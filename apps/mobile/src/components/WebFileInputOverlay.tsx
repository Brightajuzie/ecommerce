import type React from "react";
import { Platform } from "react-native";

interface WebFileInputOverlayProps {
  disabled?: boolean;
  accept?: string;
  onChange: (file: File) => void;
}

export function WebFileInputOverlay({
  disabled,
  accept = "image/jpeg,image/png,image/webp,image/*",
  onChange,
}: WebFileInputOverlayProps) {
  if (Platform.OS !== "web") return null;

  return (
    <input
      type="file"
      accept={accept}
      disabled={disabled}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (file) {
          onChange(file);
        }
      }}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
        opacity: 0,
        cursor: disabled ? "not-allowed" : "pointer",
        zIndex: 10,
      }}
    />
  );
}
