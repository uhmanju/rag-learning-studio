import type { ReactNode } from "react";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="m-auto flex items-center gap-2.5 text-[13px] text-text-muted" role="status" aria-live="polite">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-border-strong border-t-accent-fill" aria-hidden="true" />
      {label}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="m-auto max-w-sm rounded-lg border border-[#E8B4B7] bg-[#FCE8E9] p-5 text-center" role="alert">
      <div className="mb-1 text-[13px] font-semibold text-[#8A2A2E]">⚑ {title}</div>
      <p className="m-0 text-[12.5px] text-[#8A2A2E]">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-md border border-[#8A2A2E] px-4 py-1.5 text-[12.5px] font-medium text-[#8A2A2E] hover:bg-[#FCE8E9]"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return (
    <div className="m-auto max-w-sm text-center">
      <div className="mb-1 text-[14px] font-semibold text-text">{title}</div>
      <p className="m-0 text-[12.5px] text-text-muted">{message}</p>
      {action}
    </div>
  );
}
