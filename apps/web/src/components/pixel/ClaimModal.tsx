"use client";

import { useState, useRef, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { api } from "@/lib/api";
import { CanvasRegion } from "@1bp/shared";
import { useWalletStore } from "@/store/walletStore";
import bs58 from "bs58";


interface ClaimModalProps {
  region: CanvasRegion;
  availableQuota: number;
  onClose: () => void;
  onImageSelected?: (dataUrl: string | null) => void;
}

export function ClaimModal({ region, availableQuota, onClose, onImageSelected }: ClaimModalProps) {
  const wallet = useWallet();
  const [link,         setLink]         = useState("");
  const [imageFile,    setImageFile]    = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragOver,     setDragOver]     = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [step,         setStep]         = useState<"form" | "confirm" | "done">("form");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { refreshWalletData } = useWalletStore();
  const pixelCount = region.width * region.height;
  const overQuota  = pixelCount > availableQuota;
  const cantProceed = overQuota || !imageFile;

  const applyFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Only Image files can be uploaded (JPG, PNG, GIF, WebP).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Maximum file size: 10 MB.");
      return;
    }
    setError(null);
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setImagePreview(result);
      onImageSelected?.(result);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) applyFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) applyFile(file);
  }, []);

  const removeImage = (ev: React.MouseEvent) => {
    ev.stopPropagation();
    setImageFile(null);
    setImagePreview(null);
    onImageSelected?.(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClaim = async () => {
    setLoading(true);
    setError(null);
    try {
      // Wallet address — wallet adapter-ből, nem window.solana-ból
      const address = wallet.publicKey?.toBase58();
      if (!address) throw new Error("Wallet nincs csatlakoztatva");

      const formData = new FormData();
      formData.append("x",      String(region.x));
      formData.append("y",      String(region.y));
      formData.append("width",  String(region.width));
      formData.append("height", String(region.height));
      if (link.trim()) formData.append("link", link.trim());
      if (imageFile)   formData.append("image", imageFile);

      // skipSignature — aláírás nélkül próbálunk, backend dönti el
      // Ha a wallet skipSignature=true, a middleware engedi át signature nélkül
      let headers: Record<string, string> = {
        "walletaddress": address,
      };

      // Ha a wallet adapter tud aláírni, az aláírást is melleküldjük
      // (ha skipSignature=true, a backend figyelmen kívül hagyja)
      if (wallet.signMessage) {
        try {
          const claimMessage   = `claim:${address}:${Date.now()}`;
          const encodedMessage = new TextEncoder().encode(claimMessage);
          const sigBytes       = await wallet.signMessage(encodedMessage);
          const signature      = bs58.encode(sigBytes);
          headers["signature"]        = signature;
          headers["x-claim-message"]  = claimMessage;
        } catch {
          // Felhasználó elutasította az aláírást — skipSignature esetén tovább mehet
        }
      }

      // Közvetlen backend hívás (nem Next.js proxyn át)
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
      const res = await fetch(`${apiBase}/canvas/claim`, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      await refreshWalletData(address);

      setStep("done");
    } catch (err: any) {
      setError(err?.message ?? "Hiba történt a claim során.");
    } finally {
      setLoading(false);
    }
  };


  // ── Common styles ───────────────────────────────────────────────────────
  const overlay: React.CSSProperties = {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.8)",
    backdropFilter: "blur(8px)",
    zIndex: 1000,
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "1rem",
  };
  const modal: React.CSSProperties = {
    background: "#0d1210",
    border: "1px solid rgba(20,241,149,0.18)",
    borderRadius: "1.25rem",
    padding: "1.75rem",
    width: "100%", maxWidth: 500,
    boxShadow: "0 0 80px rgba(20,241,149,0.07)",
    display: "flex", flexDirection: "column", gap: "1.25rem",
    maxHeight: "90vh", overflowY: "auto",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: "0.68rem", color: "rgba(255,255,255,0.35)",
    fontFamily: "monospace", letterSpacing: "0.1em",
    textTransform: "uppercase", marginBottom: "0.4rem", display: "block",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "0.5rem", padding: "0.6rem 0.85rem",
    color: "white", fontSize: "0.85rem", fontFamily: "monospace",
    outline: "none", boxSizing: "border-box",
  };
  const btnPrimary = (disabled: boolean): React.CSSProperties => ({
    padding: "0.75rem 1.5rem", borderRadius: "0.6rem", border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 700, fontSize: "0.9rem",
    background: disabled
      ? "rgba(255,255,255,0.08)"
      : "linear-gradient(135deg,#14f195,#9945ff)",
    color: disabled ? "rgba(255,255,255,0.3)" : "#000",
    transition: "all 0.2s", flex: 1,
  });
  const btnSecondary: React.CSSProperties = {
    padding: "0.75rem 1.25rem", borderRadius: "0.6rem",
    border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer",
    fontWeight: 600, fontSize: "0.9rem",
    background: "transparent", color: "rgba(255,255,255,0.45)",
    transition: "all 0.2s",
  };
// ── Render help ─────────────────────────────────────────────────
const renderHeader = (title: string, sub?: string) => (
  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
    <div>
      <h2 style={{ color: "white", margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>{title}</h2>
      {sub && (
        <p style={{ color: "rgba(20,241,149,0.7)", fontSize: "0.72rem", fontFamily: "monospace", margin: "0.25rem 0 0" }}>
          {sub}
        </p>
      )}
    </div>
    <button
      onClick={onClose}
      style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: "1.3rem", cursor: "pointer", lineHeight: 1, padding: 0 }}
    >
      ✕
    </button>
  </div>
);

const renderError = () => error ? (
  <div style={{ color: "#f87171", fontSize: "0.8rem", background: "rgba(239,68,68,0.1)", borderRadius: "0.5rem", padding: "0.5rem 0.75rem" }}>
    {error}
  </div>
) : null;
  const Header = ({ title, sub }: { title: string; sub?: string }) => (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
      <div>
        <h2 style={{ color: "white", margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>{title}</h2>
        {sub && (
          <p style={{ color: "rgba(20,241,149,0.7)", fontSize: "0.72rem", fontFamily: "monospace", margin: "0.25rem 0 0" }}>
            {sub}
          </p>
        )}
      </div>
      <button
        onClick={onClose}
        style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: "1.3rem", cursor: "pointer", lineHeight: 1, padding: 0 }}
      >
        ✕
      </button>
    </div>
  );

  const ErrorBox = () => error ? (
    <div style={{ color: "#f87171", fontSize: "0.8rem", background: "rgba(239,68,68,0.1)", borderRadius: "0.5rem", padding: "0.5rem 0.75rem" }}>
      {error}
    </div>
  ) : null;

  // ── DONE ─────────────────────────────────────────────────────────────────
  if (step === "done") return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
          <div style={{ fontSize: "3.5rem", marginBottom: "0.75rem" }}>🎉</div>
          <h2 style={{ color: "#14f195", margin: 0, fontSize: "1.4rem" }}>Claimed Successfull!</h2>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.82rem", marginTop: "0.6rem", fontFamily: "monospace", lineHeight: 1.7 }}>
            {pixelCount.toLocaleString()} pixels reserved<br />
            ({region.x}, {region.y}) · {region.width} × {region.height} px
          </p>
          <button
            onClick={onClose}
            style={{ ...btnPrimary(false), marginTop: "1.75rem", width: "100%", flex: "unset" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  // ── CONFIRM ───────────────────────────────────────────────────────────────
 if (step === "confirm") return (
  <div style={overlay} onClick={onClose}>
    <div style={modal} onClick={e => e.stopPropagation()}>

      {renderHeader(
        "Confirmation",
        `${pixelCount.toLocaleString()} pixel · (${region.x}, ${region.y}) · ${region.width}×${region.height}px`
      )}

      {/* Image preview */}
      <div style={{
        borderRadius: "0.75rem", overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "#111",
        maxHeight: 180,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {imagePreview
          ? <img src={imagePreview} alt="preview" style={{ width: "100%", maxHeight: 180, objectFit: "contain", display: "block" }} />
          : <div style={{ padding: "2rem", color: "rgba(255,255,255,0.18)", fontSize: "0.8rem", fontFamily: "monospace" }}>
              Nincs kép megadva
            </div>
        }
      </div>

      {/* Summary */}
      <div style={{
        display: "flex", flexDirection: "column", gap: "0.45rem",
        fontSize: "0.8rem", fontFamily: "monospace",
        background: "rgba(255,255,255,0.03)",
        borderRadius: "0.6rem", padding: "0.85rem 1rem",
      }}>
        {([
          ["Position",  `X: ${region.x}  Y: ${region.y}`],
          ["Size",    `${region.width} × ${region.height} px`],
          ["Pixels",  `${pixelCount.toLocaleString()} / ${availableQuota.toLocaleString()} avaiable`],
          ["Link",     link.trim() || "—"],
          ["Image",      imageFile ? `${imageFile.name} (${(imageFile.size / 1024).toFixed(0)} KB)` : "—"],
        ] as [string, string][]).map(([k, v]) => (
          <div key={k} style={{ display: "flex", gap: "0.75rem" }}>
            <span style={{ color: "rgba(20,241,149,0.55)", minWidth: 68 }}>{k}</span>
            <span style={{ color: "rgba(255,255,255,0.65)", wordBreak: "break-all" }}>{v}</span>
          </div>
        ))}
      </div>

      {renderError()}

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button onClick={() => setStep("form")} style={btnSecondary} disabled={loading}>
          ← Back
        </button>
        <button onClick={handleClaim} disabled={loading} style={btnPrimary(loading)}>
          {loading ? "⏳ Uploading..." : `✓ Confirmed — ${pixelCount.toLocaleString()} px`}
        </button>
      </div>

    </div>
  </div>
);


  // ── FORM ──────────────────────────────────────────────────────────────────
  return (
  <div style={overlay} onClick={onClose}>
    <div style={modal} onClick={e => e.stopPropagation()}>

      {/* Header */}
      {renderHeader(
        "Claim Your Pixels",
        `${region.width} × ${region.height} px · (${region.x}, ${region.y}) · ${pixelCount.toLocaleString()} pixel`
      )}

      {/* Image upload drag&drop */}
      <div>
        <label style={labelStyle}>
          Image Upload <span style={{ color: "rgba(255,255,255,0.2)" }}></span>
        </label>
        <div
          style={{
            border: `2px dashed ${dragOver ? "#14f195" : "rgba(255,255,255,0.1)"}`,
            borderRadius: "0.75rem",
            padding: imagePreview ? "0.75rem" : "1.5rem 1rem",
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.2s",
            background: dragOver ? "rgba(20,241,149,0.04)" : "rgba(255,255,255,0.02)",
            position: "relative",
          }}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
        >
          {imagePreview ? (
            <div style={{ position: "relative", display: "inline-block" }}>
              <img
                src={imagePreview}
                alt="preview"
                style={{ maxHeight: 140, maxWidth: "100%", borderRadius: "0.5rem", objectFit: "contain", display: "block" }}
              />
              <button
                onClick={removeImage}
                style={{
                  position: "absolute", top: -8, right: -8,
                  background: "#ef4444", border: "none", borderRadius: "50%",
                  width: 22, height: 22, color: "white", cursor: "pointer",
                  fontSize: "0.7rem", display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                ✕
              </button>
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.68rem", margin: "0.5rem 0 0", fontFamily: "monospace" }}>
                {imageFile?.name} · Click here for replace
              </p>
            </div>
          ) : (
            <>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🖼️</div>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.82rem", margin: "0 0 0.25rem" }}>
                Drag & Drop, or click to select an image
              </p>
              <p style={{ color: "rgba(255,255,255,0.2)", fontSize: "0.7rem", margin: 0 }}>
                JPG, PNG, GIF, WebP · max 10 MB
              </p>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </div>

      {/* Link */}
      <div>
        <label style={labelStyle}>
          Link <span style={{ color: "rgba(255,255,255,0.2)" }}>(optional)</span>
        </label>
        <input
          type="url"
          placeholder="https://yourwebsite.com"
          value={link}
          onChange={e => setLink(e.target.value)}
          style={inputStyle}
        />
      </div>

      {renderError()}

      {overQuota && (
        <div style={{ color: "#f87171", fontSize: "0.78rem", textAlign: "center", background: "rgba(239,68,68,0.08)", borderRadius: "0.5rem", padding: "0.5rem" }}>
          Not enough quote — {pixelCount.toLocaleString()} need, {availableQuota.toLocaleString()} available
        </div>
      )}
      <button
      onClick={() => setStep("confirm")}
      disabled={cantProceed}
      style={{ ...btnPrimary(cantProceed), flex: "unset" }}
    >
      Confirm
    </button>
    </div>
  </div>
);
}
