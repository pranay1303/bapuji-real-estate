// src/context/ToastContext.jsx
import React, { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext();

/**
 * ToastProvider - wraps the app and provides showToast API
 *
 * Usage:
 * const { showToast } = useToast();
 * showToast("Saved!", { type: "success", duration: 3000 });
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, opts = {}) => {
    const id = String(Date.now()) + Math.random().toString(36).slice(2, 7);
    const toast = {
      id,
      message,
      type: opts.type || "info", // info | success | error
      duration: typeof opts.duration === "number" ? opts.duration : 3000,
    };
    setToasts((s) => [...s, toast]);

    // auto-remove
    setTimeout(() => {
      setToasts((s) => s.filter((t) => t.id !== id));
    }, toast.duration);
  }, []);

  const remove = useCallback((id) => {
    setToasts((s) => s.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ push, remove }}>
      {children}
      <ToastStack toasts={toasts} onRemove={remove} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

/**
 * ToastStack component (internal)
 */
function ToastStack({ toasts, onRemove }) {
  return (
    <div className="fixed right-4 bottom-6 z-50 flex flex-col gap-3 items-end">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`max-w-sm w-full transform transition-all duration-200 ease-out rounded-lg shadow-lg px-4 py-2
            ${t.type === "success" ? "bg-green-600 text-white" : t.type === "error" ? "bg-red-600 text-white" : "bg-black/80 text-white"}`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm">{t.message}</div>
            <button
              onClick={() => onRemove(t.id)}
              className="ml-3 text-sm opacity-80 hover:opacity-100"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
