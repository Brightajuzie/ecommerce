/**
 * class-validator DTO errors come back as an array of strings
 * (e.g. ["password must be longer than or equal to 8 characters"]) rather
 * than a single message — passed straight into Alert.alert, an array
 * stringifies as an unreadable comma-joined blob. Everything else (business
 * errors like "An account with this email already exists") is a plain string.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data
    ?.message;
  if (Array.isArray(message)) return message.join("\n");
  if (typeof message === "string") return message;
  return fallback;
}
