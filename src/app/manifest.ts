import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Ofissio",
    short_name: "Ofissio",
    lang: "id",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#091629",
    theme_color: "#091629",
    icons: [
      { src: "/brand/app-icon-192-v1.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/app-icon-512-v1.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/app-icon-maskable-512-v1.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
