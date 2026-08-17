import { useEffect, useState } from "react";

/**
 * A minimal pub/sub toast system. Any component calls showToast(...) and
 * the single <ToastHost/> mounted in root.tsx renders it — no context
 * provider plumbing needed across routes, no extra re-renders elsewhere.
 */
export type ToastVariant = "success" | "error" | "info";

interface ToastPayload {
  message: string;
  variant?: ToastVariant;
}

interface ToastItem extends ToastPayload {
  id: number;
}

const EVENT_NAME = "drea:toast";

export function showToast(message: string, variant: ToastVariant = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastPayload>(EVENT_NAME, { detail: { message, variant } }));
}

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: "bg-forest text-ivory",
  error: "bg-error text-ivory",
  info: "bg-charcoal text-ivory",
};

export function ToastHost() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    let counter = 0;
    function handle(e: Event) {
      const detail = (e as CustomEvent<ToastPayload>).detail;
      const id = ++counter;
      setToasts((t) => [...t, { id, message: detail.message, variant: detail.variant ?? "success" }]);
      setTimeout(() => {
        setToasts((t) => t.filter((toast) => toast.id !== id));
      }, 3200);
    }
    window.addEventListener(EVENT_NAME, handle);
    return () => window.removeEventListener(EVENT_NAME, handle);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 items-center px-4 w-full sm:w-auto">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`${VARIANT_STYLES[t.variant ?? "success"]} text-sm px-4 py-2.5 shadow-lg max-w-sm text-center animate-toast-in`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
