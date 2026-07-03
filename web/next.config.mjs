import path from "node:path";

const repoRoot = path.join(import.meta.dirname, "..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The app lives in web/, but reads Part 1 data from ../data. Point Turbopack's
  // workspace root at the repo root so those imports resolve (and are traced for Vercel).
  turbopack: {
    root: repoRoot,
  },
  outputFileTracingRoot: repoRoot,
};

export default nextConfig;
