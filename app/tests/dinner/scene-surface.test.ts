import test from 'node:test';
import assert from 'node:assert/strict';
import { Group, Mesh } from 'three';
import { sceneSurface } from '../../src/features/dinner/lib/sceneSurface';

test('multi-material floor and ceiling primitives keep their surface semantics',()=>{
  for(const name of ['Floor','Ceiling']) {
    const group=new Group();group.name=name;
    for(const primitiveName of ['Cube','Cube_1','Floor_2']) {
      const primitive=new Mesh();primitive.name=primitiveName;group.add(primitive);
      assert.equal(sceneSurface(primitive),name);
    }
  }
});

test('control groups work through child meshes without making unrelated objects floors',()=>{
  for(const name of ['LiftOpen','LiftClosed','OfficeBoard','EvidenceDocumentScope']) {
    const group=new Group();group.name=name;const part=new Mesh();part.name='Primitive';group.add(part);assert.equal(sceneSurface(part),name);
  }
  const table=new Group();table.name='FloorPlan';const ornament=new Mesh();ornament.name='Decoration';table.add(ornament);assert.equal(sceneSurface(ornament),'Decoration');
});
