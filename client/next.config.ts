import type { NextConfig } from "next";
import path from "path";

const ocrRuntimeFiles = [
  "./eng.traineddata",
  "./node_modules/tesseract.js/src/worker-script/index.js",
  "./node_modules/tesseract.js/src/worker-script/constants/**/*",
  "./node_modules/tesseract.js/src/worker-script/node/**/*",
  "./node_modules/tesseract.js/src/worker-script/utils/**/*",
  "./node_modules/tesseract.js-core/**/*",
];

const nextConfig: NextConfig = {
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
