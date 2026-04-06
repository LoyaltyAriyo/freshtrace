import "@testing-library/jest-dom"
import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  test: {
    environment: "jsdom",   // ✅ FIXED
    globals: true,
    setupFiles: "./setupTests.ts",  // ✅ FIXED NAME
  },
})