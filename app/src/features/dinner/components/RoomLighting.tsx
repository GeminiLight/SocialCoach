/* eslint-disable react-hooks/immutability -- The R3F scene owns mutable GPU resources; this effect installs and restores its reflection probe. */
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { BackSide, BoxGeometry, Mesh, MeshBasicMaterial, PlaneGeometry, PMREMGenerator, Scene } from 'three';
import type { Palette } from '../lib/palette';
import type { Scenario } from '../lib/content';
import { roomLightPeriod } from '../lib/lighting';

/** A small, local reflection probe: bright ceiling, broad windows and floor bounce.
 * Captured once per room, never rendered per frame or downloaded as an HDR file. */
function RoomReflections({ p, warm, period }: { p: Palette; warm: boolean; period: ReturnType<typeof roomLightPeriod> }) {
  const { gl, scene, invalidate } = useThree();
  useEffect(() => {
    const room = new Scene();
    const geometries = [new BoxGeometry(20, 12, 20), new PlaneGeometry(1, 1)];
    const materials = [
      new MeshBasicMaterial({ color: warm ? p.wall : p.officeWall, side: BackSide }),
      new MeshBasicMaterial({ color: warm ? p.light : p.white }),
      new MeshBasicMaterial({ color: period === 'evening' ? p.night : period === 'dusk' ? p.dusk : p.window }),
      new MeshBasicMaterial({ color: warm ? p.floor : p.officeFloor }),
    ];
    materials[1].color.multiplyScalar(3);
    materials[2].color.multiplyScalar(period === 'day' ? 2 : 1);
    room.add(new Mesh(geometries[0], materials[0]));
    const panel = (material: number, at: [number, number, number], size: [number, number], rotation: [number, number, number]) => {
      const mesh = new Mesh(geometries[1], materials[material]);
      mesh.position.set(...at); mesh.scale.set(...size, 1); mesh.rotation.set(...rotation); room.add(mesh);
    };
    panel(1, [0, 5.8, 0], [12, 12], [Math.PI / 2, 0, 0]);
    panel(2, [-9.8, 1, -2], [8, 6], [0, Math.PI / 2, 0]);
    panel(1, [3, 1, 9.8], [6, 5], [0, Math.PI, 0]);
    panel(3, [0, -5.8, 0], [20, 20], [-Math.PI / 2, 0, 0]);
    const generator = new PMREMGenerator(gl);
    const target = generator.fromScene(room, .08, .1, 40, { size: 128 });
    const previous = scene.environment, previousIntensity = scene.environmentIntensity;
    scene.environment = target.texture; scene.environmentIntensity = warm ? .38 : .48;
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose()); generator.dispose(); invalidate();
    return () => {
      if (scene.environment === target.texture) {
        scene.environment = previous; scene.environmentIntensity = previousIntensity;
      }
      target.dispose();
    };
  }, [gl, scene, invalidate, p, warm, period]);
  return null;
}

export function RoomLighting({ p, scenario }: { p: Palette; scenario: Scenario }) {
  const kind = scenario.space ?? scenario.id;
  const warm = kind === 'work' || kind === 'family';
  const period = roomLightPeriod(scenario.time);
  const window = ['family', 'school', 'office'].includes(kind) && period !== 'evening';
  return <>
    <RoomReflections p={p} warm={warm} period={period} />
    <ambientLight intensity={.12} color={p.white} />
    <hemisphereLight args={[p.white, warm ? p.floor : p.officeFloor, .45]} />
    <directionalLight position={window ? [-4, 5.2, -1] : [-3, 5.3, 4]} intensity={window && period === 'day' ? 1.6 : 1.3} color={window && period === 'day' ? p.window : warm ? p.light : p.white}
      castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-7} shadow-camera-right={7} shadow-camera-top={7} shadow-camera-bottom={-7}
      shadow-bias={-.0005} shadow-normalBias={.025} shadow-radius={4} />
    <directionalLight position={[2, 3.8, 6]} intensity={window ? .55 : .4} color={p.white} />
    <directionalLight position={[5, 4, -3]} intensity={.28} color={p.white} />
    <pointLight position={[0, 4.9, .4]} intensity={warm ? 26 : 34} distance={14} decay={2} color={warm ? p.light : p.white} />
    {kind === 'work' && [-3.1, 3.1].map(x => <pointLight key={x} position={[x, 3.4, -4.6]} intensity={9} distance={6} decay={2} color={p.light} />)}
    {kind === 'elevator' && <pointLight position={[0, 4.3, -3.6]} intensity={20} distance={6} decay={2} color={p.white} />}
  </>;
}
