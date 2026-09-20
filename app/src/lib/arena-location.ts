const key = "socialcoach.arena.location";

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
