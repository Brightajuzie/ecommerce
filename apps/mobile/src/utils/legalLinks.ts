import { Alert, Linking } from "react-native";

// Google Play requires a privacy policy reachable from inside the app, plus a
// way to request account deletion (the same URL goes in Play Console →
// App content → Data deletion). Both must be public web pages. Links render
// only once the URL is set, so nothing points at a page that doesn't exist.
export const PRIVACY_POLICY_URL: string | null = "https://www.ikay.ng/privacy.html";
export const ACCOUNT_DELETION_URL: string | null = "https://www.ikay.ng/delete-account.html";

export function openLegalLink(url: string | null) {
  if (!url) return;
  Linking.openURL(url).catch(() => {
    Alert.alert("Couldn't open link", url);
  });
}
