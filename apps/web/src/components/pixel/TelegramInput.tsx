"use client";
import { useState, useCallback } from "react";
import { useDebouncedCallback } from "use-debounce";
import axios from "axios";

interface Props {
  value: string;
  onChange: (v: string) => void;
  accentColor?: string;
}

type Status = "idle" | "loading" | "verified" | "unverified";

export function TelegramInput({ value, onChange, accentColor = "#14f195" }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [hint, setHint]     = useState<string>("");

  const verify = useDebouncedCallback(async (handle: string) => {
    const clean = handle.replace(/^@/, "").trim();
    if (clean.length < 3) { setStatus("idle"); setHint(""); return; }

    setStatus("loading");
    try {
      const { data } = await axios.post("/api/telegram/verify-handle", { handle: clean });
      if (data.verified) {
        setStatus("verified");
        setHint("✅ Verified — you'll receive quota notifications");
      } else {
        setStatus("unverified");
        setHint("");
      }
    } catch {
      setStatus("idle");
      setHint("");
    }
  }, 800);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
      setStatus("idle");
      setHint("");
      verify(e.target.value);
    },
    [onChange, verify]
  );

  const borderColor =
    status === "verified"   ? accentColor :
    status === "unverified" ? "#f87171" :
    "rgba(255,255,255,0.1)";

  const icon =
    status === "loading"    ? "⏳" :
    status === "verified"   ? "✅" :
    status === "unverified" ? "❌" : null;

  const labelStyle: React.CSSProperties = {
    fontSize: "0.68rem", color: "rgba(255,255,255,0.35)",
    fontFamily: "monospace", letterSpacing: "0.1em",
    textTransform: "uppercase", marginBottom: "0.4rem", display: "block",
  };

  const inputStyle: React.CSSProperties = {
    flex: 1, background: "rgba(255,255,255,0.05)",
    border: "none", outline: "none",
    color: "white", fontSize: "0.85rem", fontFamily: "monospace",
    padding: "0.6rem 0.85rem",
  };

  return (
    <div>
      <label style={labelStyle}>
        Telegram <span style={{ color: "rgba(255,255,255,0.2)" }}>(optional — quota alerts)</span>
      </label>

      {/* Input row with icon */}
      <div style={{
        display: "flex", alignItems: "center",
        border: `1px solid ${borderColor}`,
        borderRadius: "0.5rem", overflow: "hidden",
        transition: "border-color 0.2s",
        background: "rgba(255,255,255,0.05)",
      }}>
        <span style={{ padding: "0 0 0 0.85rem", color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>@</span>
        <input
          type="text"
          placeholder="yourusername"
          value={value.replace(/^@/, "")}
          onChange={handleChange}
          autoComplete="off"
          spellCheck={false}
          style={inputStyle}
        />
        {icon && (
          <span style={{ padding: "0 0.75rem", fontSize: "0.85rem" }}>{icon}</span>
        )}
      </div>

      {/* Hint / link */}
      {status === "verified" && hint && (
        <p style={{ color: accentColor, fontSize: "0.68rem", fontFamily: "monospace", margin: "0.35rem 0 0", opacity: 0.8 }}>
          {hint}
        </p>
      )}
      {status === "unverified" && (
        <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.68rem", fontFamily: "monospace", margin: "0.35rem 0 0" }}>
          Not verified yet —{" "}
          <a
            href="https://t.me/OneBillionPixelBot?start=verify"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: `${accentColor}99`, textDecoration: "none" }}
          >
            send /start to @OneBillionPixelBot →
          </a>
        </p>
      )}
      {status === "idle" && (
        <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.68rem", fontFamily: "monospace", margin: "0.35rem 0 0" }}>
          Start a chat with{" "}
          <a
            href="https://t.me/OneBillionPixelBot"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: `${accentColor}99`, textDecoration: "none" }}
          >
            @OneBillionPixelBot
          </a>{" "}
          first, then enter your handle.
        </p>
      )}
    </div>
  );
}