# Renders one character of OLYMPUS UNBOUND from a Flare source .blend, the way Flare's own render8dirs.py did:
# the file's orthographic isometric camera and sun, one direction row, every animation frame (D15,
# art/blender/README.md).
#
#   blender -b <source.blend> --python flare_render.py -- <character.py> <out dir> [first-last]
#
# <character.py> runs first and turns the source into the character (see flare_lib.py). Then the old Blender
# Internal materials become Principled BSDF materials in linear colour, Cycles renders each frame with a
# transparent background and a shadow catcher, and the frames land in <out dir> as 0000.png, 0001.png, ... with an
# in-between after every source frame (INBETWEEN=0 leaves them out), plus anchors.json: the top of the head per frame.
import json
import math
import os
import runpy
import shutil
import sys

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index('--') + 1:]
character, out = argv[0], argv[1]
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
settings = runpy.run_path(character)
row = settings.get('ROW', 4)  # Flare's row 4: the right-facing direction the game uses
first, last = (int(x) for x in (argv[2] if len(argv) > 2 else settings.get('FRAMES', '1-32')).split('-'))
sc = bpy.context.scene


def to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


# Old Blender Internal materials (display colours) -> Principled BSDF in linear colour.
for m in bpy.data.materials:
    if m.name.startswith('ShadowCatcher') or m.use_nodes:
        continue
    m.use_nodes = True
    nodes = m.node_tree.nodes
    if m.name.startswith('Invis'):
        # Flare's layer files hide the body with this material: a holdout.
        nodes.clear()
        out_node = nodes.new('ShaderNodeOutputMaterial')
        hold = nodes.new('ShaderNodeHoldout')
        m.node_tree.links.new(hold.outputs[0], out_node.inputs[0])
        continue
    bsdf = nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = tuple(to_linear(c) for c in m.diffuse_color[:3]) + (1,)
    metal = m.specular_intensity >= 0.99
    bsdf.inputs['Roughness'].default_value = 0.3 if metal else 0.6
    bsdf.inputs['Metallic'].default_value = 0.85 if metal else 0.0

sc.render.engine = 'CYCLES'
sc.cycles.samples = int(os.environ.get('SAMPLES', '32'))
sc.cycles.use_denoising = True
sc.render.film_transparent = True
# Render at 4x the sprite size; pack-sheet.mjs halves it down for clean edges (the hero files disagree on size).
sc.render.resolution_x = sc.render.resolution_y = settings.get('RESOLUTION', 512)
sc.render.resolution_percentage = 100
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_mode = 'RGBA'
sc.view_settings.view_transform = 'Standard'
sc.view_settings.look = 'None'
shadow = bpy.data.objects.get('ShadowPlane')
if shadow:
    shadow.hide_render = False
    shadow.is_shadow_catcher = True
lamp = bpy.data.objects.get('Lamp')
if lamp:
    # The converted 2.49 sun has a 90 degree disc, which washes out every shadow; Flare's renders had crisp ones.
    lamp.data.energy = settings.get('SUN', 3.0)
    lamp.data.angle = math.radians(4)
if sc.world is None:
    sc.world = bpy.data.worlds.new('World')
sc.world.use_nodes = True
ambient = settings.get('AMBIENT', 0.08)
sc.world.node_tree.nodes['Background'].inputs['Color'].default_value = (ambient, ambient, ambient, 1)
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'CUDA'
    prefs.get_devices()
    for d in prefs.devices:
        d.use = True
    sc.cycles.device = 'GPU'
except Exception as error:  # CPU rendering gives the same image, only slower
    print('Rendering on the CPU:', error)

platform = bpy.data.objects['RenderPlatform']
platform.rotation_euler.z = -(row + 1) * math.radians(45)  # render8dirs.py turned it -45 degrees per row
os.makedirs(out, exist_ok=True)

# In-between frames (spec: asset-pipeline / character art): after every source frame f comes a pose halfway to the
# next one, so sheet frame 2 * (f - first) is f and the frame after it is the in-between. A loop's last frame
# blends back to the loop's first; the very last frame is repeated. The blend is of the evaluated poses, not a
# subframe, so it also works for the creatures' baked constant-step poses (flare_lib.bake_poses).
loops = {end: start for start, end in settings.get('LOOPS', [(1, 4), (5, 12)])}
inbetween = os.environ.get('INBETWEEN', '1') != '0'
animated = [ob for ob in sc.objects if ob.animation_data and ob.animation_data.action]
camera = sc.camera
head_bone = settings.get('HEAD', 'Head')
head_arm = next((ob for ob in sc.objects if ob.type == 'ARMATURE' and head_bone in ob.pose.bones), None)


def capture(frame):
    sc.frame_set(frame)
    return [(ob, ob.matrix_basis.copy(),
             {pb.name: pb.matrix_basis.copy() for pb in ob.pose.bones} if ob.type == 'ARMATURE' else {})
            for ob in animated]


def blend(a, b, t):
    """Decomposed lerp of two local transforms (slerp for the rotation)."""
    la, ra, sa = a.decompose()
    lb, rb, sb = b.decompose()
    return Matrix.LocRotScale(la.lerp(lb, t), ra.slerp(rb, t), sa.lerp(sb, t))


def head_anchor():
    """Top of the head in the frame, 0..1 from the top left (the packer only scales frames, so it carries over)."""
    if head_arm is None or camera is None:
        return None
    bpy.context.view_layer.update()
    pb = head_arm.pose.bones[head_bone]
    top = head_arm.matrix_world @ pb.matrix @ Vector((0, pb.bone.length, 0))
    p = world_to_camera_view(sc, camera, top)
    return [round(p.x, 4), round(1 - p.y, 4)]


def render(index):
    sc.render.filepath = os.path.join(out, f'{index:04d}.png')
    bpy.ops.render.render(write_still=True)


anchors = []
for frame in range(first, last + 1):
    index = (frame - first) * (2 if inbetween else 1)
    sc.frame_set(frame)
    render(index)
    anchors.append(head_anchor())
    if not inbetween:
        continue
    if frame == last and frame not in loops:
        shutil.copyfile(os.path.join(out, f'{index:04d}.png'), os.path.join(out, f'{index + 1:04d}.png'))
        anchors.append(anchors[-1])
        continue
    here, there = capture(frame), capture(loops.get(frame, frame + 1))
    actions = [ob.animation_data.action for ob in animated]
    for ob in animated:
        ob.animation_data.action = None
    for (ob, m0, bones0), (_, m1, bones1) in zip(here, there):
        ob.matrix_basis = blend(m0, m1, 0.5)
        for name, b0 in bones0.items():
            ob.pose.bones[name].matrix_basis = blend(b0, bones1[name], 0.5)
    render(index + 1)
    anchors.append(head_anchor())
    for ob, action in zip(animated, actions):
        ob.animation_data.action = action
with open(os.path.join(out, 'anchors.json'), 'w') as f:
    json.dump(anchors, f)
print('RENDERED', first, last)
