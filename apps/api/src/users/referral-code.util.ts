import * as crypto from "crypto";

// Excludes visually-ambiguous characters (0/O, 1/I/L) since this is meant
// to be read aloud/typed by a human sharing their referral code.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 7;

export function generateReferralCode(): string {
  let code = "";
  const bytes = crypto.randomBytes(CODE_LENGTH);
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}
