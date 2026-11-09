/** Standard fullscreen with the WebKit prefix (older iPadOS Safari). iPhone Safari has neither for elements. */
type WebkitElement = Element & { webkitRequestFullscreen?: () => Promise<void> | void };
type WebkitDocument = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> | void };

export const fullscreenSupported = (element: Element | null | undefined = typeof document === 'undefined' ? undefined : document.documentElement) =>
  !!element && (typeof element.requestFullscreen === 'function' || typeof (element as WebkitElement).webkitRequestFullscreen === 'function');

export const fullscreenElement = (doc: Document = document) => doc.fullscreenElement ?? (doc as WebkitDocument).webkitFullscreenElement ?? null;

export async function enterFullscreen(element: Element) {
  if (typeof element.requestFullscreen === 'function') return element.requestFullscreen();
  return (element as WebkitElement).webkitRequestFullscreen?.();
}

export async function exitFullscreen(doc: Document = document) {
  if (!fullscreenElement(doc)) return;
  if (typeof doc.exitFullscreen === 'function' && doc.fullscreenElement) return doc.exitFullscreen();
  return (doc as WebkitDocument).webkitExitFullscreen?.();
}

/** Both event names: a prefixed engine only fires the prefixed one. */
export function onFullscreenChange(listener: () => void, doc: Document = document) {
  doc.addEventListener('fullscreenchange', listener);
  doc.addEventListener('webkitfullscreenchange', listener);
  return () => { doc.removeEventListener('fullscreenchange', listener); doc.removeEventListener('webkitfullscreenchange', listener); };
}
