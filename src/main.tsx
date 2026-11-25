import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from 'virtual:pwa-register';

// Tag iOS standalone Home Screen PWAs before first paint to clear the OS top-edge blur zone
if (typeof window !== "undefined") {
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isStandalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia?.("(display-mode: standalone)").matches;
  if (isIOS && isStandalone) {
    document.documentElement.dataset.iosPwa = "true";
  }
}

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    registerSW({ immediate: true });
  } else {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (const registration of registrations) {
        registration.unregister();
      }
    });
  }
}

// Recover automatically from Vite preload errors (stale chunks or transient network blips)
if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (event) => {
    try {
      const key = "asr_chunk_reload_ts";
      const last = Number(sessionStorage.getItem(key) || "0");
      const now = Date.now();
      if (!last || now - last > 15000) {
        event.preventDefault();
        sessionStorage.setItem(key, String(now));
        window.location.reload();
      }
    } catch {
      // ignore storage errors
    }
  });
}

// Global incredibly subtle haptic feedback for all tactile elements
if (typeof window !== "undefined") {
  window.addEventListener('touchstart', (e) => {
    const target = e.target as HTMLElement;
    const closestClickable = target.closest('button, a, [role="button"], [class*="active:scale-"]');
    if (closestClickable) {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(2); // 2ms is barely noticeable, providing that microscopic tactile feel
      }
    }
  }, { passive: true });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
