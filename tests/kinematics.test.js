import test from 'node:test';
import assert from 'node:assert/strict';
import {getKinematics,phaseWindow,clamp01,crossingAbove} from '../src/kinematics.js';

test('controls clamp and normalise safely',()=>{
  assert.equal(clamp01(-1),0);assert.equal(clamp01(2),1);
  assert.equal(phaseWindow(.1,.2,.4),0);
  assert.equal(phaseWindow(.5,.2,.4),1);
  assert.equal(getKinematics(1.2).phase.toFixed(3),'0.200');
});
test('rapiers travel inward then withdraw without exceeding envelope',()=>{
  for(let i=0;i<=100;i++){
    const k=getKinematics(i/100);
    assert.ok(k.reach>=0 && k.reach<=1);
    assert.ok(k.weftLength>=0 && k.weftLength<=1);
  }
  assert.ok(getKinematics(.48).reach>.99);
  assert.ok(getKinematics(.79).reach<.01);
});
test('reed beat-up occurs only in the late phase',()=>{
  assert.equal(getKinematics(.5).reed,0);
  assert.ok(getKinematics(.865).reed>.8);
  assert.ok(getKinematics(.98).reed<.01);
});
test('plain weave 1/1 alternates, 2/2 twill uses four-end repeat',()=>{
  assert.equal(crossingAbove(0,0,'plain'),true);
  assert.equal(crossingAbove(0,1,'plain'),false);
  assert.equal(crossingAbove(1,0,'plain'),false);
  assert.deepEqual([0,1,2,3].map(i=>crossingAbove(i,0,'twill')),[true,true,false,false]);
  assert.deepEqual([0,1,2,3].map(i=>crossingAbove(i,1,'twill')),[true,false,false,true]);
});
