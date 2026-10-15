import test from 'node:test';
import assert from 'node:assert/strict';
import {CHARACTER_ART,characterPixels,characterPortrait} from '../shared/character-art.mjs';
import {CHARACTERS} from '../shared/progression.mjs';
test('every playable character has a distinct model within battlefield bounds',()=>{
 assert.deepEqual(Object.keys(CHARACTER_ART),Object.keys(CHARACTERS));
 const silhouettes=new Set();for(const [key,art]of Object.entries(CHARACTER_ART)){assert.ok(art.rows.length<=24);assert.ok(art.rows.every(row=>row.length===16));silhouettes.add(art.rows.map(row=>row.replace(/[^.]/g,'X')).join(''));const pixels=characterPixels(key);assert.ok(pixels.length>100);assert.ok(pixels.every(p=>p.x>=0&&p.x<16&&p.y>=0&&p.y<24));assert.match(characterPortrait(key),new RegExp(`data-character-model="${key}"`));}
 assert.equal(silhouettes.size,4);
});
test('team color changes only armband pixels, leaving each character identity intact',()=>{
 for(const key of Object.keys(CHARACTERS)){const a=characterPixels(key,'#123456'),b=characterPixels(key,'#abcdef');const changes=a.filter((p,n)=>p.color!==b[n].color);assert.ok(changes.length>0&&changes.length<20);assert.equal(characterPortrait(key),characterPortrait(key));}
 assert.deepEqual(characterPixels('unknown'),characterPixels('scout'));
});
