"""Optional build helper; not Blender. Generate a small glTF-compatible static frame.
Requires: pip install trimesh. Three.js expects X=width, Y=up, Z=machine depth.
"""
import os
import numpy as np
import trimesh
from trimesh.transformations import rotation_matrix

scene=trimesh.Scene()
COLORS={'steel':[91,133,122,255],'rail':[161,179,164,255],'dark':[34,56,49,255],'bronze':[197,151,89,255]}

def part(name,dimensions,location,color='steel'):
 mesh=trimesh.creation.box(extents=dimensions)
 mesh.apply_translation(location)
 mesh.visual.vertex_colors=np.array(COLORS[color],dtype=np.uint8)
 scene.add_geometry(mesh,geom_name=name,node_name=name)

def drum(name,radius,length,location,color='dark'):
 mesh=trimesh.creation.cylinder(radius=radius,height=length,sections=28)
 mesh.apply_transform(rotation_matrix(np.pi/2,[0,1,0]))
 mesh.apply_translation(location)
 mesh.visual.vertex_colors=np.array(COLORS[color],dtype=np.uint8)
 scene.add_geometry(mesh,geom_name=name,node_name=name)

# Structure only, moving beams, threads, heddle frames, and reed are Three.js objects.
for side,x in [('L',-4.22),('R',4.22)]:
 part(f'{side}_MAIN_COLUMN',[.26,2.75,9.15],[x,-.55,0]);
 part(f'{side}_BASE_RAIL',[.38,.22,9.3],[x,-1.82,0],'dark')
 part(f'{side}_TOP_ARM',[.42,.17,3.0],[x,.81,-2.65],'rail')
 part(f'{side}_SIDE_PILLAR',[.25,1.9,.25],[x,-.35,3.55],'rail')
 drum(f'{side}_WARP_BEARING',.79,.25,[x*.93,-.62,-4.08],'bronze')
 drum(f'{side}_CLOTH_BEARING',.57,.25,[x*.93,-1.10,4.06],'bronze')
for z in (-4.43,-1.38,3.94):
 part(f'CROSS_RAIL_{z}',[8.66,.15,.19],[0,-1.68,z],'rail')
for x in (-4.05,4.05):
 part(f'HOUSING_{x}',[.34,.85,1.27],[x,-.95,2.5],'dark')

out='public/models/loom-frame.glb'
os.makedirs(os.path.dirname(out),exist_ok=True)
with open(out,'wb') as f: f.write(scene.export(file_type='glb'))
print('GLB exported:',out,os.path.getsize(out),'bytes',len(scene.geometry),'parts')
