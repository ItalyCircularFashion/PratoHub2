import * as THREE from 'three';
import { createStudioLoom } from './loom-studio.js';

// Vista "da vetrina": renderer dedicato con scena, luci e fondale dello stile scelto.
// Usata per l'hero (stilistico realistico) e per la nuova sezione (stilizzato).
export function createStudioView(host,{style='stylized',camera=[3.4,2.3,4.6],look=[0,1.15,0]}={}){
  if(!host)return null;
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-hidden','true');
  host.appendChild(renderer.domElement);
  const scene=new THREE.Scene();
  const loom=createStudioLoom({style});
  scene.background=new THREE.Color(loom.background);
  scene.add(loom.group);
  const cam=new THREE.PerspectiveCamera(42,1,.1,100);
  const basePos=[...camera];
  cam.position.set(...camera);cam.lookAt(...look);
  renderer.toneMappingExposure=loom.exposure;

  let raf=0,last=performance.now(),visible=true,alive=true;
  function resize(){
    const w=host.clientWidth,h=host.clientHeight;if(w<2||h<2)return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
    renderer.setSize(w,h,false);
    const aspect=w/h;cam.aspect=aspect;cam.updateProjectionMatrix();
    // Inquadratura: allargo il raggio quando il riquadro si stringe, per non tagliare il telaio.
    const k=Math.max(1,1.12/Math.max(aspect,.6));
    cam.position.set(basePos[0]*k,basePos[1]*k,basePos[2]*k);
  }
  function tick(now){
    raf=0;if(!alive||document.hidden||!visible)return;
    const dt=Math.min(.05,Math.max(0,(now-last)/1000||0));last=now;
    loom.update(dt);renderer.render(scene,cam);
    raf=requestAnimationFrame(tick);
  }
  function schedule(){if(!raf&&visible&&!document.hidden&&alive){last=performance.now();raf=requestAnimationFrame(tick);}}
  function stop(){if(raf)cancelAnimationFrame(raf);raf=0;}
  const ro=new ResizeObserver(()=>{resize();schedule();});ro.observe(host);
  const io=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){resize();schedule();}else stop();},{threshold:.01});
  io.observe(host);
  resize();schedule();
  return {renderer,loom,dispose(){alive=false;stop();ro.disconnect();io.disconnect();loom.dispose();renderer.dispose();}};
}
