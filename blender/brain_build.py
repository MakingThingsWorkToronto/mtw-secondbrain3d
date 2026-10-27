"""An original low-poly brain for the Second Brains scene.

Builds a brain-like volume from primitives (two hemispheres with a midline
fissure, gyral displacement, a cerebellum and a short stem), decimates it to a
readable polygon shell, and exports assets/brain.glb. The web page draws the
wireframe, the vertex nodes and the region lighting itself, so the export is
geometry only. Deterministic (seeded). Object names: Brain, Cerebellum, Stem.

Run from the repository root:
  "C:/Program Files/Blender Foundation/Blender 5.2/blender.exe" -b --factory-startup \
     -P samples/work-field/blender/brain_build.py -- C:/Code/MTWWebsite/samples/work-field/assets
"""
import bpy, bmesh, math, os, sys, random
from mathutils import Vector, noise

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
outdir = argv[0] if argv else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets")
os.makedirs(outdir, exist_ok=True)
random.seed(11)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def displace_brain(obj):
    me = obj.data
    bm = bmesh.new()
    bm.from_mesh(me)
    for v in bm.verts:
        p = v.co.copy()
        # midline fissure on the top and front
        fissure = math.exp(-(p.x * p.x) / 0.05) * max(0.0, p.z + 0.1) * 0.26
        # gyri: layered noise pushed along the normal
        n1 = noise.noise(p * 2.6) * 0.075
        n2 = noise.noise(p * 5.2 + Vector((3.1, 1.7, 0.4))) * 0.035
        n = v.normal.copy()
        v.co = p + n * (n1 + n2) - Vector((0, 0, 1)) * fissure
        # flatten the underside a little
        if v.co.z < -0.55:
            v.co.z = -0.55 - (v.co.z + 0.55) * 0.35
    bm.to_mesh(me)
    bm.free()


# cerebrum
bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=40, radius=1.0)
brain = bpy.context.object
brain.name = "Brain"
brain.scale = (1.02, 0.86, 1.32)
bpy.ops.object.transform_apply(scale=True)
displace_brain(brain)
brain.rotation_euler = (0, 0, 0)

# cerebellum: a smaller lobed sphere at the lower back
bpy.ops.mesh.primitive_uv_sphere_add(segments=40, ring_count=24, radius=0.46, location=(0, -0.62, -0.78))
cere = bpy.context.object
cere.name = "Cerebellum"
cere.scale = (1.05, 0.62, 0.85)
bpy.ops.object.transform_apply(scale=True)
me = cere.data
bm = bmesh.new(); bm.from_mesh(me)
for v in bm.verts:
    v.co = v.co + v.normal * noise.noise(v.co * 7.0) * 0.03
bm.to_mesh(me); bm.free()

# stem
bpy.ops.mesh.primitive_cylinder_add(vertices=18, radius=0.17, depth=0.75, location=(0, -0.3, -0.9))
stem = bpy.context.object
stem.name = "Stem"
stem.rotation_euler = (math.radians(-22), 0, 0)
bpy.ops.object.transform_apply(rotation=True)

# decimate the cerebrum to a readable polygon shell
for obj, ratio in ((brain, 0.16), (cere, 0.35)):
    bpy.context.view_layer.objects.active = obj
    mod = obj.modifiers.new("Decimate", "DECIMATE")
    mod.ratio = ratio
    bpy.ops.object.modifier_apply(modifier="Decimate")
    obj.data.calc_loop_triangles()

for obj in (brain, cere, stem):
    obj.select_set(True)

path = os.path.join(outdir, "brain.glb")
bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_apply=True,
                          export_yup=True, export_materials="NONE", export_normals=True, export_texcoords=False)
print("exported", path, "faces:", len(brain.data.polygons), len(cere.data.polygons), len(stem.data.polygons))
