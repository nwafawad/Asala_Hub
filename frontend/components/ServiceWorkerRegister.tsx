"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // In production or if testing offline features manually, register the worker
      // We check a localStorage flag or allow registration in production only.
      const isProd = process.env.NODE_ENV === "production";
      const forceSW = localStorage.getItem("force-service-worker") === "true";

      if (isProd || forceSW) {
        const register = () => {
          navigator.serviceWorker
            .register("/sw.js")
            .then((registration) => {
              console.log("Service Worker registered with scope:", registration.scope);
            })
            .catch((error) => {
              console.error("Service Worker registration failed:", error);
            });
        };

        if (document.readyState === "complete") {
          register();
        } else {
          window.addEventListener("load", register);
          return () => window.removeEventListener("load", register);
        }
      }
    }
  }, []);

  return null;
}
