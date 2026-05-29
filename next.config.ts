import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // Disable parallel workers to stabilize static page collection in resource-constrained environments
    workerThreads: false,
    cpus: 1,
  },
};

export default nextConfig;
