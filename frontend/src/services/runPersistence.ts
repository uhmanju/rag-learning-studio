import type { PipelineRun } from "@/types/pipeline";
import type { ExecutionMode } from "@/hooks/usePipelineRun";

const STORAGE_KEY = "rag-learning-studio:run-state";

interface PersistedState {
  run: PipelineRun;
  executionMode: ExecutionMode;
}

/**
 * Without this, navigating between stage pages never re-fetches
 * anything (the run already lives in PipelineRunProvider's context for
 * the whole session) — but a hard page reload loses it, since React
 * state doesn't survive that. This persists just enough to restore the
 * current run after a reload without hitting the network again.
 *
 * Deliberately NOT persisted: `uploadedFile` (the real File object for
 * PDF rendering) — File instances can't be serialized, and browsers
 * won't let a page silently re-read a previously-picked file for
 * security reasons. After a reload, Parse falls back to its text-only
 * view until you re-select a file — a real, honest limitation, not a
 * bug, and the same thing that already happens for any Offline Mode
 * upload regardless of this feature.
 *
 * sessionStorage (not localStorage) on purpose: this is "restore what
 * you were just doing," not "remember forever" — it should clear when
 * the tab actually closes.
 */
export function saveRunState(run: PipelineRun | null, executionMode: ExecutionMode): void {
  try {
    if (!run) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    const payload: PersistedState = { run, executionMode };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage full, disabled, or unavailable (private browsing in some
    // browsers) — degrade to "no persistence" rather than break the app.
  }
}

export function loadRunState(): PersistedState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    if (!parsed?.run?.id || !parsed?.executionMode) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearRunState(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}
