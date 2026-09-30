import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a production build/start run side by side with `next dev` (e.g. for the e2e smoke test).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: {
    serverActions: { bodySizeLimit: "12mb" },
  },
};

export default nextConfig;
