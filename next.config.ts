import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // 20 MiB file plus bounded multipart overhead; backend enforces file size.
    serverActions: { bodySizeLimit: 20 * 1024 * 1024 + 64 * 1024 },
  },
};

export default nextConfig;
