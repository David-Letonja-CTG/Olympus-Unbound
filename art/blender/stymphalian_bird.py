# Stymphalian Bird: modelled here from primitives (no Flare model exists), lit and framed by the hero file's
# camera, sun and platform so it matches the cast. Bronze-feathered, bronze-beaked, ember-eyed; frames 1-8 are
# one wingbeat (idle and flight), 9-14 a tumbling death.
#   source: isometric_hero_heroine_blend/isometric_hero_blender/clothes.blend (scene only)
from math import pi, sin

from mathutils import Vector

from flare_lib import *

FRAMES = '1-14'
for name in ('HumanMale', 'MaleHead1', 'MaleArm'):
    ob = D.objects.get(name)
    if ob:
        D.objects.remove(ob)

platform = D.objects['RenderPlatform']
bronze = material('Bronze', (0.62, 0.42, 0.2), metal=True)
plumage = material('BronzePlumage', (0.36, 0.25, 0.15), metal=True)
dark = material('DarkPlumage', (0.16, 0.12, 0.1))
ember = glow('EmberEyes', (1.0, 0.36, 0.1), 3.0)

root = D.objects.new('Bird', None)
scene_collection().objects.link(root)
root.parent = platform
Z = 1.0  # flying height of the body centre


def part(ob, parent=root):
    bpy.context.view_layer.update()  # a new object's matrix_world is stale until the scene updates
    world = ob.matrix_world.copy()
    ob.parent = parent
    ob.matrix_parent_inverse = parent.matrix_world.inverted()
    ob.matrix_world = world
    return ob


bpy.context.view_layer.update()
part(add('uv_sphere', 'Body', plumage, (0, 0, Z), (0.15, 0.3, 0.14), segments=16, ring_count=10, radius=1,
         smooth=True))
part(add('uv_sphere', 'Head', plumage, (0, -0.3, Z + 0.1), (0.085, 0.1, 0.085), segments=12, ring_count=8,
         radius=1, smooth=True))
part(add('cone', 'Beak', bronze, (0, -0.47, Z + 0.08), (0.035, 0.035, 0.11), (-pi / 2 - 0.15, 0, 0),
         vertices=8, radius1=1, radius2=0, depth=2, smooth=True))
for s in (-1, 1):
    part(add('uv_sphere', f'Eye.{s}', ember, (0.06 * s, -0.36, Z + 0.13), (0.018, 0.018, 0.018),
             segments=8, ring_count=6, radius=1))
    part(add('cylinder', f'Leg.{s}', dark, (0.06 * s, 0.05, Z - 0.17), (0.012, 0.012, 0.08),
             vertices=6, radius=1, depth=2))
for i, a in enumerate((-0.35, 0.0, 0.35)):
    part(feather(f'Tail.{i}', bronze, (0, 0.25, Z + 0.02), (a, 1, 0.15), 0.32, 0.06))

# Wings: feathers on a pivot at each shoulder, beating about the body's long axis.
pivots = []
for s in (-1, 1):
    pivot = D.objects.new(f'Shoulder.{s}', None)
    scene_collection().objects.link(pivot)
    pivot.location = (0.1 * s, -0.05, Z + 0.06)
    part(pivot)
    bpy.context.view_layer.update()
    for i in range(7):
        t = i / 6
        root_pos = (0.1 * s + 0.45 * s * t, -0.08 + 0.05 * t, Z + 0.06)
        direction = (s * (0.3 + 0.7 * t), 0.55 + 0.3 * t, 0)
        part(feather(f'Wing.{s}.{i}', bronze if t > 0.5 else plumage, root_pos, direction, 0.2 + 0.18 * t, 0.06),
             pivot)
    pivots.append((s, pivot))

# Frames 1-8: one wingbeat with a small bob. Frames 9-14: wings fold, the bird tumbles to the ground.
for f in range(1, 9):
    beat = sin(2 * pi * (f - 1) / 8)
    root.location = (0, 0, 0.04 * beat)
    root.rotation_euler = (0, 0, 0)
    root.keyframe_insert('location', frame=f)
    root.keyframe_insert('rotation_euler', frame=f)
    for s, pivot in pivots:
        pivot.rotation_euler = (0, -s * 0.85 * beat, 0)
        pivot.keyframe_insert('rotation_euler', frame=f)
for k, f in enumerate(range(9, 15)):
    t = (k + 1) / 6
    root.location = (0, 0.1 * t, -(Z - 0.14) * t * t)
    root.rotation_euler = (0.6 * t, 1.2 * t, 0.4 * t)
    root.keyframe_insert('location', frame=f)
    root.keyframe_insert('rotation_euler', frame=f)
    for s, pivot in pivots:
        pivot.rotation_euler = (0, s * 0.9 * t, 0.5 * s * t)
        pivot.keyframe_insert('rotation_euler', frame=f)
