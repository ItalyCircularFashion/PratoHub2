import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// GLB is included with the release; the runtime does not depend on Blender being installed.
export function loadLoomFrame({onReady,onError}) {
  const loader=new GLTFLoader();
  return loader.load(`${import.meta.env.BASE_URL}models/loom-frame.glb`,gltf=>{
    gltf.scene.name='LOOM_FRAME_GLB';
    gltf.scene.traverse(node=>{if(node.isMesh){node.castShadow=false;node.receiveShadow=true;}});
    onReady(gltf.scene);
  },undefined,onError);
}
