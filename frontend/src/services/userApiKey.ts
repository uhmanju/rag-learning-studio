const STORAGE_KEY = "rag-learning-studio:user-groq-key";

/**
 * A key someone types in here is THEIR OWN key, entered by them, for
 * their own use — fundamentally different from the server-side default
 * key api/generate.js holds. Storing this client-side is fine: it's
 * exactly as visible to them as any other form field they've filled in,
 * and it's used only to call Groq directly from their own browser, never
 * sent to this app's own server at all.
 *
 * sessionStorage (not localStorage): cleared when the tab closes, so a
 * shared/public machine doesn't retain someone's key indefinitely.
 */
export function getUserGroqKey(): string | null {
  try {
    const v = sessionStorage.getItem(STORAGE_KEY);
    return v && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

export function setUserGroqKey(key: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, key.trim());
  } catch {
    // storage unavailable — the key simply won't persist for this
    // session; generate() will fall back to the server proxy instead.
  }
}

export function clearUserGroqKey(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}
