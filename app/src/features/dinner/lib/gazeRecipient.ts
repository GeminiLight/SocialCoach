export type AimFace = { id: string; x: number; y: number; visible: boolean };
/** Coordinates are relative to the actual optical centre, including HUD framing. */
export function aimedPerson(faces: AimFace[]): string | undefined {
  const candidates = faces.filter(face => face.visible && Math.abs(face.x) < .16 && Math.abs(face.y) < .20)
    .map(face => ({ ...face, distance: (face.x / .16) ** 2 + (face.y / .20) ** 2 })).sort((a, b) => a.distance - b.distance);
  if (!candidates.length || (candidates[1] && candidates[1].distance - candidates[0].distance < .18)) return;
  return candidates[0].id;
}
export class GazeRecipient {
  private candidate?: string;
  private elapsed = 0;
  private selected?: string;
  reset() { this.candidate = undefined; this.elapsed = 0; }
  blocked() { this.selected = undefined; this.reset(); }
  step(candidate: string | undefined, dt: number, stable: boolean): string | undefined {
    if (!stable || !candidate) { this.reset(); return; }
    if (candidate !== this.candidate) { this.candidate = candidate; this.elapsed = 0; }
    this.elapsed += Math.max(0, Math.min(.05, dt));
    if (this.elapsed < .7 || candidate === this.selected) return;
    this.selected = candidate; return candidate;
  }
}
