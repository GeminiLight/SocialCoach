const key = "socialcoach.arena.location";
const changed = "socialcoach:arena-location";

/** Stable browser snapshot for useSyncExternalStore; SSR supplies route params. */
export function arenaSearchSnapshot() {
  return window.location.search;
}

export function subscribeArenaLocation(listener: () => void) {
  window.addEventListener(changed, listener);
  window.addEventListener("popstate", listener);
  return () => {
    window.removeEventListener(changed, listener);
    window.removeEventListener("popstate", listener);
  };
}

/** Publish only after the URL is committed, so consecutive inputs compose. */
export function replaceArenaLocation(query: string) {
  window.history.replaceState(null, "", `/arena${query ? `?${query}` : ""}`);
  rememberArenaLocation(query);
  window.dispatchEvent(new Event(changed));
}

export function rememberArenaLocation(query: string) {
  try { sessionStorage.setItem(key, `/arena${query ? `?${query}` : ""}`); } catch {}
}

export function arenaReturnPath() {
  try {
    const path = sessionStorage.getItem(key);
    if (path === "/arena" || path?.startsWith("/arena?")) return path;
  } catch {}
  return "/arena";
}
