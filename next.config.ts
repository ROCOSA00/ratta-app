import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "evmyyhjtycxdybdbmyjp.supabase.co",
        pathname: "/storage/v1/object/public/avatars/**",
      },
    ],
  },
  // El service worker no debe quedarse en caché: si no, un cambio en él
  // tardaría días en llegar a los móviles.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
  // "Más" pasó a llamarse "Perfil": los enlaces antiguos (o una app ya
  // instalada que recuerde la ruta vieja) siguen funcionando.
  async redirects() {
    return [
      { source: "/mas", destination: "/perfil", permanent: true },
      { source: "/mas/:path*", destination: "/perfil/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
