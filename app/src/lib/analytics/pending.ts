import type {TrackEvent} from './schema';

/** Separate from the transport so archive reset can invalidate queued work
 * without importing the store back through the analytics client. */
export const pendingTracking: {events: TrackEvent[]; generation: number} = {events: [], generation: 0};
export function clearPendingTracking() {
  pendingTracking.events = [];
  pendingTracking.generation++;
}
