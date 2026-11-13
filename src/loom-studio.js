import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────────────────
// Telaio "da vetrina" in due art direction ispirate ai render Tripo:
//   stylized  → fondo chiaro, materiali mattona, legno miele, stoffe pop
//   realistic → fondo scuro da studio, legno noce, ottone, stoffa blu floreale
// Modulo di presentazione: niente cinematismi industriali, solo una lenta
// respirazione del passo e della battuta per dare vita alla scena.
// ─────────────────────────────────────────────────────────────────────────────

const PALETTES={
  stylized:{
    bg:0xf3f0e9,ground:0xeae5d9,wood:0xcfa56e,woodDark:0xa97e49,brass:0xe2ba5e,
    warp:0xf7f2e4,weft:0x7fd0c2,key:0xffffff,fill:0xfff2dc,rim:0xffffff,
    exposure:1.0,shadow:.32,fabric:'rainbow',grain:false
  },
  realistic:{
    bg:0x16130e,ground:0x251f16,wood:0x4b3320,woodDark:0x2b1d11,brass:0x9a7433,
    warp:0xe6d9bd,weft:0x2f4d7a,key:0xfff0da,fill:0x93a7bd,rim:0xffdfae,
    exposure:1.28,shadow:.62,fabric:'floral',grain:true
  }
};

// Stoffa: rainbow a strisce (stilizzato) oppure blu floreale (realistico).
function fabricTexture(kind){
  const c=document.createElement('canvas');c.width=512;c.height=512;const x=c.getContext('2d');
  if(kind==='floral'){
    x.fillStyle='#26456e';x.fillRect(0,0,512,512);
    const cols=['#d8c49a','#e9e2d0','#93a9c9','#c9a24a','#7d94b5'];
    for(let i=0;i<420;i++){
      const px=(i*97)%512,py=(i*173)%512,r=1.6+((i*7)%5);
      x.fillStyle=cols[i%cols.length];x.beginPath();x.arc(px,py,r,0,7);x.fill();
    }
    // trama: trame di ordito
    x.globalAlpha=.10;x.fillStyle='#0d1c30';
    for(let i=0;i<512;i+=4){x.fillRect(0,i,512,1);}
    x.globalAlpha=.08;
    for(let i=0;i<512;i+=4){x.fillRect(i,0,1,512);}
    x.globalAlpha=1;
  }else{
    const cols=['#ff6b6b','#ffc46b','#fff06b','#8fe08a','#6fc7ff','#b98cff'];
    const w=512/cols.length;
    cols.forEach((col,i)=>{x.fillStyle=col;x.fillRect(i*w,0,w,512);});
    x.globalAlpha=.16;x.fillStyle='#202020';
    for(let i=0;i<512;i+=6)x.fillRect(0,i,512,2);
    x.globalAlpha=1;
  }
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}

// Grana legno procedurale (solo stile realistico).
function woodTexture(){
  const c=document.createElement('canvas');c.width=256;c.height=256;const x=c.getContext('2d');
  x.fillStyle='#ffffff';x.fillRect(0,0,256,256);
  for(let i=0;i<220;i++){
    const y=(i*37)%256;x.strokeStyle=`rgba(${40+ (i%40)},${25+(i%25)},${12+(i%15)},${.05+(i%6)/60})`;
    x.lineWidth=.6+(i%3);x.beginPath();x.moveTo(0,y);
    x.bezierCurveTo(80,y+(i%7)-3,170,y-(i%9)+4,256,y+(i%5)-2);x.stroke();
  }
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}

// Fondale "ciclorama": gradiente radiale morbido, da studio.
function groundTexture(bgHex,groundHex){
  const c=document.createElement('canvas');c.width=512;c.height=512;const x=c.getContext('2d');
  const bg='#'+bgHex.toString(16).padStart(6,'0');
  const gnd='#'+groundHex.toString(16).padStart(6,'0');
  const g=x.createRadialGradient(256,256,30,256,256,320);
  g.addColorStop(0,gnd);g.addColorStop(.5,gnd);g.addColorStop(1,bg);
  x.fillStyle=g;x.fillRect(0,0,512,512);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}

export function createStudioLoom({style='stylized'}={}){
  const P=PALETTES[style]||PALETTES.stylized;
  const group=new THREE.Group(),disposables=[];
  const track=(o)=>{disposables.push(o);return o;};

  const woodMap=P.grain?track(woodTexture()):null;
  const woodMat=track(new THREE.MeshStandardMaterial({
    color:P.wood,roughness:P.grain?.62:.78,metalness:P.grain?.08:.02,
    map:woodMap||null
  }));
  const woodDarkMat=track(new THREE.MeshStandardMaterial({color:P.woodDark,roughness:P.grain?.6:.82,metalness:P.grain?.06:.02}));
  const brassMat=track(new THREE.MeshStandardMaterial({color:P.brass,roughness:P.grain?.32:.45,metalness:P.grain?.9:.55}));
  const warpMat=track(new THREE.MeshStandardMaterial({color:P.warp,roughness:.9,metalness:0}));
  const weftMat=track(new THREE.MeshStandardMaterial({color:P.weft,roughness:.85,metalness:0}));
  const fabricMap=track(fabricTexture(P.fabric));fabricMap.repeat.set(2,1.4);
  const fabricMat=track(new THREE.MeshStandardMaterial({map:fabricMap,roughness:.9,metalness:0}));

  const add=(geo,mat,parent=group)=>{const m=new THREE.Mesh(geo,mat);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
  const box=(w,h,d,mat=woodMat)=>track(new THREE.BoxGeometry(w,h,d));

  // ── Struttura: due telai laterali + traverse ──
  const W=1.7,H=2.5,D=.8;
  for(const x of [-W,W])for(const z of [-D,D]){
    const p=add(box(.1,H,.1),woodMat);p.position.set(x,H/2,z);
  }
  for(const x of [-W,W])for(const y of [.16,H-.16]){
    const r=add(box(.1,.1,2*D+.12),woodMat);r.position.set(x,y,0);
  }
  for(const y of [.16,H-.16])for(const z of [-D,D]){
    const r=add(box(2*W+.12,.13,.13),woodDarkMat);r.position.set(0,y,z);
  }
  // traverse superiori + inferiore
  for(const z of [-D*.6,D*.6]){
    const r=add(box(2*W,.09,.09),woodDarkMat);r.position.set(0,H-.42,z);
  }
  // piedi a croce
  for(const x of [-W,W]){
    const f=add(box(.16,.06,2*D+.3),woodDarkMat);f.position.set(x,.03,0);
  }

  // ── Asi: subbio (posteriore) e telo (anteriore) ──
  const warpBeam=add(track(new THREE.CylinderGeometry(.27,.27,2*W-.06,32)),woodDarkMat);
  warpBeam.rotation.z=Math.PI/2;warpBeam.position.set(0,1.02,-D+.06);
  const clothBeam=add(track(new THREE.CylinderGeometry(.21,.21,2*W-.06,32)),woodDarkMat);
  clothBeam.rotation.z=Math.PI/2;clothBeam.position.set(0,.70,D-.12);
  const breastBeam=add(track(new THREE.CylinderGeometry(.075,.075,2*W-.04,24)),woodMat);
  breastBeam.rotation.z=Math.PI/2;breastBeam.position.set(0,1.42,D-.2);
  // manovella del telo (ottone)
  const crank=add(track(new THREE.CylinderGeometry(.05,.05,.34,16)),brassMat);
  crank.rotation.z=Math.PI/2;crank.position.set(W-.02,.70,D-.12);
  const crankArm=add(box(.05,.26,.05),brassMat);crankArm.position.set(W+.14,.70,D-.12);

  // ── Ordito: 44 fili tesi dal subbio al telo ──
  const N=44;
  const warpGeo=track(new THREE.CylinderGeometry(.0065,.0065,1.5,5));
  const warps=new THREE.InstancedMesh(warpGeo,warpMat,N);
  warps.castShadow=false;
  {
    const d=new THREE.Object3D();
    for(let i=0;i<N;i++){
      d.position.set(-1.58+i*3.16/(N-1),1.30,-.02);
      d.rotation.x=Math.PI/2;d.updateMatrix();warps.setMatrixAt(i,d.matrix);
    }
    warps.instanceMatrix.needsUpdate=true;
  }
  group.add(warps);

  // ── Licci: due telai con licci (gruppi di fili verticali) ──
  const heddleGroups=[];
  const wireGeo=track(new THREE.CylinderGeometry(.004,.004,1.0,4));
  for(let k=0;k<2;k++){
    const hg=new THREE.Group();hg.position.set(0,0,.02+k*.16);group.add(hg);
    for(const y of [.82,1.78]){
      const bar=add(box(2*W-.24,.05,.05),woodDarkMat,hg);bar.position.set(0,y,0);
    }
    const wires=new THREE.InstancedMesh(wireGeo,warpMat,N);
    {
      const d=new THREE.Object3D();
      for(let i=0;i<N;i++){
        d.position.set(-1.58+i*3.16/(N-1),1.30,0);
        d.rotation.set(0,0,0);d.updateMatrix();wires.setMatrixAt(i,d.matrix);
      }
      wires.instanceMatrix.needsUpdate=true;
    }
    hg.add(wires);
    heddleGroups.push(hg);
  }

  // ── Pettine: rettangolo con lamelle verticali ──
  const reed=new THREE.Group();reed.position.set(0,0,.44);group.add(reed);
  for(const y of [.86,1.74]){
    const b=add(box(2*W-.2,.07,.07),woodMat,reed);b.position.set(0,y,0);
  }
  const slatGeo=track(new THREE.BoxGeometry(.018,.86,.018));
  const slats=new THREE.InstancedMesh(slatGeo,woodDarkMat,34);
  {
    const d=new THREE.Object3D();
    for(let i=0;i<34;i++){
      d.position.set(-1.55+i*3.1/33,1.30,0);d.updateMatrix();slats.setMatrixAt(i,d.matrix);
    }
    slats.instanceMatrix.needsUpdate=true;
  }
  reed.add(slats);

  // ── Tessuto in formazione sul telo ──
  const cloth=add(box(2*W-.2,.05,1.0,fabricMat),fabricMat);
  cloth.position.set(0,1.30,.55);
  // stoffa che ric dal telo
  const hanging=add(box(2*W-.2,1.05,.05,fabricMat),fabricMat);
  hanging.position.set(0,.72,D-.02);hanging.rotation.x=-.12;

  // ── Navetta (shuttle) sul tessuto ──
  const shuttle=new THREE.Group();shuttle.position.set(.55,1.36,.62);group.add(shuttle);
  const body=add(box(.34,.07,.09),woodDarkMat,shuttle);
  add(box(.06,.09,.07),brassMat,shuttle).position.set(.12,.02,0);
  add(box(.06,.09,.07),brassMat,shuttle).position.set(-.12,.02,0);

  // ── Accessori: rocchetti a terra ──
  const spoolCols=P.fabric==='floral'?[0x26456e,0x9a7433,0xd8c49a]:[0xff6b6b,0xfff06b,0x6fc7ff];
  spoolCols.forEach((col,i)=>{
    const s=new THREE.Group();s.position.set(2.35,.16,.35-i*.42);group.add(s);
    add(track(new THREE.CylinderGeometry(.09,.09,.24,18)),track(new THREE.MeshStandardMaterial({color:col,roughness:.85,metalness:.05})),s);
    add(track(new THREE.CylinderGeometry(.03,.03,.3,10)),woodDarkMat,s);
    add(track(new THREE.CylinderGeometry(.11,.11,.03,18)),woodDarkMat,s).position.y=.12;
  });

  // ── Fondale da studio ──
  const ground=add(track(new THREE.CircleGeometry(9,48)),track(new THREE.MeshStandardMaterial({
    map:track(groundTexture(P.bg,P.ground)),roughness:.95,metalness:0
  })),group);
  ground.rotation.x=-Math.PI/2;ground.position.y=0;ground.castShadow=false;

  // ── Luce: key + fill + rim (setup da studio) ──
  const key=new THREE.DirectionalLight(P.key,P.grain?2.6:2.2);
  key.position.set(-3.4,4.6,3.2);key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);
  key.shadow.camera.left=-4;key.shadow.camera.right=4;key.shadow.camera.top=4;key.shadow.camera.bottom=-4;
  key.shadow.bias=-.0006;group.add(key);
  const fill=new THREE.DirectionalLight(P.fill,P.grain?1.1:1.3);fill.position.set(4,2.2,3);group.add(fill);
  const rim=new THREE.DirectionalLight(P.rim,P.grain?1.6:1.2);rim.position.set(1.5,3.4,-4.5);group.add(rim);
  const hemi=new THREE.HemisphereLight(P.bg,P.ground,.55);group.add(hemi);

  // ── Movimento: respiro lento del passo e della battuta ──
  let t=0;
  function update(dt){
    t+=dt;
    const shed=Math.sin(t*.9)*.075;
    heddleGroups[0].position.y=shed;
    heddleGroups[1].position.y=-shed;
    reed.position.z=.44+Math.sin(t*.9-1.1)*.05;
    shuttle.position.x=.55+Math.sin(t*.45)*.55;
    cloth.scale.z=1+Math.sin(t*.9)*.012;
    warpBeam.rotation.x+=dt*.05;clothBeam.rotation.x+=dt*.07;
  }
  function dispose(){disposables.forEach(d=>d.dispose&&d.dispose());}
  return {group,update,dispose,exposure:P.exposure,background:P.bg};
}
