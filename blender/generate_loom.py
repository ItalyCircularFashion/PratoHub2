"""Blender 4.x authoring source for unified project static loom frame.
Run from project root: blender -b --python blender/generate_loom.py
Blender uses Z-up: the helper maps glTF/Three axis (x,y,z) -> Blender (x,-z,y).
Do not include moving parts in this asset: they are animated by Three.js.
"""
import bpy, math, os
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)

def xyz(pos):
 x,y,z=pos;return (x,-z,y)

def material(name,color,metallic=.35):
 mat=bpy.data.materials.new(name);mat.diffuse_color=(*color,1);mat.use_nodes=True
 bsdf=mat.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=(*color,1);bsdf.inputs['Metallic'].default_value=metallic;bsdf.inputs['Roughness'].default_value=.4
 return mat
steel=material('SATIN_STEEL',(0.19,.34,.30),.67);rail=material('SUPPORTS',(.49,.58,.52),.67);dark=material('HOUSING',(.05,.11,.09),.4);bronze=material('BEARINGS',(.57,.37,.14),.55)

def box(name,size,pos,mat):
 bpy.ops.mesh.primitive_cube_add(size=1,location=xyz(pos));o=bpy.context.object;o.name=name
 o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)

def drum(name,radius,length,pos,mat):
 bpy.ops.mesh.primitive_cylinder_add(vertices=28,radius=radius,depth=length,location=xyz(pos));o=bpy.context.object;o.name=name
 # Blender cylinder axis Z -> Blender machine X
 o.rotation_euler[1]=math.pi/2;o.data.materials.append(mat)

for side,x in [('L',-4.22),('R',4.22)]:
 box(f'{side}_MAIN_COLUMN',(.26,2.75,9.15),(x,-.55,0),steel)
 box(f'{side}_BASE_RAIL',(.38,.22,9.3),(x,-1.82,0),dark)
 box(f'{side}_TOP_ARM',(.42,.17,3.0),(x,.81,-2.65),rail)
 box(f'{side}_SIDE_PILLAR',(.25,1.9,.25),(x,-.35,3.55),rail)
 drum(f'{side}_WARP_BEARING',.79,.25,(x*.93,-.62,-4.08),bronze)
 drum(f'{side}_CLOTH_BEARING',.57,.25,(x*.93,-1.10,4.06),bronze)
for z in (-4.43,-1.38,3.94):box(f'CROSS_RAIL_{z}',(8.66,.15,.19),(0,-1.68,z),rail)
for x in (-4.05,4.05):box(f'HOUSING_{x}',(.34,.85,1.27),(x,-.95,2.5),dark)
root=os.path.abspath(os.path.join(os.path.dirname(__file__),'..'))
out=os.path.join(root,'public','models','loom-frame.glb')
bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',export_yup=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(root,'blender','loom-frame.blend'))
print('Exported',out)
