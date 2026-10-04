import { useEffect, useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';
import type { Palette } from '../lib/palette';
import { roomLightPeriod } from '../lib/lighting';

/** Distant, softly diffused exterior detail behind the existing frames/blinds.
 * Local and deterministic; no stock photograph or external texture request. */
export function RoomWindows({ p, kind, time }: { p: Palette; kind: string; time: string }) {
  const period = roomLightPeriod(time);
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
    const c = canvas.getContext('2d')!;
    const sky = c.createLinearGradient(0, 0, 0, 256);
    sky.addColorStop(0, period === 'day' ? p.window : period === 'dusk' ? p.dusk : p.night);
    sky.addColorStop(.65, period === 'day' ? p.white : period === 'dusk' ? p.window : p.steelSeam);
    sky.addColorStop(1, period === 'day' ? p.officeWall : period === 'dusk' ? p.steel : p.steelSeam);
    c.fillStyle = sky; c.fillRect(0, 0, 512, 256);
    c.filter = 'blur(6px)';
    // The skyline is beyond the glass, so it stays quiet while the faces are in focus.
    c.globalAlpha = .18; c.fillStyle = p.steel;
    for (let i = 0; i < 9; i++) {
      const height = 35 + (i * 37 % 95);
      c.fillRect(i * 65 - 12, 256 - height, 38 + (i * 17 % 28), height);
    }
    c.globalAlpha = .13; c.fillStyle = p.leaf;
    for (let i = 0; i < 24; i++) {
      c.beginPath(); c.ellipse(i * 29 - 42, 227 + Math.sin(i * 1.7) * 15, 32, 22, 0, 0, Math.PI * 2); c.fill();
    }
    c.filter = 'none'; c.globalAlpha = 1;
    const map = new CanvasTexture(canvas); map.colorSpace = SRGBColorSpace; return map;
  }, [p, period]);
  useEffect(() => () => texture.dispose(), [texture]);
  const windows: { at: [number, number, number]; size: [number, number] }[] = kind === 'family'
    ? [{ at: [0, 3, -5.055], size: [4.52, 2.96] }]
    : kind === 'school'
      ? [-3.5, 3.5].map(x => ({ at: [x, 3.4, -5.067], size: [3.54, 2.05] }))
      : kind === 'office' ? [{ at: [-2.5, 3, -5.105], size: [4.73, 3.2] }] : [];
  return <>{windows.map(({ at, size }, i) => <mesh key={i} position={at}>
    <planeGeometry args={size} /><meshBasicMaterial map={texture} />
  </mesh>)}</>;
}

/** Visible working screens, without inventing task figures or approval status. */
export function OfficeScreens({ p }: { p: Palette }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 280;
    const c = canvas.getContext('2d')!;
    c.fillStyle = p.white; c.fillRect(0, 0, 512, 280);
    c.fillStyle = p.marker; c.fillRect(0, 0, 512, 22);
    c.globalAlpha = .3; c.fillRect(0, 22, 512, 26);
    c.fillStyle = p.floorJoint; c.globalAlpha = .4;
    for (let x = 18; x < 512; x += 62) c.fillRect(x, 56, 1, 224);
    for (let y = 56; y < 280; y += 22) c.fillRect(0, y, 512, 1);
    c.globalAlpha = .18; c.fillStyle = p.marker;
    for (let i = 0; i < 10; i++) c.fillRect(28 + (i % 6) * 62, 64 + Math.floor(i / 6) * 44, 35, 7);
    const map = new CanvasTexture(canvas); map.colorSpace = SRGBColorSpace; return map;
  }, [p]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <>{[
    { at: [.35, 2.1, 1.708] as [number, number, number], turn: 0 },
    { at: [-4.05, 2.1, .542] as [number, number, number], turn: Math.PI },
  ].map(({ at, turn }, i) => <mesh key={i} position={at} rotation={[0, turn, 0]}>
    <planeGeometry args={[.94, .51]} /><meshBasicMaterial map={texture} />
  </mesh>)}</>;
}
