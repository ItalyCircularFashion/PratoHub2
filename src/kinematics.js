// One pick per cycle. All values normalised. Conceptual timing, not measured loom timing.
export function clamp01(value) { return Math.max(0, Math.min(1, value)); }
export function smooth(t) { t = clamp01(t); return t * t * (3 - 2 * t); }
export function phaseWindow(t, start, end) { return smooth((t - start) / (end - start)); }
export function getKinematics(phase) {
  const p = ((phase % 1) + 1) % 1;
  const insertion = phaseWindow(p, .18, .44);
  const withdrawal = phaseWindow(p, .54, .76);
  const reach = insertion * (1 - withdrawal);
  const reed = phaseWindow(p, .75, .86) * (1 - phaseWindow(p, .89, .96));
  const shed = Math.cos(p * Math.PI * 2) * .32;
  let stage = 'APERTURA DEL PASSO';
  if (p >= .18 && p < .44) stage = 'INSERZIONE TRAMA';
  else if (p >= .44 && p < .54) stage = 'TRASFERIMENTO PINZE';
  else if (p >= .54 && p < .76) stage = 'RIENTRO PINZE';
  else if (p >= .76 && p < .96) stage = 'BATTUTA DEL PETTINE';
  else if (p >= .96) stage = 'AVANZAMENTO TESSUTO';
  return { phase:p, reach, insertion, withdrawal, reed, shed, stage, weftVisible:p>.33 && p<.96, weftLength:insertion };
}

// Crossing topology independent of Three.js so it can be unit tested.
export function crossingAbove(warpIndex,pickIndex,structure='plain') {
  return structure==='twill' ? ((warpIndex+pickIndex)%4)<2 : (warpIndex+pickIndex)%2===0;
}
