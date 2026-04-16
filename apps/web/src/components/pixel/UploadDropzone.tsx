"use client";
import { useCallback, useState } from "react";
import { useDropzone }    from "react-dropzone";
import { useWallet }      from "@solana/wallet-adapter-react";
import { signAuthMessage } from "@/lib/signMessage";
import axios              from "axios";

interface Props { areaId: string; onSuccess: () => void; }

export function UploadDropzone({ areaId, onSuccess }: Props) {
  const wallet    = useWallet();
  const [preview, setPreview]   = useState<string | null>(null);
  const [file,    setFile]      = useState<File | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState<string | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept:   { "image/jpeg": [], "image/png": [], "image/gif": [] },
    maxSize:  10 * 1024 * 1024,
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (!file || !wallet.publicKey) return;
    setLoading(true); setError(null);
    try {
      const { message, signature } = await signAuthMessage(wallet);
      const form = new FormData();
      form.append("file",          file);
      form.append("walletAddress", wallet.publicKey.toBase58());
      form.append("message",       message);
      form.append("signature",     signature);

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/upload/${areaId}`,
        form, { headers: { "Content-Type": "multipart/form-data" } }
      );
      onSuccess();
    } catch (e: any) {
      setError(e?.response?.data?.error ?? "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition
          ${isDragActive ? "border-brand bg-brand/10" : "border-white/20 hover:border-brand/50"}`}
      >
        <input {...getInputProps()} />
        {preview
          ? <img src={preview} alt="preview" className="max-h-48 mx-auto rounded-lg object-contain" />
          : <div>
              <div className="text-4xl mb-3">🖼️</div>
              <p className="text-gray-400 text-sm">
                Drop your JPG, PNG, or GIF here<br />
                <span className="text-xs text-gray-600">Max 10MB</span>
              </p>
            </div>
        }
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        onClick={handleUpload}
        disabled={!file || loading}
        className="w-full py-3 bg-brand hover:bg-brand-dark disabled:opacity-40 rounded-lg font-bold transition"
      >
        {loading ? "Uploading…" : "Upload & Go Live 🚀"}
      </button>
    </div>
  );
}
