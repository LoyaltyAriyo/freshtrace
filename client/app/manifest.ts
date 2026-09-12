import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FreshTrace",
    short_name: "FreshTrace",
    description: "Food tracking and waste reduction application",
    start_url: "/",
    display: "standalone",
    background_color: "#F8F9F8",
    theme_color: "#005F35",
    icons: [
      { src: "/brand/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  }
}
