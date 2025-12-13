// src/hooks/useToast.jsx
import { useState } from "react";

export function useToast() {
  const [message, setMessage] = useState("");

  const show = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  };

  const Toast = () =>
    message ? (
      <div className="fixed right-6 bottom-6 z-50">
        <div className="bg-black/80 text-white px-4 py-2 rounded shadow">
          {message}
        </div>
      </div>
    ) : null;

  return { show, Toast };
}
