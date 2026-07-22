"use client";

import { useEffect } from "react";

export function registerBackgroundSync(tag = "asala-background-sync") {
  if (typeof window !== "undefined" && "serviceWorker" in navigator && "SyncManager" in window) {
    navigator.serviceWorker.ready
      .then((registration: any) => {
        if (registration.sync) {
          return registration.sync.register(tag);
        }
      })
      .catch((err) => {
        console.warn("[Background Sync] Registration failed:", err);
      });
  }
}

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      const register = () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("[PWA] Service Worker registered:", registration.scope);
          })
          .catch((error) => {
            console.error("[PWA] Service Worker registration failed:", error);
          });
      };

      if (document.readyState === "complete") {
        register();
      } else {
        window.addEventListener("load", register);
        return () => window.removeEventListener("load", register);
      }
    }
  }, []);

  return null;
}
