"""Run in Blender: blender -b -P blender/generate_weave.py -- --output public/models/weave.glb
Requires Blender 4.x. Source asset generator; Blender not required to run the website.
"""
import bpy,math,sys
from pathlib import Path
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for axis in range(2):
 for i in range(15):
  curve=bpy.data.curves.new(f'YarnCurve_{axis}_{i}','CURVE');curve.dimensions='3D';curve.bevel_depth=.048;curve.bevel_resolution=3
  spline=curve.splines.new('POLY');spline.points.add(64)
  for j,p in enumerate(spline.points):
   coord=-2.8+j/64*5.6;fixed=-2.8+i*.4
   xyz=(coord,.095*math.cos((coord/.4+i)*math.pi),fixed) if axis==0 else (fixed,.095*math.sin((coord/.4+i)*math.pi),coord)
   p.co=(*xyz,1)
  obj=bpy.data.objects.new(f'{"Warp" if axis==0 else "Weft"}_{i:02}',curve);bpy.context.collection.objects.link(obj)
  mat=bpy.data.materials.get(f'YarnMaterial_{axis}') or bpy.data.materials.new(f'YarnMaterial_{axis}');mat.diffuse_color=(.71,1,.17,1) if axis==0 else (.78,.85,.72,1);obj.data.materials.append(mat)
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
out=args[args.index('--output')+1] if '--output' in args else 'public/models/weave.glb'
Path(out).parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(Path(out).resolve()),export_format='GLB')
bpy.ops.wm.save_as_mainfile(filepath=str(Path('blender/weave.blend').resolve()))
