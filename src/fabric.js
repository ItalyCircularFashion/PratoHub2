import * as THREE from 'three';

// Technical weave in 3D: warp runs along Z, weft along X.
// Crossing order is actual 1/1 plain or 2/2 twill topology (simplified pitch/geometry).
import { crossingAbove } from './kinematics.js';
export { crossingAbove } from './kinematics.js';
export function createFabric({warpCount=28,pickCount=36}={}) {
  const group = new THREE.Group();
  const width=7.65, depth=7.7, dx=width/(warpCount-1), dz=depth/(pickCount-1);
  const yarnRadius=.050, lift=.105, radial=6;
  const ownedMaterials=[
    new THREE.MeshStandardMaterial({color:0xd9fd85,roughness:.91}),
    new THREE.MeshStandardMaterial({color:0xbfd797,roughness:.92}),
    new THREE.MeshStandardMaterial({color:0xe6dbc2,roughness:.93}),
    new THREE.MeshStandardMaterial({color:0xc3bca8,roughness:.9})
  ];
  const yarns=[];let warps=[],wefts=[],structure='plain',progress=.38;
  const shuttle = new THREE.Mesh(new THREE.CapsuleGeometry(.09,.34,3,7), new THREE.MeshStandardMaterial({color:0xeaad72,metalness:.18,roughness:.42}));
  shuttle.rotation.z=Math.PI/2;group.add(shuttle);
  const reed=new THREE.Mesh(new THREE.BoxGeometry(width+.25,.09,.095), new THREE.MeshStandardMaterial({color:0x819f96,metalness:.7,roughness:.35}));group.add(reed);
  function strand(points,material){
    const curve=new THREE.CatmullRomCurve3(points,false,'centripetal');
    const subdivisions=(points.length-1)*4;
    const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,subdivisions,yarnRadius,radial,false),material);
    group.add(mesh);yarns.push(mesh);return mesh;
  }
  function build(next){
    for(const m of yarns){group.remove(m);m.geometry.dispose()} yarns.length=0;warps=[];wefts=[];structure=next;
    for(let x=0;x<warpCount;x++){
      const points=[];
      for(let z=0;z<pickCount;z++){
        const px=-width/2+x*dx, pz=-depth/2+z*dz;
        points.push(new THREE.Vector3(px,crossingAbove(x,z,structure)?lift:-lift,pz));
        if(z<pickCount-1)points.push(new THREE.Vector3(px,0,pz+dz*.5));
      }
      warps.push(strand(points,ownedMaterials[x%2]));
    }
    for(let z=0;z<pickCount;z++){
      const points=[];
      for(let x=0;x<warpCount;x++){
        const px=-width/2+x*dx,pz=-depth/2+z*dz;
        points.push(new THREE.Vector3(px,crossingAbove(x,z,structure)?-lift:lift,pz));
        if(x<warpCount-1)points.push(new THREE.Vector3(px+dx*.5,0,pz));
      }
      wefts.push(strand(points,ownedMaterials[2+z%2]));
    }
    setProgress(progress);
  }
  function setProgress(value){
    progress=THREE.MathUtils.clamp(value,0,1);
    const full=Math.floor(progress*pickCount), fraction=progress*pickCount-full;
    wefts.forEach((mesh,z)=>{
      mesh.visible=z<=full && z<pickCount;
      const count=mesh.geometry.index?.count ?? 0;
      // Indexed triangles: reveal the active pick along X rather than snapping in as a whole row.
      mesh.geometry.setDrawRange(0,z<full ? count : z===full ? Math.floor(fraction*(count/3))*3 : 0);
    });
    const z=Math.min(pickCount-1,full);
    shuttle.visible=progress>0&&progress<1;
    shuttle.position.set(-width/2+Math.min(1,fraction)*width,.25,-depth/2+z*dz);
    reed.position.set(0,.14,-depth/2+z*dz+.20);
  }
  function setStructure(value){if(value!=='plain'&&value!=='twill')return; if(structure!==value)build(value)}
  build('plain');
  function dispose(){for(const m of yarns)m.geometry.dispose();for(const m of ownedMaterials)m.dispose();shuttle.geometry.dispose();shuttle.material.dispose();reed.geometry.dispose();reed.material.dispose();}
  return {group,setProgress,setStructure,getStructure:()=>structure,dispose};
}
