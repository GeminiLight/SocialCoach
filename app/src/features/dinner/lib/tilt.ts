export type TiltStatus = 'off' | 'requesting' | 'calibrating' | 'active' | 'denied' | 'unavailable' | 'insecure';
export type TiltSample = { beta: number | null; gamma: number | null; angle: number };
export type TiltOutput = { yaw: number };
export const MAX_TILT_YAW = Math.PI / 5;
const rad = Math.PI / 180;
const wrap = (value: number) => Math.atan2(Math.sin(value), Math.cos(value));

/** Gravity in screen coordinates. Unlike raw gamma, this stays continuous when
 * the phone is upright or the browser switches portrait/landscape. No compass. */
export function screenLean({ beta, gamma, angle }: TiltSample): number | null {
  if (beta === null || gamma === null || ![beta, gamma, angle].every(Number.isFinite)) return null;
  const x = -Math.cos(beta * rad) * Math.sin(gamma * rad), y = Math.sin(beta * rad);
  const screenX = x * Math.cos(angle * rad) - y * Math.sin(angle * rad);
  const screenY = x * Math.sin(angle * rad) + y * Math.cos(angle * rad);
  // A phone lying flat has no reliable left/right gravity direction.
  if (Math.hypot(screenX, screenY) < .25) return null;
  return Math.atan2(screenX, screenY);
}

export interface TiltSource {
  secure: boolean;
  supported: boolean;
  request?: () => Promise<PermissionState>;
  listen: (read: (sample: TiltSample) => void) => () => void;
}
export function browserTiltSource(): TiltSource {
  const event = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & { requestPermission?: () => Promise<PermissionState> };
  return {
    secure: window.isSecureContext, supported: !!event,
    request: event?.requestPermission ? () => event.requestPermission!() : undefined,
    listen(read) {
      const listener = (sample: DeviceOrientationEvent) => read({ beta: sample.beta, gamma: sample.gamma, angle: screen.orientation?.angle ?? (window as Window & { orientation?: number }).orientation ?? 0 });
      window.addEventListener('deviceorientation', listener);
      return () => window.removeEventListener('deviceorientation', listener);
    },
  };
}

/** One opt-in owns one listener. Late permission results cannot resurrect it. */
export class TiltSession {
  status: TiltStatus = 'off';
  readonly output: TiltOutput = { yaw: 0 };
  private generation = 0;
  private detach?: () => void;
  private timer?: ReturnType<typeof setTimeout>;
  private baseline: number | null = null;
  private angle: number | null = null;
  private paused = false;
  constructor(private publish: (status: TiltStatus) => void, private source = browserTiltSource) {}
  get enabled() { return ['requesting', 'calibrating', 'active'].includes(this.status); }
  private update(status: TiltStatus) { if (this.status !== status) { this.status = status; this.publish(status); } }
  recenter() { this.baseline = null; this.output.yaw = 0; }
  suspend(paused: boolean) { if (this.paused !== paused) { this.paused = paused; this.recenter(); } }
  private release() { this.generation++; this.detach?.(); this.detach = undefined; clearTimeout(this.timer); this.timer = undefined; this.angle = null; this.recenter(); }
  stop() { this.release(); this.update('off'); }
  dispose() { this.release(); }
  async start() {
    if (this.enabled) return;
    const source = this.source();
    if (!source.secure) { this.update('insecure'); return; }
    if (!source.supported) { this.update('unavailable'); return; }
    const generation = ++this.generation;
    this.update('requesting');
    try {
      // Called directly from the switch click, before yielding user activation.
      if (source.request && await source.request() !== 'granted') {
        if (generation === this.generation) this.update('denied');
        return;
      }
      if (generation !== this.generation) return;
      this.update('calibrating');
      this.detach = source.listen(sample => {
        if (generation !== this.generation) return;
        const lean = screenLean(sample);
        if (lean === null) { this.recenter(); return; }
        clearTimeout(this.timer); this.timer = undefined;
        this.update('active');
        if (this.angle !== sample.angle) { this.angle = sample.angle; this.recenter(); }
        if (this.paused) { this.recenter(); return; }
        if (this.baseline === null) this.baseline = lean;
        const delta = wrap(lean - this.baseline);
        // Small hand tremors are ignored; bigger tilts are bounded head turns.
        const amount = Math.max(0, Math.abs(delta) - 1.5 * rad);
        this.output.yaw = amount ? -Math.sign(delta) * Math.min(MAX_TILT_YAW, amount * 1.25) : 0;
      });
      this.timer = setTimeout(() => { if (generation === this.generation) { this.release(); this.update('unavailable'); } }, 8000);
    } catch {
      if (generation === this.generation) { this.release(); this.update('denied'); }
    }
  }
}
