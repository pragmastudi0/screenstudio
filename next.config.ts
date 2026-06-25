import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "@prisma/client", "bcryptjs"],
  // El type-checking de TS sí bloquea el build (calidad). El lint de estilo no,
  // para no frenar despliegues por reglas cosméticas.
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
