import type { NextConfig } from "next";
import path from "path";

const ocrRuntimeFiles = [
  "./lib/receipt-image-worker.cjs",
  "./node_modules/heic-convert/**/*",
  "./node_modules/heic-decode/**/*",
  "./node_modules/libheif-js/**/*",
  "./node_modules/jpeg-js/**/*",
  "./node_modules/pngjs/**/*",
  "./eng.traineddata",
  // worker_threads entry points are invisible to Turbopack's dependency graph.
  // Include sibling constants/utils too, plus packages required only by the worker.
  "./node_modules/tesseract.js/src/**/*",
  "./node_modules/tesseract.js-core/**/*",
  "./node_modules/wasm-feature-detect/**/*",
  "./node_modules/bmp-js/**/*",
  "./node_modules/is-url/**/*",
  "./node_modules/regenerator-runtime/**/*",
];

const nextConfig: NextConfig = {
  // Keep local previews free of the Next.js badge; errors still surface normally.
  devIndicators: false,
  // Ensure Turbopack treats the repo root (which contains node_modules/next)
  // as the filesystem root, even though the app lives in client/.
  turbopack: {
    root: path.join(__dirname, ".."),
  },
  // Keep the Node worker package on disk so worker_threads can load its script.
  serverExternalPackages: ["tesseract.js"],
  outputFileTracingIncludes: {
    "/api/receipts": ocrRuntimeFiles,
  },
  // Next matches tracing keys as substrings, so remove OCR assets from child APIs.
  outputFileTracingExcludes: {
    "/api/receipts/*": ocrRuntimeFiles,
  },
};

export default nextConfig;
