/**
 * Formats a byte count as a short human-readable size string, e.g. 850 ->
 * "850 B", 184320 -> "180KB", 4404019 -> "4.2MB". Used to show upload
 * compression results ("Reduced from 4.2MB to 180KB") without repeating
 * this formatting logic at every call site.
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${Math.round(bytes)} B`;

  const kb = bytes / 1024;
  if (kb < 1024) return `${kb >= 100 ? Math.round(kb) : kb.toFixed(kb < 10 ? 1 : 0)}KB`;

  const mb = kb / 1024;
  return `${mb.toFixed(mb < 10 ? 1 : 0)}MB`;
}
