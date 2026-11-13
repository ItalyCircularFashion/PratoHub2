import * as THREE from 'three';
import { getKinematics } from './kinematics.js';

// Rainbow cloth texture: HSL gradient applied to the fabric the loom is forming.
function rainbowTexture(){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=64;
  const ctx=canvas.getContext('2d');
  const gradient=ctx.createLinearGradient(0,0,canvas.width,0);
  for(let i=0;i<=12;i++)gradient.addColorStop(i/12,`hsl(${i*30},95%,60%)`);
  ctx.fillStyle=gradient;ctx.fillRect(0,0,canvas.width,canvas.height);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}

// Normalised smooth window over [a,b].
const win=(p,a,b)=>{const t=Math.max(0,Math.min(1,(p-a)/(b-a)));return t*t*(3-2*t);};
const lerp=(a,b,t)=>a+(b-a)*t;

// Static GLB frame from /public/models/loom-frame.glb; dynamic assemblies here.
// This is an educational stylisation, not real machine timing or a safety simulation.
export function createLoom(){
  const group=new THREE.Group(),disposables=new Set();
  const fill=new THREE.DirectionalLight(0xe6ffe8,1.5);fill.position.set(-4,7,9);group.add(fill);
  const material=(color,metalness=.15,roughness=.65)=>{
    const m=new THREE.MeshStandardMaterial({color,metalness,roughness});disposables.add(m);return m;
  };
  const steel=material(0x9ab1ab,.75,.33),dark=material(0x263b35,.6,.48),warpMat=[material(0xd7ff63,.05,.84),material(0xbddd83,.04,.9)],weft=material(0xf2d5a1,.06,.8),red=material(0xff4343,.1,.38),green=material(0x69ff95,.1,.35);
  const fabricMap=rainbowTexture();disposables.add(fabricMap);
  const fabricMat=new THREE.MeshStandardMaterial({map:fabricMap,metalness:.1,roughness:.89});disposables.add(fabricMat);
  const add=(geometry,mat,parent=group)=>{disposables.add(geometry);const mesh=new THREE.Mesh(geometry,mat);parent.add(mesh);return mesh;};
  function box(w,h,d,x,y,z,mat=steel,parent=group){const m=add(new THREE.BoxGeometry(w,h,d),mat,parent);m.position.set(x,y,z);return m}
  function axle(radius,length,x,y,z,mat=dark){const g=new THREE.Group();g.position.set(x,y,z);group.add(g);const m=add(new THREE.CylinderGeometry(radius,radius,length,40),mat,g);m.rotation.z=Math.PI/2;return g}
  const warpBeam=axle(.67,7.85,0,-.61,-4.1),clothBeam=axle(.46,7.85,0,-1.08,4.10);
  for(let i=0;i<30;i++){
    const x=-3.72+i*7.44/29;
    const rib=box(.018,.042,.8,x,-.03,3.17,warpMat[i%2]);
    rib.visible=true;
  }
  const heddles=[new THREE.Group(),new THREE.Group()];
  for(let k=0;k<2;k++){
    const h=heddles[k];group.add(h);const z=-.72+k*.57;
    for(const x of [-3.88,3.88])box(.09,1.65,.09,x,0,z,steel,h);
    for(const y of [-.79,.79])box(7.83,.095,.095,0,y,z,steel,h);
    // Schematic heddle eye for each thread in the corresponding shaft.
    for(let i=k;i<48;i+=2){const x=-3.63+i*7.26/47; const eye=add(new THREE.TorusGeometry(.069,.014,5,9),steel,h);eye.position.set(x,0,z);}
  }
  const reed=new THREE.Group();group.add(reed);
  for(let i=0;i<=48;i++)box(.021,1.55,.037,-3.82+i*7.64/48,0,1.22,steel,reed);
  for(const y of [-.78,.78])box(7.8,.095,.10,0,y,1.22,steel,reed);
  const drops=[];
  const N=48;
  for(let i=0;i<N;i++){const x=-3.63+i*7.26/(N-1);drops.push(box(.043,.6,.055,x,.12,-2.55,steel));}
  // Dynamic tubular warp strands; vertex buffers update in place, no TubeGeometry recreation per frame.
  // Section normals are constant (hexagon cross-section in the x/y plane), so they are
  // precomputed once instead of running computeVertexNormals() on 48 geometries every frame.
  const zPoints=[-4.18,-3.5,-2.65,-1.8,-.95,-.4,.4,.95,1.65,2.42,3.65],ringSides=6,radius=.028;
  const warps=[];
  for(let i=0;i<N;i++){
    const x=-3.63+i*7.26/(N-1),positions=new Float32Array(zPoints.length*ringSides*3),indices=[];
    const normals=new Float32Array(zPoints.length*ringSides*3);
    for(let r=0;r<zPoints.length;r++)for(let side=0;side<ringSides;side++){
      const a=2*Math.PI*side/ringSides,index=(r*ringSides+side)*3;
      normals[index]=Math.cos(a);normals[index+1]=Math.sin(a);normals[index+2]=0;
    }
    for(let r=0;r<zPoints.length-1;r++)for(let side=0;side<ringSides;side++){
      const a=r*ringSides+side,b=r*ringSides+(side+1)%ringSides,c=(r+1)*ringSides+side,d=(r+1)*ringSides+(side+1)%ringSides;
      indices.push(a,b,c,b,d,c);
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.BufferAttribute(normals,3));geo.setIndex(indices);const mesh=add(geo,warpMat[i%2]);
    warps.push({mesh,x,positions,geo});
  }

  // ── Preparatore di trama (weft feeder) a sinistra del telaio ──
  const feeder=new THREE.Group();feeder.position.set(-4.75,-.05,2.04);group.add(feeder);
  add(new THREE.CylinderGeometry(.05,.05,.9,10),steel,feeder).position.set(0,.45,0);
  const pirn=add(new THREE.CylinderGeometry(.17,.17,.5,22),weft,feeder);pirn.position.set(0,.1,0);
  const pirnCore=add(new THREE.CylinderGeometry(.05,.05,.56,12),dark,feeder);pirnCore.position.set(0,.1,0);
  const guide=add(new THREE.TorusGeometry(.07,.014,5,10),steel,feeder);guide.position.set(.28,.34,0);
  const presenter=box(.36,.035,.035,0,.34,0,dark,feeder);

  // ── Cantra / porta-rocche: i rocchetti di trama accanto al telaio ──
  function strand3D(a,b,r,mat,parent){
    const dir=new THREE.Vector3().subVectors(b,a),len=dir.length();
    const m=add(new THREE.CylinderGeometry(r,r,len,5),mat,parent);
    m.position.copy(a).addScaledVector(dir,.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());
    return m;
  }
  const creel=new THREE.Group();creel.position.set(-5.8,0,2.4);group.add(creel);
  for(const z of [-1.4,1.4])box(.1,2.9,.1,0,1.2,z,steel,creel);
  box(.1,.1,3.0,0,.4,0,steel,creel);
  box(.1,.1,3.0,0,1.9,0,steel,creel);
  box(.07,.07,2.9,.55,1.35,0,steel,creel);
  const creelColors=[0xff5a5a,0xffb13d,0xf7ff6b,0x7fe08a,0x6fc7ff,0xb98cff];
  const creelMats=creelColors.map(c=>material(c,.05,.8));
  for(let i=0;i<6;i++){
    const z=-1.2+i*.48;
    const pirn=add(new THREE.CylinderGeometry(.19,.19,.52,18),creelMats[i],creel);pirn.position.set(0,.68,z);
    box(.05,.62,.05,0,.34,z,steel,creel);
    const eye=add(new THREE.TorusGeometry(.06,.015,5,10),steel,creel);eye.position.set(.55,1.35,z);
    strand3D(new THREE.Vector3(0,.95,z),new THREE.Vector3(.55,1.35,z),.012,creelMats[i],creel);
    strand3D(new THREE.Vector3(.55,1.35,z),new THREE.Vector3(1.3,.7,.2),.012,creelMats[i],creel);
  }

  // ── Pinze: portante (porta la trama) e traente (la riprende) ──
  function gripper(){
    const g=new THREE.Group();
    box(.4,.1,.14,0,0,0,steel,g);
    box(.12,.14,.16,.24,0,0,dark,g);
    box(.06,.05,.05,.34,.02,0,weft,g);
    return g;
  }
  const portante=gripper();portante.position.set(-4.2,.05,2.04);group.add(portante);
  const traente=gripper();traente.position.set(4.2,.05,2.04);group.add(traente);

  // ── Trama in inserimento (un solo segmento ridimensionato) ──
  const weftMesh=add(new THREE.BoxGeometry(1,.045,.045),weft);

  // ── Tessuto: nappato "peloso" sopra il telo in formazione ──
  const cloth=box(7.35,.06,1.75,0,-.07,3.08,fabricMat);
  const HAIRS=1000;
  const hairGeo=new THREE.ConeGeometry(.013,.28,4);disposables.add(hairGeo);
  const hairMat=new THREE.MeshStandardMaterial({color:0xffffe0,roughness:.8,metalness:0,emissive:0x3a4a20});disposables.add(hairMat);
  const hairs=new THREE.InstancedMesh(hairGeo,hairMat,HAIRS);
  {
    const dummy=new THREE.Object3D();
    for(let i=0;i<HAIRS;i++){
      dummy.position.set((Math.random()-.5)*7.2,.1,(Math.random()-.5)*1.6);
      dummy.rotation.set((Math.random()-.5)*.8,Math.random()*Math.PI,(Math.random()-.5)*.8);
      dummy.updateMatrix();hairs.setMatrixAt(i,dummy.matrix);
    }
    hairs.instanceMatrix.needsUpdate=true;
  }
  cloth.add(hairs);

  const lamp=add(new THREE.SphereGeometry(.20,18,14),green);lamp.position.set(4.07,1.33,-1.3);
  const marker=add(new THREE.SphereGeometry(.13,12,8),red);marker.position.set(warps[23].x,.12,-.9);marker.visible=false;
  let running=true,broken=false,phase=0,picks=0,speed=1,progress=.38,stage='APERTURA DEL PASSO';
  function setYarns(shed){
    warps.forEach(({mesh,x,positions,geo},i)=>{
      const sign=i%2===0?1:-1;
      for(let r=0;r<zPoints.length;r++){
        const z=zPoints[r];
        const weight=Math.max(0,Math.min(1,(z+2.4)/1.45))*Math.max(0,Math.min(1,(2.6-z)/1.45));
        const y=-.04+sign*shed*weight;
        for(let side=0;side<ringSides;side++){
          const a=2*Math.PI*side/ringSides,index=(r*ringSides+side)*3;
          positions[index]=x+Math.cos(a)*radius;
          positions[index+1]=y+Math.sin(a)*radius;
          positions[index+2]=z;
        }
      }
      geo.attributes.position.needsUpdate=true;mesh.visible=!(broken&&i===23);
    });
  }
  // La trama parte dal preparatore (x=-4.5) e la pinza attiva la trascina.
  function weftSpan(p,portanteX,traenteX){
    if(p<.20||p>=.96)return null;
    if(p<.46)return [-4.5,portanteX];
    if(p<.56)return [-4.5,lerp(0,.05,win(p,.46,.56))];
    if(p<.78)return [-4.5,traenteX];
    const t=win(p,.78,.90);
    return [lerp(-4.5,-3.9,t),lerp(4.2,3.9,t)];
  }
  function apply(){
    const k=getKinematics(phase);stage=k.stage;
    const p=phase;
    heddles[0].position.y=k.shed;heddles[1].position.y=-k.shed;
    let portanteX,traenteX;
    if(p<.20){portanteX=-4.2;traenteX=4.2;}
    else if(p<.46){portanteX=lerp(-4.2,0,win(p,.20,.46));traenteX=4.2;}
    else if(p<.56){portanteX=0;traenteX=lerp(4.2,.05,win(p,.46,.56));}
    else if(p<.78){portanteX=lerp(0,-4.2,win(p,.56,.78));traenteX=lerp(.05,4.2,win(p,.56,.78));}
    else {portanteX=-4.2;traenteX=4.2;}
    portante.position.x=portanteX;traente.position.x=traenteX;
    presenter.position.x=lerp(0,.3,win(p,.14,.20))*(1-win(p,.30,.42));
    const span=weftSpan(p,portanteX,traenteX);
    if(span){weftMesh.visible=true;weftMesh.scale.x=Math.max(.02,Math.abs(span[1]-span[0]));weftMesh.position.x=(span[0]+span[1])/2;}
    else weftMesh.visible=false;
    reed.position.z=k.reed*.53;
    setYarns(k.shed);
  }
  function update(dt){
    if(!running)return;
    const delta=Math.min(Math.max(dt,0),.05)*.62*speed;
    const previous=phase;phase=(phase+delta)%1;
    if(phase<previous){picks++;warpBeam.rotation.x-=.015;clothBeam.rotation.x+=.018;}
    apply();
  }
  function setProgress(v){progress=THREE.MathUtils.clamp(v,0,1);cloth.scale.z=.34+progress*.66;}
  function breakWarp(){broken=true;running=false;lamp.material=red;marker.visible=true;drops[23].position.y=-.35;apply();}
  function repair(){broken=false;lamp.material=green;marker.visible=false;drops[23].position.y=.12;apply();}
  function start(){if(!broken)running=true;return running;}
  function stop(){running=false;}
  function setSpeed(v){speed=THREE.MathUtils.clamp(v,.25,2);}
  function state(){return {running,broken,phase,picks,speed,stage};}
  function dispose(){for(const d of disposables)d.dispose();}
  apply();setProgress(progress);
  return {group,update,setProgress,breakWarp,repair,start,stop,setSpeed,state,dispose};
}
