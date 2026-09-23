"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { uploadProfileImage } from "@/lib/profile/upload-image";

export function CoverUpload({ userId }: { userId: string }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    const message = await uploadProfileImage("cover", userId, file);
    setUploading(false);
    if (message) setError(message);
    else router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md disabled:opacity-60"
        style={{ background: "rgba(0, 0, 0, 0.35)" }}
      >
        <ImagePlus size={14} />
        {uploading ? "Subiendo…" : "Cambiar portada"}
      </button>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      {error ? (
        <p className="rounded-full px-2 py-0.5 text-[11px] text-white" style={{ background: "rgba(0,0,0,0.5)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
