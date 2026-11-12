import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as THREE from 'three';
import { HeroFilm } from '../src/hero-film.js';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, '..', 'src', 'hero-film.js'), 'utf8');

function snapshot(film) {
  const parts = [];
  for (const f of film.filaments) {
    const arr = f.geometry.attributes.position.array;
    for (let i = 0; i < arr.length; i++) parts.push(arr[i].toFixed(6));
  }
  return parts.join('|');
}

function allFinite(film) {
  return film.filaments.every(f => {
    const arr = f.geometry.attributes.position.array;
    for (let i = 0; i < arr.length; i++) if (!Number.isFinite(arr[i])) return false;
    return true;
  });
}

test('constructor: group initialised, attached to scene, filaments built', () => {
  const scene = new THREE.Group();
  const film = new HeroFilm({ scene });
  assert.ok(film.group.isGroup, 'this.group must be a THREE.Group');
  assert.equal(film.group.parent, scene, 'group added to the scene');
  assert.equal(film.filaments.length, 52, '24 warp + 28 weft filaments');
  for (const f of film.filaments) {
    assert.ok(f.initial.length > 0 && f.initial.length === f.target.length,
      'initial and target control points present and aligned');
    assert.ok(f.geometry.attributes.position.array.length > 0, 'geometry allocated');
  }
  assert.equal(film.progress, 0);
});

test('update is deterministic and reversible (no cumulative deformation)', () => {
  const film = new HeroFilm();
  film.update(0.3);
  const at03 = snapshot(film);
  film.update(0.7);
  const at07 = snapshot(film);
  assert.notEqual(at03, at07, 'progress changes the geometry');
  film.update(0.3);
  assert.equal(snapshot(film), at03, 'returning to 0.3 restores the exact same vertices');
  film.update(0.0);
  const at00 = snapshot(film);
  film.update(0.3);
  assert.equal(snapshot(film), at03, '0 -> 0.3 reproduces the same vertices');
  assert.notEqual(at00, at03, 'progress 0 differs from progress 0.3');
  assert.ok(allFinite(film), 'no NaN/Infinity in vertex data');
});

test('separate instances produce identical geometry for the same progress', () => {
  const a = new HeroFilm();
  const b = new HeroFilm();
  a.update(0.42);
  b.update(0.42);
  assert.equal(snapshot(a), snapshot(b), 'construction is deterministic');
});

test('progress is clamped to [0,1]', () => {
  const film = new HeroFilm();
  film.update(0);
  const low = snapshot(film);
  film.update(-0.5);
  assert.equal(snapshot(film), low, 'negative progress clamps to 0');
  film.update(1);
  const high = snapshot(film);
  film.update(1.5);
  assert.equal(snapshot(film), high, 'progress above 1 clamps to 1');
});

test('suspend freezes updates, resume restores them', () => {
  const film = new HeroFilm();
  film.update(0.2);
  const before = snapshot(film);
  film.suspend();
  assert.equal(film.group.visible, false, 'suspension hides the film');
  film.update(0.9);
  assert.equal(snapshot(film), before, 'no geometry change while suspended');
  film.resume();
  assert.equal(film.group.visible, true, 'resume shows the film again');
  film.update(0.9);
  assert.notEqual(snapshot(film), before, 'updates resume after resume()');
});

test('dispose releases the scene attachment and geometries', () => {
  const scene = new THREE.Group();
  const film = new HeroFilm({ scene });
  film.dispose();
  assert.equal(film.group.parent, null, 'group detached from scene');
  assert.equal(film.filaments.length, 0, 'filament list cleared');
});

test('module honours the WP07.1 architectural contract', () => {
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:"'])\/\/.*$/gm, '');
  assert.doesNotMatch(code, /ScrollTrigger/, 'no ScrollTrigger');
  assert.doesNotMatch(code, /camera/i, 'no camera direction');
  assert.doesNotMatch(code, /style\.transform/, 'no DOM transform writes');
  assert.doesNotMatch(code, /THREE\.Points|PointsMaterial/, 'no point sprites: threads are tubes');
});

test('Three.js APIs used by the module exist in the installed version', () => {
  assert.equal(typeof THREE.CatmullRomCurve3, 'function');
  assert.equal(typeof THREE.BufferAttribute, 'function');
  assert.ok(THREE.DynamicDrawUsage !== undefined, 'DynamicDrawUsage present');
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(1, 0.2, 0),
    new THREE.Vector3(2, 0, 0),
  ]);
  assert.equal(curve.getPoints(8).length, 9, 'getPoints returns divisions+1');
  const frames = curve.computeFrenetFrames(8, false);
  assert.equal(frames.normals.length, 9, 'frenet normals match segments+1');
  assert.equal(frames.binormals.length, 9, 'frenet binormals match segments+1');
});
