import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Asala Hub",
    short_name: "Asala Hub",
    description: "Offline-first e-learning platform providing continuous access to education resources anytime, anywhere.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0c10",
    theme_color: "#6366f1",
    orientation: "any",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
