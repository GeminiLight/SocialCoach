import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {AvatarFigure} from '../../src/data/avatars';

test('a locally saved portrait image renders in place of the selected preset',()=>{
 const image='data:image/jpeg;base64,'+readFileSync('public/images/dinner-home-preview.jpg').toString('base64');
 const output=renderToStaticMarkup(createElement(AvatarFigure,{seed:'you#0',hue:40,size:40,imageData:image}));
 assert.ok(output.includes('<img'));assert.ok(output.includes('data:image/jpeg;base64,'));assert.ok(!output.includes('<svg'));
});
test('external URLs and active image content fall back to the local preset',()=>{
 for(const imageData of ['https://example.com/private.jpg','data:image/svg+xml,<svg onload="alert(1)"/>','data:text/html;base64,SGVsbG8=']){
  const output=renderToStaticMarkup(createElement(AvatarFigure,{seed:'you#0',hue:40,imageData}));assert.ok(output.includes('<svg'));assert.ok(!output.includes('<img'));
 }
});
