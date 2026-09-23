"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { uploadProfileImage } from "@/lib/profile/upload-image";

export function AvatarUpload({ userId, currentAvatarUrl }: { userId: string; currentAvatarUrl: string | null }) {
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
    const message = await uploadProfileImage("avatar", userId, file);
    setUploading(false);
    if (message) setError(message);
    else router.refresh();
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative h-28 w-28 rounded-full disabled:opacity-60"
        aria-label="Cambiar tu foto de perfil"
      >
        <span
          className="relative block h-full w-full overflow-hidden rounded-full border-4 shadow-lg"
          style={{ borderColor: "var(--color-bg)", background: "var(--color-surface)" }}
        >
          {currentAvatarUrl ? (
            <Image src={currentAvatarUrl} alt="Tu foto de perfil" fill sizes="112px" className="object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-4xl">🙂</span>
          )}
        </span>
        <span
          className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 text-white shadow"
          style={{ backgroundImage: "var(--color-gradient)", borderColor: "var(--color-bg)" }}
        >
          <Camera size={15} />
        </span>
      </button>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      {uploading ? (
        <p className="text-xs" style={{ color: "var(--color-muted)" }}>
          Subiendo…
        </p>
      ) : null}
      {error ? (
        <p className="text-xs" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
