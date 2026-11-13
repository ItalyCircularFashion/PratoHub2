import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { createFabric } from './fabric.js';
import { createLoom } from './loom.js';
import { loadLoomFrame } from './asset-loader.js';
import { HeroFilm } from './hero-film.js';
import { createHeroSequence } from './hero-sequence.js';

gsap.registerPlugin(ScrollTrigger);
const $=s=>document.querySelector(s);
const host=$('#weave3d'),heroVisual=$('.visual'),machineViewport=$('#machine-viewport');
const prefersReduced=()=>false;
const captions=[
 'La filiera inizia dalla selezione e preparazione delle fibre.',
 'Le fibre vengono trasformate in filati attraverso i processi di filatura.',
 'Ordito e trama si incontrano per costruire la struttura del tessuto.',
 'I trattamenti finali definiscono aspetto, mano e prestazioni del tessuto.'
];
const phases=[.08,.24,.70,1];
const cameraStops={
 overview:{position:[10,7,14],look:[0,-.3,0]},
 warp:{position:[5,3.2,-8.4],look:[0,-.6,-3.8]},
 shed:{position:[5,3.3,-1.5],look:[0,0,-.7]},
 insertion:{position:[5.3,3.7,5.3],look:[0,.05,1.95]},
 cloth:{position:[3.1,5.8,7.9],look:[0,-.1,3.0]},
 fabric:{position:[0,7.5,12.8],look:[0,0,0]}
};
let renderer,scene,camera,fabric,loom,heroSeq;
let raf=0,observer,motionContext=null,cameraTween=null;
let activeMode='fabric',inWorkbench=false,targetProgress=.38,displayProgress=.38;
let lastFrame=0,lastPicks=-1,lastStage="",lastStatusAt=0,isVisible=true,isAlive=true,heroFilm=null,lastPhase="";
const lookAt={x:0,y:0,z:0};
const gaze={x:0,y:0,tx:0,ty:0};
function render(){
 if(!renderer||!scene||!camera)return;
 const px=camera.position.x,py=camera.position.y;
 camera.position.x+=gaze.x*.45;camera.position.y+=gaze.y*.3;
 renderer.render(scene,camera);
 camera.position.x=px;camera.position.y=py;
}
function updateCamera(){camera?.lookAt(lookAt.x,lookAt.y,lookAt.z);render();}
function flyTo(name){
 if(!camera)return;
 const stop=cameraStops[name]||cameraStops.overview;
 cameraTween?.kill();
 if(prefersReduced()){
  camera.position.set(...stop.position);[lookAt.x,lookAt.y,lookAt.z]=stop.look;updateCamera();return;
 }
 cameraTween=gsap.timeline({onUpdate:updateCamera})
  .to(camera.position,{x:stop.position[0],y:stop.position[1],z:stop.position[2],duration:1.35,ease:'power3.inOut'},0)
  .to(lookAt,{x:stop.look[0],y:stop.look[1],z:stop.look[2],duration:1.35,ease:'power3.inOut'},0);
}
function status(){
 if(!loom)return;
 const state=loom.state();
 const s=state.broken?'ARRESTO PER ROTTURA ORDITO':state.running?'IN MARCIA':'FERMO — AVVIO MANUALE';
 $('#loom-status').textContent=`${s} · ${state.stage} · Trame simulate: ${state.picks}`;
}
function frame(now){
 raf=0;if(!isAlive||!renderer||document.hidden||!isVisible||prefersReduced())return;
 gaze.x+=(gaze.tx-gaze.x)*.06;gaze.y+=(gaze.ty-gaze.y)*.06;
 const dt=Math.min(.05,Math.max(0,(now-lastFrame)/1000||0));lastFrame=now;
 if(Math.abs(displayProgress-targetProgress)>.0004){
  displayProgress=THREE.MathUtils.lerp(displayProgress,targetProgress,.14);
  fabric.setProgress(displayProgress);loom.setProgress(displayProgress);
 }
 if(activeMode==='loom'){
  loom.update(dt);
  const machine=loom.state();if(machine.picks!==lastPicks||machine.stage!==lastStage&&now-lastStatusAt>175){lastPicks=machine.picks;lastStage=machine.stage;lastStatusAt=now;status();}
 }else if(!inWorkbench&&heroSeq){heroSeq.update(dt);}
 if(heroSeq&&!inWorkbench&&activeMode==='fabric'&&heroSeq.phase!==lastPhase){lastPhase=heroSeq.phase;const el=$('#visual-phase');if(el)el.textContent=heroSeq.phase;}
 render();schedule();
}
function schedule(){if(!raf&&renderer&&isVisible&&!document.hidden&&!prefersReduced()&&isAlive){lastFrame=performance.now();raf=requestAnimationFrame(frame);}}
function stop(){if(raf)cancelAnimationFrame(raf);raf=0;render();}
function resize(){
 if(!renderer||!camera)return;
 const width=host.clientWidth,height=host.clientHeight;
 if(width<2||height<2)return;
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.25));
 renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();render();
}
function fallbackFrame(){
 const g=new THREE.Group();const m=new THREE.MeshStandardMaterial({color:0x728d83,metalness:.65,roughness:.42});
 for(const x of [-4.2,4.2]){
  const geo=new THREE.BoxGeometry(.28,2.7,9.4),v=new THREE.Mesh(geo,m);v.position.set(x,-.55,0);g.add(v);
 }
 for(const y of [-1.6,.58]){
  const v=new THREE.Mesh(new THREE.BoxGeometry(8.7,.18,.22),m);v.position.set(0,y,-4.2);g.add(v);
 }
 g.userData.localFallback=true;return g;
}
function initialise3D(){
 try{
  renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.45;
  renderer.domElement.setAttribute('aria-hidden','true');host.append(renderer.domElement);
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(42,1,.1,100);
  camera.position.set(...cameraStops.fabric.position);
  scene.add(new THREE.HemisphereLight(0xedffe4,0x1d281e,3.1));
  const key=new THREE.DirectionalLight(0xf1ffbc,4.1);key.position.set(5,8,7);scene.add(key);
  const rim=new THREE.DirectionalLight(0x8fc8b0,2.1);rim.position.set(-6,3,-6);scene.add(rim);
  fabric=createFabric();fabric.group.rotation.set(-.12,-.28,0);scene.add(fabric.group);fabric.group.visible=false;
  loom=createLoom();loom.group.visible=false;scene.add(loom.group);
  heroSeq=createHeroSequence();heroSeq.group.visible=true;scene.add(heroSeq.group);
  heroVisual.classList.add('webgl-ready');
  $('#asset-status').textContent='Modello 3D: caricamento…';
  loadLoomFrame({onReady:frameGroup=>{
    if(!isAlive)return;
    loom.group.add(frameGroup);$('#asset-status').textContent='Modello 3D caricato · cinematismi Three.js';render();
  },onError:error=>{
    console.warn('Asset GLB non disponibile: attivo fallback',error);
    loom.group.add(fallbackFrame());$('#asset-status').textContent='Modello 3D non caricato · geometria di emergenza';render();
  }});
  renderer.domElement.addEventListener('webglcontextlost',event=>{
   event.preventDefault();stop();heroVisual.classList.add('webgl-failed');heroVisual.classList.add('show-fallback');$('#asset-status').textContent='WebGL non disponibile: utilizzare la vista alternativa';
  });
  observer=new ResizeObserver(resize);observer.observe(host);
  const visibility=new IntersectionObserver(entries=>{isVisible=entries[0].isIntersecting;if(isVisible){resize();schedule();}else stop();},{threshold:0.01});
  visibility.observe(host);host._viewObserver=visibility;
  resize();schedule();
 }catch(error){
  console.warn('WebGL fallback:',error);heroVisual.classList.add('webgl-failed','show-fallback');host.hidden=true;
  $('#asset-status').textContent='WebGL non supportato: contenuti testuali accessibili';
 }
}
function activateWorkbench(mode){
 if(!renderer){$('#asset-status').textContent='WebGL non disponibile in questo browser';return;}
 if(!inWorkbench){machineViewport.insertBefore(host,machineViewport.firstChild);inWorkbench=true;machineViewport.classList.add('live');heroVisual.classList.add('show-fallback');$('#restore-hero').hidden=false;}
 setMode(mode);resize();schedule();
}
function setMode(mode){
 if(!fabric||!loom)return;
 activeMode=mode;fabric.group.visible=mode==='fabric'&&inWorkbench;loom.group.visible=mode==='loom';
 if(heroSeq)heroSeq.group.visible=mode==='fabric'&&!inWorkbench;
 $('#mode-fabric').setAttribute('aria-pressed',String(mode==='fabric'));
 $('#mode-loom').setAttribute('aria-pressed',String(mode==='loom'));
 flyTo(mode==='fabric'?'fabric':'overview');
 status();render();schedule();
}
function restoreHero(){
 if(!renderer)return;
 heroVisual.insertBefore(host,heroVisual.firstChild);inWorkbench=false;machineViewport.classList.remove('live');heroVisual.classList.remove('show-fallback');$('#restore-hero').hidden=true;
 setMode('fabric');resize();schedule();
}
function applyProgress(value){
 targetProgress=THREE.MathUtils.clamp(value,0,1);
 $('#fabric-progress').value=String(Math.round(targetProgress*100));
 $('#fabric-value').textContent=`${Math.round(targetProgress*100)}%`;
 if(prefersReduced()){displayProgress=targetProgress;fabric?.setProgress(displayProgress);loom?.setProgress(displayProgress);render();}else schedule();
}
function setStep(i){
 document.querySelectorAll('.step').forEach((b,j)=>{b.classList.toggle('active',i===j);b.setAttribute('aria-pressed',String(i===j));});
 $('#step-number').textContent=`FASE 0${i+1}`;
 $('#step-description').textContent=captions[i];
 applyProgress(phases[i]);activateWorkbench('fabric');
}
function setupMotion(){
 motionContext?.revert();motionContext=null;
 if(prefersReduced())return;
 motionContext=gsap.context(()=>{
  gsap.utils.toArray('.section').forEach(section=>{
   gsap.from(section.querySelectorAll('h2,.eyebrow'),{opacity:0,y:24,stagger:.08,duration:.7,ease:'power2.out',scrollTrigger:{trigger:section,start:'top 86%',once:true}});
  });
  ScrollTrigger.create({trigger:'.hero',start:'top top',end:'bottom top',scrub:true,onUpdate:self=>{
   if(!inWorkbench&&activeMode==='fabric'&&!prefersReduced()&&camera){
    camera.position.z=12.8-self.progress*2.4;
    if(heroSeq)heroSeq.group.rotation.y=-.28+self.progress*.56;
    updateCamera();
   }
  }});
 });
}
function syncMotion(){
 cameraTween?.kill();setupMotion();schedule();ScrollTrigger.refresh();
}

initialise3D();
document.querySelectorAll('.step').forEach((button,i)=>button.addEventListener('click',()=>setStep(i)));
$('#fabric-progress').addEventListener('input',event=>{activateWorkbench('fabric');applyProgress(Number(event.target.value)/100);});
$('#mode-fabric').addEventListener('click',()=>activateWorkbench('fabric'));
$('#mode-loom').addEventListener('click',()=>activateWorkbench('loom'));
$('#restore-hero').addEventListener('click',restoreHero);
document.querySelectorAll('[data-camera]').forEach(button=>button.addEventListener('click',()=>{
 activateWorkbench('loom');
 document.querySelectorAll('[data-camera]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
 flyTo(button.dataset.camera);
}));
$('#structure-plain').addEventListener('click',()=>{activateWorkbench('fabric');fabric?.setStructure('plain');$('#structure-plain').setAttribute('aria-pressed','true');$('#structure-twill').setAttribute('aria-pressed','false');render()});
$('#structure-twill').addEventListener('click',()=>{activateWorkbench('fabric');fabric?.setStructure('twill');$('#structure-plain').setAttribute('aria-pressed','false');$('#structure-twill').setAttribute('aria-pressed','true');render()});
$('#loom-break').addEventListener('click',()=>{activateWorkbench('loom');loom?.breakWarp();status();render()});
$('#loom-repair').addEventListener('click',()=>{activateWorkbench('loom');loom?.repair();status();render()});
$('#loom-start').addEventListener('click',()=>{activateWorkbench('loom');loom?.start();status();schedule();render()});
$('#loom-stop').addEventListener('click',()=>{activateWorkbench('loom');loom?.stop();status();render()});
$('#loom-speed').addEventListener('input',event=>{
 loom?.setSpeed(Number(event.target.value));$('#loom-speed-value').textContent=Number(event.target.value).toFixed(2)+'×';
});
document.addEventListener('visibilitychange',()=>document.hidden?stop():schedule());
window.addEventListener('pointermove',event=>{
 gaze.tx=(event.clientX/window.innerWidth-.5)*2;
 gaze.ty=-(event.clientY/window.innerHeight-.5)*2;
},{passive:true});
document.addEventListener('pointerleave',()=>{gaze.tx=0;gaze.ty=0;});
window.addEventListener('pagehide',()=>{
 isAlive=false;stop();observer?.disconnect();host._viewObserver?.disconnect();cameraTween?.kill();motionContext?.revert();
 fabric?.dispose();loom?.dispose();heroSeq?.dispose();renderer?.dispose();
},{once:true});
syncMotion();status();
// Sicurezza: la hero deve restare leggibile anche se le animazioni di ingresso
// non completano (compositor rallentato). Forza lo stato finale dopo 1.6s.
setTimeout(()=>{
 document.querySelectorAll('.hero, .hero [data-aos]').forEach(el=>{
  el.classList.add('aos-animate');el.style.transition='none';el.style.opacity='1';el.style.transform='none';
 });
},1600);
