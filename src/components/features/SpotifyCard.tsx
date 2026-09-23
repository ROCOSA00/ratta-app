import { ExternalLink, Music } from "lucide-react";
import { SPOTIFY_PLAYLIST_ID } from "@/lib/couple";

export function SpotifyCard() {
  const openUrl = `https://open.spotify.com/playlist/${SPOTIFY_PLAYLIST_ID}`;
  const embedUrl = `https://open.spotify.com/embed/playlist/${SPOTIFY_PLAYLIST_ID}?utm_source=generator`;

  return (
    <div
      className="mx-5 rounded-2xl border p-4"
      style={{
        background: "color-mix(in srgb, #1db954 7%, var(--color-surface))",
        borderColor: "color-mix(in srgb, #1db954 22%, var(--color-line))",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: "color-mix(in srgb, #1db954 20%, var(--color-surface))", color: "#1a9e48" }}
          >
            <Music size={15} strokeWidth={2.3} />
          </span>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#1a9e48" }}>
            Nuestra música
          </p>
        </div>
        <a
          href={openUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white"
          style={{ background: "#1db954" }}
        >
          Abrir en Spotify <ExternalLink size={12} />
        </a>
      </div>
      <iframe
        title="Nuestra playlist de Spotify"
        src={embedUrl}
        width="100%"
        height="152"
        loading="lazy"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        className="mt-3 rounded-xl border-0"
      />
    </div>
  );
}
