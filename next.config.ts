import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // temporarily ignore ESLint errors during builds
  },
};

export default nextConfig;
