import type { NextConfig } from "next";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const configDir = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: 'export',
  outputFileTracingRoot: resolve(configDir, '..'),
  allowedDevOrigins: ['127.0.0.1'],
  turbopack: {
    root: resolve(configDir, '..'),
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
