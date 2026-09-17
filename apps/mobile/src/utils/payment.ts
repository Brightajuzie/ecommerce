// react-native-webview has no web implementation at all — rendering
// PaymentWebViewScreen there throws "React Native WebView does not support
// this platform." (see that screen for the native-only in-app flow). The
// app also has no URL-based deep-linking set up (NavigationContainer's
// `linking` prop is unconfigured), so bouncing the gateway's own redirect
// back into a specific in-app screen isn't an option without adding that.
//
// Instead, on web: open the gateway's hosted checkout in a real new tab —
// exactly how these gateways are meant to be used in a browser, and some
// even block being iframed/webviewed at all — and send the current tab
// straight to OrderDetail (see both call sites). That screen already polls
// the order every 3s while it's PENDING_PAYMENT, so it picks up the PAID
// status on its own the moment the gateway's webhook lands; the existing
// plain "you can close this window" landing page
// (PaymentsController.redirectLanding) is exactly what's needed in the new
// tab either way, no redirect URL needs to point anywhere special.

type WebWindow = { closed: boolean; location: { href: string } } | null;

// Call this SYNCHRONOUSLY, directly inside the button's onPress — before
// starting the checkout/payment-initiate network calls, not in their
// onSuccess. Most browsers only allow window.open() without it being
// treated (and likely blocked) as a popup for a brief window right after a
// real user gesture; by the time an async mutation's onSuccess fires,
// especially against this project's documented Supabase latency, that
// window has often already closed. Opening a blank tab immediately and
// redirecting it later (via redirectTab, once the real URL is known) keeps
// the open() call inside the gesture while still letting the URL arrive
// asynchronously.
export function openBlankTab(): WebWindow {
  return (globalThis as unknown as { open: (url: string, target: string) => WebWindow }).open(
    "",
    "_blank",
  );
}

// Sends an already-open tab (from openBlankTab) to its real destination
// once the checkout URL is known. Falls back to a fresh window.open() if
// the tab reference is missing or the tab was closed in the meantime —
// still likely to be popup-blocked at that point since it's no longer
// inside the original gesture, but better to try than to do nothing.
export function redirectTab(tab: WebWindow, checkoutUrl: string) {
  if (tab && !tab.closed) {
    tab.location.href = checkoutUrl;
    return;
  }
  (globalThis as unknown as { open: (url: string, target: string) => unknown }).open(
    checkoutUrl,
    "_blank",
  );
}
