# Beasts built from CC0 models on a Flare stage (README.md): the hounds of the Underworld from Quaternius's wolf.
from math import radians

from mathutils import Matrix, Vector

from flare_lib import *

WOLF = ('quaternius-animals', 'Animal Pack Vol.2 by @Quaternius', 'Blends', 'Wolf.blend')
NECK = ['Bone.002', 'Bone.003']


def hound(height, fur_rgb, eye_rgb, extra_heads=(), mane=False):
    """The wolf, `height` stage units tall, smoothed, recoloured, with ember eyes and extra heads: each entry of
    `extra_heads` is (turn in degrees about the neck's base, rise). Lays out frames idle 1-4, walk 5-12 and
    death 13-18 (FRAMES = '1-18'). Returns (mesh, armature, root)."""
    clear_stage()
    mesh, arm, root = stage_creature(source(*WOLF), 'Wolf', 'WolfArmature', height=height, facing='+X')
    fur = material(f'{mesh.name}.Fur', fur_rgb)
    for slot in mesh.material_slots:
        slot.material = fur

    pivot = arm.matrix_world @ arm.data.bones['Bone.002'].head_local
    heads = [mesh]
    for i, (turn_deg, rise) in enumerate(extra_heads):
        head = copy_by_groups(mesh, NECK, name=f'Head.{i}')
        turn = Matrix.Translation(pivot) @ Matrix.Rotation(radians(turn_deg), 4, 'Z') @ Matrix.Translation(-pivot)
        lift = Matrix.Translation(Vector((0, 0, rise * height)))
        world = head.matrix_world.copy()
        head.data.transform(world.inverted() @ lift @ turn @ world)
        heads.append(head)

    # Smooth fur over the low-poly body, so it sits with Flare's rounder figures.
    for ob in heads:
        for poly in ob.data.polygons:
            poly.use_smooth = True
        sub = ob.modifiers.new('Smooth', 'SUBSURF')
        sub.levels = sub.render_levels = 1

    # Ember eyes on every head: behind the snout, on top of the head.
    ember = glow(f'{mesh.name}.Eyes', eye_rgb, 4.0)
    bpy.context.view_layer.update()
    eye_size = 0.035 * height / 3.1
    for head in heads:
        group = head.vertex_groups['Bone.003'].index
        pts = [head.matrix_world @ v.co for v in head.data.vertices
               if any(g.group == group and g.weight > 0.5 for g in v.groups)]
        front = min(pts, key=lambda p: p.y)  # the stage's front is -Y
        top = max(p.z for p in pts)
        width = max(p.x for p in pts) - min(p.x for p in pts)
        length = max(p.y for p in pts) - front.y
        centre_x = sum(p.x for p in pts) / len(pts)
        for s in (-1, 1):
            eye = add('uv_sphere', f'Eye.{head.name}.{s}', ember,
                      (centre_x + s * width * 0.22, front.y + length * 0.42, top - (top - front.z) * 0.18),
                      (eye_size, eye_size, eye_size * 0.85), segments=10, ring_count=6, radius=1)
            attach(eye, 'Bone.003', arm)

    if mane:
        _mane(mesh, arm, height)

    frames = [('Idle', f) for f in (0, 10, 20, 30)] + [('Walking', f) for f in range(0, 40, 5)]
    frames += [('Idle', 0)] * 6
    bake_poses(arm, frames)
    death_fall(root, 13, 6, tip=radians(85), sink=-0.11 * height)
    return mesh, arm, root


def _mane(mesh, arm, height):
    """Cerberus's serpent mane: a ridge of dark spines along the neck and back, their tips smouldering."""
    k = height / 3.1
    spine_mat = material('ManeSpines', (0.2, 0.08, 0.06))
    tip_mat = glow('ManeEmbers', (1.0, 0.3, 0.06), 1.6)
    chain = [arm.matrix_world @ arm.data.bones[b].head_local for b in ('Bone.002', 'Bone.001', 'Bone')]
    body_pts = [mesh.matrix_world @ v.co for v in mesh.data.vertices]
    for i in range(10):
        t = i / 9
        seg = min(int(t * 2), 1)
        p = chain[seg].lerp(chain[seg + 1], t * 2 - seg)
        near = [q for q in body_pts if (q.x - p.x) ** 2 + (q.y - p.y) ** 2 < 0.09 * k * k]
        top = max((q.z for q in near), default=p.z + 0.3 * k)
        size = (0.5 - 0.22 * t) * k
        spike = add('cone', f'Mane.{i}', spine_mat, (p.x, p.y, top + size * 0.5), (0.11 * k, 0.11 * k, size),
                    (radians(-25), 0, 0), vertices=6, radius1=1, radius2=0, depth=1, smooth=True)
        tip = add('uv_sphere', f'ManeTip.{i}', tip_mat, (p.x, p.y + size * 0.2, top + size * 0.95),
                  (0.045 * k, 0.045 * k, 0.045 * k), segments=6, ring_count=4, radius=1)
        bone = ('Bone.002', 'Bone.001', 'Bone')[min(int(t * 3), 2)]
        attach(spike, bone, arm)
        attach(tip, bone, arm)
