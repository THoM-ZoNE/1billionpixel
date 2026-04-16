"use client";
import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  type?: "error" | "success" | "info";
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, type = "error", duration = 4000, onClose }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // intro animation
    const showTimer = setTimeout(() => setVisible(true), 10);
    // exit animation then unmount
    const hideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
  }, [duration, onClose]);

  const colors = {
  error: {
    border: "1px solid rgba(239, 68, 68, 0.6)",
    background: "#1a0808",
    color: "#fca5a5",
  },
  success: {
    border: "1px solid rgba(139, 92, 246, 0.6)",
    background: "#0a0814",
    color: "#c4b5fd",
  },
  info: {
    border: "1px solid rgba(100, 116, 139, 0.6)",
    background: "#0a0a0a",
    color: "#cbd5e1",
  },
};


  return (
    <div
      style={{
        position: "fixed",
        bottom: visible ? "1.5rem" : "-6rem",
        left: "50%",
        transform: "translateX(-50%)",
        transition: "bottom 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        zIndex: 9999,
        minWidth: "280px",
        maxWidth: "90vw",
      }}
    >
      <div
  style={{
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    borderRadius: "1rem",
    border: colors[type].border,
    background: colors[type].background,
    color: colors[type].color,
    padding: "0.875rem 1.25rem",
    boxShadow: "0 25px 50px rgba(0,0,0,0.8)",
    backdropFilter: "blur(12px)",
  }}
>
        {type === "error" && <span style={{ fontSize: "1.1rem" }}>⚠️</span>}
        {type === "success" && <span style={{ fontSize: "1.1rem" }}>✅</span>}
        <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{message}</span>
        <button
          onClick={() => { setVisible(false); setTimeout(onClose, 300); }}
          style={{ marginLeft: "auto", opacity: 0.5, fontSize: "1rem", cursor: "pointer" }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
