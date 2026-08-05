/**
 * Local Mode requires a backend running on the visitor's own machine —
 * it only ever makes sense when this frontend itself is also running
 * locally (npm run dev, or a local preview build). On a hosted
 * deployment (Vercel or anywhere else), offering a "Local" toggle that
 * will fail for virtually every visitor is confusing UI, not a real
 * feature — so it's disabled outright rather than left clickable.
 */
export function isRunningLocally(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "" || host === "[::1]";
}
