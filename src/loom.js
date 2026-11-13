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

// Static GLB frame from /public/models/loom-frame.glb; dynamic assemblies here.
// This is an educational stylisation, not real machine timing or a safety simulation.
export function createLoom(){
  const group=new THREE.Group(),disposables=new Set();
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
  const left=box(2.35,.1,.15,-3.1,.025,1.98,steel),right=box(2.35,.1,.15,3.1,.025,1.98,steel);
  box(.26,.22,.23,1.1,0,0,dark,left); // head at the inward end
  box(.26,.22,.23,-1.1,0,0,dark,right);
  const inserted=box(7.22,.052,.052,0,.05,2.04,weft);
  const cloth=box(7.35,.06,1.75,0,-.07,3.08,fabricMat);
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
  function apply(){
    const k=getKinematics(phase);stage=k.stage;
    heddles[0].position.y=k.shed;heddles[1].position.y=-k.shed;
    left.position.x=-3.1+k.reach*2.05;right.position.x=3.1-k.reach*2.05;
    inserted.visible=k.weftVisible;inserted.scale.x=Math.max(.018,k.weftLength);inserted.position.x=-3.61+7.22*k.weftLength/2;
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
