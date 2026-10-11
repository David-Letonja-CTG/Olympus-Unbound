# Renders one character of OLYMPUS UNBOUND from a Flare source .blend, the way Flare's own render8dirs.py did:
# the file's orthographic isometric camera and sun, one direction row, every animation frame (D15,
# art/blender/README.md).
#
#   blender -b <source.blend> --python flare_render.py -- <character.py> <out dir> [first-last]
#
# <character.py> runs first and turns the source into the character (see flare_lib.py). Then the old Blender
# Internal materials become Principled BSDF materials in linear colour, Cycles renders each frame with a
# transparent background and a shadow catcher, and the frames land in <out dir> as 0001.png, 0002.png, ...
import math
import os
import runpy
import sys

import bpy

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
for frame in range(first, last + 1):
    sc.frame_set(frame)
    sc.render.filepath = os.path.join(out, f'{frame:04d}.png')
    bpy.ops.render.render(write_still=True)
print('RENDERED', first, last)
