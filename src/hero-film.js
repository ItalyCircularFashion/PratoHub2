import * as THREE from 'three';
import { crossingAbove } from './kinematics.js';

// HeroFilm — cinematic transformation of loose yarn into woven cloth.
//
// Contract (WP07.1 audit):
//   * pure rendering module — no ScrollTrigger, no camera direction, no DOM writes;
//   * public API limited to update(progress), suspend(), resume(), dispose();
//   * initial and target control points are immutable;
//   * every update() recomputes vertex positions from the absolute progress value,
//     so scrubbing forward and backward is deterministic and free of cumulative
//     deformation.

const WARP_COUNT = 24;
const PICK_COUNT = 28;
const WIDTH = 7.65;
const DEPTH = 7.7;
const YARN_RADIUS = 0.05;
const LIFT = 0.105;
const TUBULAR_SEGMENTS = 40;
const RADIAL_SEGMENTS = 6;

const DX = WIDTH / (WARP_COUNT - 1);
const DZ = DEPTH / (PICK_COUNT - 1);

// Deterministic pseudo-random in [0,1) — stable across instances and runs.
function hash(i, j, k) {
  const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

function smooth01(t) {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
}

// Target topology mirrors fabric.js: warp runs along Z, weft along X,
// crossing order follows the real 1/1 plain or 2/2 twill rule.
function warpTarget(i, structure) {
  const points = [];
  const x = -WIDTH / 2 + i * DX;
  for (let j = 0; j < PICK_COUNT; j++) {
    const z = -DEPTH / 2 + j * DZ;
    points.push(new THREE.Vector3(x, crossingAbove(i, j, structure) ? LIFT : -LIFT, z));
    if (j < PICK_COUNT - 1) points.push(new THREE.Vector3(x, 0, z + DZ * 0.5));
  }
  return points;
}

function weftTarget(j, structure) {
  const points = [];
  const z = -DEPTH / 2 + j * DZ;
  for (let i = 0; i < WARP_COUNT; i++) {
    const x = -WIDTH / 2 + i * DX;
    points.push(new THREE.Vector3(x, crossingAbove(i, j, structure) ? -LIFT : LIFT, z));
    if (i < WARP_COUNT - 1) points.push(new THREE.Vector3(x + DX * 0.5, 0, z));
  }
  return points;
}

// Initial state: the same filaments loose and scattered, ready to be woven.
function warpInitial(i) {
  const points = [];
  const x = -WIDTH / 2 + i * DX;
  for (let j = 0; j < PICK_COUNT; j++) {
    const z = -DEPTH / 2 + j * DZ;
    const y = (hash(i, j, 1) - 0.5) * 2.2 + Math.sin(z * 0.9 + i * 0.7) * 0.5;
    const xx = x + (hash(i, j, 2) - 0.5) * 2.6;
    points.push(new THREE.Vector3(xx, y, z));
    if (j < PICK_COUNT - 1) {
      const z2 = z + DZ * 0.5;
      points.push(new THREE.Vector3(xx, (hash(i, j, 3) - 0.5) * 2.2 + Math.sin(z2 * 0.9 + i * 0.7) * 0.5, z2));
    }
  }
  return points;
}

function weftInitial(j) {
  const points = [];
  const z = -DEPTH / 2 + j * DZ;
  for (let i = 0; i < WARP_COUNT; i++) {
    const x = -WIDTH / 2 + i * DX;
    const y = (hash(i, j, 4) - 0.5) * 2.2 + Math.sin(x * 0.9 + j * 0.7) * 0.5;
    const zz = z + (hash(i, j, 5) - 0.5) * 2.6;
    points.push(new THREE.Vector3(x, y, zz));
    if (i < WARP_COUNT - 1) {
      const x2 = x + DX * 0.5;
      points.push(new THREE.Vector3(x2, (hash(i, j, 6) - 0.5) * 2.2 + Math.sin(x2 * 0.9 + j * 0.7) * 0.5, zz));
    }
  }
  return points;
}

// Write a tube around the sampled curve directly into the preallocated
// position/normal attributes. No allocation, no accumulation: the same
// control points always produce the same vertices.
function writeTube(geometry, points, radius) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const centers = curve.getPoints(TUBULAR_SEGMENTS);
  const frames = curve.computeFrenetFrames(TUBULAR_SEGMENTS, false);
  const position = geometry.attributes.position.array;
  const normal = geometry.attributes.normal.array;
  const stride = RADIAL_SEGMENTS + 1;
  for (let i = 0; i <= TUBULAR_SEGMENTS; i++) {
    const c = centers[i];
    const n = frames.normals[i];
    const b = frames.binormals[i];
    for (let j = 0; j <= RADIAL_SEGMENTS; j++) {
      const v = (i * stride + j) * 3;
      const theta = (j / RADIAL_SEGMENTS) * Math.PI * 2;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      const nx = cos * n.x + sin * b.x;
      const ny = cos * n.y + sin * b.y;
      const nz = cos * n.z + sin * b.z;
      position[v] = c.x + radius * nx;
      position[v + 1] = c.y + radius * ny;
      position[v + 2] = c.z + radius * nz;
      normal[v] = nx;
      normal[v + 1] = ny;
      normal[v + 2] = nz;
    }
  }
  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.normal.needsUpdate = true;
}

export class HeroFilm {
  constructor({ scene = null, structure = 'plain' } = {}) {
    this.group = new THREE.Group();
    this.group.name = 'hero-film';
    this.group.rotation.set(-0.12, -0.28, 0);
    this.structure = structure;
    this.progress = 0;
    this.suspended = false;
    this.warpMaterial = new THREE.MeshStandardMaterial({ color: 0xd9fd85, roughness: 0.91 });
    this.weftMaterial = new THREE.MeshStandardMaterial({ color: 0xe6dbc2, roughness: 0.93 });
    this.filaments = [];
    this._build();
    if (scene) scene.add(this.group);
    this.update(0);
  }

  _build() {
    const vertexCount = (TUBULAR_SEGMENTS + 1) * (RADIAL_SEGMENTS + 1);
    const indices = [];
    for (let i = 0; i < TUBULAR_SEGMENTS; i++) {
      for (let j = 0; j < RADIAL_SEGMENTS; j++) {
        const a = i * (RADIAL_SEGMENTS + 1) + j;
        const b = (i + 1) * (RADIAL_SEGMENTS + 1) + j;
        const c = (i + 1) * (RADIAL_SEGMENTS + 1) + j + 1;
        const d = i * (RADIAL_SEGMENTS + 1) + j + 1;
        indices.push(a, b, d, b, c, d);
      }
    }
    const addFilament = (initial, target, material, windowStart, windowEnd) => {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(vertexCount * 3);
      const normals = new Float32Array(vertexCount * 3);
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
      geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3).setUsage(THREE.DynamicDrawUsage));
      geometry.setIndex(indices);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.frustumCulled = false;
      this.group.add(mesh);
      this.filaments.push({
        mesh,
        geometry,
        initial,
        target,
        scratch: initial.map(p => p.clone()),
        windowStart,
        windowEnd,
      });
    };
    for (let i = 0; i < WARP_COUNT; i++) {
      addFilament(warpInitial(i), warpTarget(i, this.structure), this.warpMaterial, 0.05, 0.65);
    }
    for (let j = 0; j < PICK_COUNT; j++) {
      addFilament(weftInitial(j), weftTarget(j, this.structure), this.weftMaterial, 0.35, 0.95);
    }
  }

  update(progress) {
    if (this.suspended) return;
    const p = Math.max(0, Math.min(1, progress));
    this.progress = p;
    for (const f of this.filaments) {
      const t = smooth01((p - f.windowStart) / (f.windowEnd - f.windowStart));
      for (let k = 0; k < f.initial.length; k++) {
        f.scratch[k].copy(f.initial[k]).lerp(f.target[k], t);
      }
      writeTube(f.geometry, f.scratch, YARN_RADIUS);
    }
  }

  suspend() {
    this.suspended = true;
    this.group.visible = false;
  }

  resume() {
    this.suspended = false;
    this.group.visible = true;
  }

  dispose() {
    this.group.removeFromParent();
    for (const f of this.filaments) f.geometry.dispose();
    this.filaments.length = 0;
    this.warpMaterial.dispose();
    this.weftMaterial.dispose();
  }
}
