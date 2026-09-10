"use client";
import { useApp } from "@/store/useApp";
import { DEVICE_KEY, OPEN_DAY_KEY } from "./keys";
import type { TrackBatch, TrackEvent } from "./schema";

/**
 * Client side of usage analytics.
 *
 * Events queue in memory and leave in small batches: a couple of seconds after
 * the last one, or immediately when the page is hidden, via `sendBeacon` so a
 * closing tab still delivers. Before the first send the client asks the server
 * whether analytics is configured at all; a deployment without a sink never
 * gets a single POST.
 *
 * The device id is a random UUID per browser origin, created on first use and
 * removed with the rest of the learner's data. The learner's own switch in
 * Settings (`settings.telemetry`) is read at send time, so turning it off stops
 * even what is already queued.
 */
const MAX_BATCH = 20;
const DEBOUNCE_MS = 2500;

let queue: TrackEvent[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;
let available: boolean | null = null;
let probing: Promise<boolean> | undefined;
let listening = false;

const enabled = () => useApp.getState().settings.telemetry !== false;

function deviceId(): string | null {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

async function probe(): Promise<boolean> {
  if (available !== null) return available;
  if (!probing) {
    probing = fetch("/api/track", { cache: "no-store" })
      .then((r) => r.json() as Promise<{ available?: boolean }>)
      .then((h) => (available = !!h.available))
      .catch(() => (available = false));
  }
  return probing;
}

function listen() {
  if (listening || typeof document === "undefined") return;
  listening = true;
  const onHide = () => { if (document.visibilityState === "hidden") void flushTracking(); };
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", () => void flushTracking());
}

/** Queue one event. Cheap to call; the network happens later. */
export function track(event: TrackEvent) {
  if (typeof window === "undefined" || !enabled()) return;
  queue.push(event);
  listen();
  if (queue.length >= MAX_BATCH) void flushTracking();
  else {
    clearTimeout(timer);
    timer = setTimeout(() => void flushTracking(), DEBOUNCE_MS);
  }
}

/** Send whatever is queued. Safe to call any time. */
export async function flushTracking() {
  clearTimeout(timer);
  if (!queue.length) return;
  if (!enabled()) { queue = []; return; }
  if (!(await probe())) { queue = []; return; }
  const device = deviceId();
  if (!device) { queue = []; return; }
  const lang = useApp.getState().profile?.lang ?? "zh";
  while (queue.length) {
    const events = queue.splice(0, MAX_BATCH);
    const batch: TrackBatch = { id: crypto.randomUUID(), device, lang, events };
    const body = JSON.stringify(batch);
    let sent = false;
    try {
      // Same-origin, so no preflight; survives the page going away.
      sent = navigator.sendBeacon?.("/api/track", new Blob([body], { type: "application/json" })) ?? false;
    } catch {}
    if (!sent) fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  }
}

/** One `app_open` per device per local day, so the table is device-days and retention is a count. */
export function trackOpen() {
  if (typeof window === "undefined" || !enabled()) return;
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  try {
    if (localStorage.getItem(OPEN_DAY_KEY) === today) return;
    localStorage.setItem(OPEN_DAY_KEY, today);
  } catch {
    return;
  }
  track({ name: "app_open", ts: Date.now() });
}
