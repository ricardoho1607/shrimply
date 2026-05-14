import type { NextConfig } from "next";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const configDir = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: 'export',
  turbopack: {
    root: resolve(configDir, '..'),
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
