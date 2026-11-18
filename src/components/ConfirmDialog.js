"use client";

import { useEffect } from "react";

export default function ConfirmDialog({
  title,
  message,
  error = "",
  pending = false,
  confirmLabel = "Delete",
  onCancel,
  onConfirm,
}) {
  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape" && !pending) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, pending]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Cancel"
        className="absolute inset-0 bg-foreground/40"
        onClick={onCancel}
        disabled={pending}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative w-full max-w-md rounded-2xl border border-theme-border bg-card p-6 shadow-sm"
      >
        <h2 id="confirm-dialog-title" className="text-lg font-semibold text-foreground">
          {title}
        </h2>
        <p className="mt-2 text-sm text-muted">{message}</p>
        {error ? (
          <p className="mt-3 text-sm text-absent" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-lg border border-theme-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-sidebar disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-hover disabled:opacity-60"
          >
            {pending ? "Deleting…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
