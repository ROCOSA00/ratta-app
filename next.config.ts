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
