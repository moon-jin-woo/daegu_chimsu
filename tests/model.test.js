import test from 'node:test';
import assert from 'node:assert/strict';
import {adjustedRainfall,indexAt,simulate,summarize} from '../src/model.js';
import {decodeElevation,tileCoordinates} from '../src/terrain.js';
test('warming formula implements the selectable scenario assumption',()=>{
  assert.equal(adjustedRainfall(100,0,7),100);
  assert.ok(Math.abs(adjustedRainfall(100,2,7)-114.49)<.00001);
  assert.throws(()=>adjustedRainfall(-10,2,7));
});
test('Terrarium RGB elevation decoding',()=>{
  assert.equal(decodeElevation(128,0,0),0);
  assert.equal(decodeElevation(128,100,128),100.5);
});
test('north-first geographic index and off-map handling',()=>{
  const bounds=[0,10,10,20];
  assert.equal(indexAt(9.5,10.5,bounds,10,10),0);
  assert.equal(indexAt(.5,19.5,bounds,10,10),99);
  assert.equal(indexAt(-2,15,bounds,10,10),-1);
});
test('a wet flat grid has positive nonnegative runoff with open boundaries',()=>{
  const z=new Float32Array(25).fill(100);
  const f=simulate({elevation:z,width:5,height:5,dx:100,dy:100,rainMmH:100,lossMmH:0,durationHours:1,intervalMinutes:60});
  assert.equal(f.length,2);
  const depths=f.at(-1).depths;
  assert.ok(depths[12]>0&&depths[12]<.101);
  assert.equal(depths[0],0);
  assert.ok(depths.every(v=>Number.isFinite(v)&&v>=0));
});
test('zero net runoff gives zero depth everywhere',()=>{
  const z=new Float32Array(25).fill(100);
  const f=simulate({elevation:z,width:5,height:5,dx:100,dy:100,rainMmH:30,lossMmH:45,durationHours:1});
  assert.equal(Math.max(...f.at(-1).depths),0);
});
test('downhill routing does not create negative depths',()=>{
  const z=Float32Array.from({length:49},(_,i)=>100-(i%7));
  const f=simulate({elevation:z,width:7,height:7,dx:80,dy:80,rainMmH:100,lossMmH:0,durationHours:2});
  const depths=f.at(-1).depths;
  assert.ok(depths.every(v=>v>=0&&Number.isFinite(v)));
  const result=summarize(depths,.1,80,80,[0,24,-1]);
  assert.equal(result.siteDepths[2],null);
  assert.ok(result.floodedAreaKm2>=0);
});
test('Web Mercator tile coordinates are in the expected range',()=>{
  const p=tileCoordinates(35.85,128.53,12);
  assert.ok(p.x>0&&p.x<4096&&p.y>0&&p.y<4096);
});