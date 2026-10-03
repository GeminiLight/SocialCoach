import test from 'node:test';
import assert from 'node:assert/strict';
import {joystickInput,joystickKeys} from '../../src/features/dinner/lib/joystick';
import {createWorld,stepWorld} from '../../src/features/dinner/lib/room';
import {scenarios} from '../../src/features/dinner/lib/content';

test('joystick respects the centre dead zone and screen directions',()=>{
  assert.deepEqual(joystickInput(1,1,28),{x:0,z:0});
  assert.deepEqual(joystickInput(0,-28,28),{x:0,z:1});
  assert.deepEqual(joystickInput(-28,0,28),{x:-1,z:-0});
  for(const [x,y] of [[500,500],[-500,-500],[20,-100]])assert.ok(Math.hypot(...Object.values(joystickInput(x,y,28)))<=1.000001);
});

test('invalid joystick dimensions never send invalid movement into the scene',()=>{
  for(const args of [[0,0,0],[10,10,-1],[NaN,10,28],[10,Infinity,28],[10,10,NaN]])assert.deepEqual(joystickInput(...args as [number,number,number]),{x:0,z:0});
});

test('keyboard movement stops on release and does not accelerate diagonally',()=>{
  const keys=new Set(['ArrowUp','ArrowRight']);
  assert.ok(Math.abs(Math.hypot(...Object.values(joystickKeys(keys)))-1)<1e-9);
  keys.delete('ArrowRight');assert.deepEqual(joystickKeys(keys),{x:0,z:1});
  keys.clear();assert.deepEqual(joystickKeys(keys),{x:0,z:0});
  assert.deepEqual(joystickKeys(new Set(['ArrowLeft','ArrowRight'])),{x:0,z:0});
});

test('releasing the joystick stops the player while NPC positions remain independent',()=>{
  const scenario=scenarios.find(s=>s.id==='elevator')!;
  const world=createWorld(scenario);
  const npcPositions=world.npcs.map(({x,z})=>({x,z}));
  const reactions=scenario.characters.map(c=>({characterId:c.id,emotion:'neutral' as const}));
  const before={x:world.player.x,z:world.player.z};
  stepWorld(world,.1,joystickInput(-28,0,28),world.viewYaw,reactions);
  assert.notDeepEqual({x:world.player.x,z:world.player.z},before);
  const after={x:world.player.x,z:world.player.z};
  for(let i=0;i<20;i++)stepWorld(world,.1,joystickInput(0,0,28),world.viewYaw,reactions);
  assert.deepEqual({x:world.player.x,z:world.player.z},after);
  assert.deepEqual(world.npcs.map(({x,z})=>({x,z})),npcPositions);
});
