import * as THREE from 'three';
import { HeroFilm } from './hero-film.js';

// Hero Filiera 3D — tre atti in loop: ORDITURA → TESSITURA → RIFINIZIONE.
// Un solo atto visibile alla volta, crossfade in opacità. Nessuna dipendenza dal DOM.

const ACT_DURATION = 4.2;
const FADE = 0.8;

function rainbowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  for (let i = 0; i <= 12; i++) gradient.addColorStop(i / 12, `hsl(${i * 30},95%,60%)`);
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function smooth(t) {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
}

function collectMaterials(group) {
  const set = new Set();
  group.traverse(node => {
    if (node.isMesh) {
      node.material.transparent = true;
      set.add(node.material);
    }
  });
  return [...set];
}

export function createHeroSequence() {
  const group = new THREE.Group();
  const acts = [];

  const steel = new THREE.MeshStandardMaterial({ color: 0x9ab1ab, metalness: .75, roughness: .33 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x263b35, metalness: .6, roughness: .48 });
  const warpA = new THREE.MeshStandardMaterial({ color: 0xd7ff63, metalness: .05, roughness: .84 });
  const warpB = new THREE.MeshStandardMaterial({ color: 0xbddd83, metalness: .04, roughness: .9 });
  const cloth = new THREE.MeshStandardMaterial({ map: rainbowTexture(), metalness: .1, roughness: .89 });

  // ── Atto 1: ORDITURA — i fili di ordito si dispongono in parallelo ──
  const orditura = new THREE.Group();
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, 7.6, 28), dark);
  beam.rotation.z = Math.PI / 2;
  beam.position.set(0, -.45, -3.3);
  orditura.add(beam);
  const threads = [];
  for (let i = 0; i < 24; i++) {
    const x = -3.5 + i * 7 / 23;
    const thread = new THREE.Mesh(new THREE.CylinderGeometry(.032, .032, 6.9, 6), i % 2 ? warpA : warpB);
    thread.rotation.x = Math.PI / 2;
    thread.position.set(x, -.18, .1);
    orditura.add(thread);
    threads.push({ mesh: thread, baseX: x });
  }
  group.add(orditura);
  acts.push({
    name: 'ORDITURA',
    group: orditura,
    materials: collectMaterials(orditura),
    update(dt, phase) {
      const settle = 1 - phase * .55;
      threads.forEach((o, i) => {
        o.mesh.position.x = o.baseX + Math.sin(phase * 6.283 + i * .45) * .22 * settle;
        o.mesh.position.y = -.18 + Math.sin(phase * 6.283 + i * .45 + 1.2) * .06 * settle;
      });
    }
  });

  // ── Atto 2: TESSITURA — filato che si intreccia (HeroFilm) ──
  const film = new HeroFilm();
  group.add(film.group);
  acts.push({
    name: 'TESSITURA',
    group: film.group,
    materials: collectMaterials(film.group),
    update(dt, phase) { film.update(phase); }
  });

  // ── Atto 3: RIFINIZIONE — il tessuto si avvolge sul rocchetto ──
  const rifinizione = new THREE.Group();
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, 7.6, 28), cloth);
  roll.rotation.z = Math.PI / 2;
  roll.position.set(0, -.35, 3.1);
  rifinizione.add(roll);
  const sheet = new THREE.Mesh(new THREE.BoxGeometry(7.3, .05, 3.4), cloth);
  sheet.position.set(0, -.12, .6);
  rifinizione.add(sheet);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, 7.7, 16), steel);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, .32, 1.1);
  rifinizione.add(bar);
  group.add(rifinizione);
  acts.push({
    name: 'RIFINIZIONE',
    group: rifinizione,
    materials: collectMaterials(rifinizione),
    update(dt, phase) {
      roll.rotation.x = phase * 6.283;
      const wind = 1 - phase * .72;
      sheet.scale.z = wind;
      sheet.position.z = 3.1 - 1.7 + 1.7 * wind;
      roll.scale.set(1, 1 + phase * .18, 1 + phase * .18);
    }
  });

  const LOOP = ACT_DURATION * acts.length;
  let elapsed = 0;

  function applyOpacity() {
    const t = elapsed % LOOP;
    acts.forEach((act, i) => {
      const local = (t - i * ACT_DURATION + LOOP) % LOOP;
      let opacity = 0;
      if (local < ACT_DURATION) {
        opacity = Math.min(smooth(local / FADE), smooth((ACT_DURATION - local) / FADE));
      }
      act.group.visible = opacity > .01;
      for (const m of act.materials) m.opacity = opacity;
    });
  }

  return {
    group,
    get phase() {
      return acts[Math.floor((elapsed % LOOP) / ACT_DURATION)].name;
    },
    update(dt) {
      elapsed = (elapsed + dt) % LOOP;
      acts.forEach((act, i) => {
        const local = (elapsed - i * ACT_DURATION + LOOP) % LOOP;
        if (local < ACT_DURATION) act.update(dt, local / ACT_DURATION);
      });
      applyOpacity();
    },
    dispose() {
      group.traverse(node => {
        if (node.isMesh) {
          node.geometry.dispose();
          if (node.material.map) node.material.map.dispose();
          node.material.dispose();
        }
      });
    }
  };
}
