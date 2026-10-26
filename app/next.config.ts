import type { NextConfig } from "next";
import socialScienceMedia from "./src/data/social-science-media.json";

const nextConfig: NextConfig = {
  // Self-hosted deploys ship `.next/standalone`: a minimal server plus only the
  // node_modules it actually imports, instead of the whole dependency tree.
  //
  // Not on Vercel though — its builder expects the `.nft.json` trace files that
  // standalone mode does not emit, and the build dies on a missing
  // `next-server.js.nft.json`. Vercel does its own tracing anyway.
  output: process.env.VERCEL ? undefined : "standalone",
  devIndicators: false,
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    // Only content-addressed MP4/WebP files are immutable. Captions retain
    // normal revalidation so corrections are not trapped in a long-lived cache.
    return Object.values(socialScienceMedia).flatMap(media =>
      [media.src, media.poster, media.cover].map(source => ({
        source,
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      })),
    );
  },
};

export default nextConfig;
