import { useCallback, useEffect, useRef, useState } from "react";
import type { UploadResult } from "../api/upload";
import { formatBytes } from "../utils/format";

const SUCCESS_MESSAGE_MS = 4000;
// Below this ratio a size difference is just re-encoding noise, not a
// difference worth reporting — showing "reduced from 180KB to 179KB" reads
// as broken, not helpful.
const NOTABLE_REDUCTION_RATIO = 0.95;

/**
 * Shared error/success message state for the upload screens
 * (ProductFormScreen, VendorPendingScreen, SlideFormScreen,
 * StoreSettingsScreen) — centralizes what used to be near-identical
 * copy-pasted `errorMessage` state (and, before this, no success feedback
 * at all — an upload finishing was only visible as a silent thumbnail
 * change) in each screen.
 *
 * Usage: call `onStart()` right before picking/uploading (clears any
 * previous message), `onSuccess(result)` once the upload resolves, and
 * `setErrorMessage(...)` in the catch block. Render `errorMessage` and
 * `successMessage` through <StatusBanner>.
 */
export function useUploadFeedback() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    },
    [],
  );

  const onStart = useCallback(() => {
    setErrorMessage(null);
    setSuccessMessage(null);
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
  }, []);

  const onSuccess = useCallback(
    (result: Pick<UploadResult, "originalBytes" | "finalBytes">, label = "Photo uploaded") => {
      const { originalBytes, finalBytes } = result;
      const message =
        originalBytes > 0 && finalBytes < originalBytes * NOTABLE_REDUCTION_RATIO
          ? `${label} — reduced from ${formatBytes(originalBytes)} to ${formatBytes(finalBytes)}.`
          : `${label}.`;
      setSuccessMessage(message);
      clearTimerRef.current = setTimeout(() => setSuccessMessage(null), SUCCESS_MESSAGE_MS);
    },
    [],
  );

  return { errorMessage, successMessage, setErrorMessage, onStart, onSuccess };
}
