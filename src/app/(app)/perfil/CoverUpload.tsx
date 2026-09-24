"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { PROFILE_IMAGE, uploadProfileImage } from "@/lib/profile/upload-image";
import { ImageCropper } from "@/components/shared/ImageCropper";

export function CoverUpload({ userId }: { userId: string }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Al elegir una foto no se sube aún: primero se abre el editor para encuadrarla.
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) {
      setError(null);
      setPicked(file);
    }
  }

  async function upload(blob: Blob) {
    setPicked(null);
    setUploading(true);
    const message = await uploadProfileImage("cover", userId, blob);
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
      {picked ? (
        <ImageCropper
          file={picked}
          shape="rect"
          title="Encuadra tu portada"
          {...PROFILE_IMAGE.cover}
          onCancel={() => setPicked(null)}
          onConfirm={upload}
        />
      ) : null}
      {error ? (
        <p className="rounded-full px-2 py-0.5 text-[11px] text-white" style={{ background: "rgba(0,0,0,0.5)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
