import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reviewBounds} from '../../src/components/practice/ReviewSplit';

test('resizing a narrow or hidden split never creates reversed accessibility bounds',()=>{
 for(const width of [0,320,640,700,716,760,1000]){
  const bounds=reviewBounds(width,260,420,36);
  assert.ok(Number.isFinite(bounds.min)&&Number.isFinite(bounds.max));
  assert.ok(bounds.min<=bounds.max,JSON.stringify({width,bounds}));
 }
});
test('a desktop split preserves both transcript and review minimum widths',()=>{
 for(const width of [760,900,1100]){
  const {min,max}=reviewBounds(width,260,420,36);
  assert.ok(width*min/100>=260-0.01);
  assert.ok(width*(1-max/100)-36>=420-0.01);
 }
});
