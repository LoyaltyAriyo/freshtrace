import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Ensure Turbopack treats the repo root (which contains node_modules/next)
  // as the filesystem root, even though the app lives in client/.
  turbopack: {
    root: path.join(__dirname, ".."),
  },
};

export default nextConfig;
