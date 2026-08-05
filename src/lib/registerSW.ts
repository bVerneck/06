const SW_URL = "./sw.js";

function isBlockedContext(): boolean {
  if (!import.meta.env.PROD) return true;
  if (typeof window === "undefined") return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const h = window.location.hostname;
  if (h.startsWith("id-preview--") || h.startsWith("preview--")) return true;
  if (h === "lovableproject.com" || h.endsWith(".lovableproject.com")) return true;
  if (h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com")) return true;
  if (h === "beta.lovable.dev" || h.endsWith(".beta.lovable.dev")) return true;
  if (new URLSearchParams(window.location.search).has("sw")) {
    if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  }
  return false;
}

async function unregisterAppSW() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    regs
      .filter((r) => (r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "").endsWith(SW_URL))
      .map((r) => r.unregister()),
  );
}

export function registerAppServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (isBlockedContext()) {
    void unregisterAppSW();
    return;
  }
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(SW_URL).catch(() => {});
  });
}
