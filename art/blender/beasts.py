# Beasts built from CC0 models on a Flare stage (README.md): the hounds of the Underworld from Quaternius's wolf.
from math import cos, radians, sin

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


# ---------------------------------------------------------------------------------------------------------------
# The Lernaean Marsh: serpents and crabs from methodical pixel's CC0 models.

SNAKE = ('snake', 'snake', 'snake.blend')
CRAB = ('crab', 'crab', 'crab.blend')


def _thicken(arm, mesh, girth):
    """The snake is a flat ribbon: widen and deepen it about its spine (the armature's Y axis)."""
    mesh.data.transform(Matrix.Diagonal((girth, 1, girth, 1)))  # bones run along Y: weights stay valid


def serpent(length, skin_rgb, belly_rgb, eye_rgb, girth=3.5):
    """A swamp serpent `length` stage units long, lying on the ground, slithering. Frames: idle 1-4, walk 5-12,
    death 13-18 (FRAMES = '1-18')."""
    clear_stage()
    mesh, arm, root = stage_creature(source(*SNAKE), 'snake', 'snake armature', height=1.0, facing='-Y')
    _thicken(arm, mesh, girth)
    # stage_creature scaled by height; rescale by length instead (the snake lies flat).
    bpy.context.view_layer.update()
    ys = [(mesh.matrix_world @ v.co).y for v in mesh.data.vertices]
    k = length / (max(ys) - min(ys))
    root.scale = tuple(c * k for c in root.scale)
    root.location = (0, 0, 0)
    _snake_look(mesh, arm, skin_rgb, belly_rgb, eye_rgb)
    frames = [('idle', f) for f in (1, 7, 13, 19)] + [('walk', f) for f in range(1, 81, 10)]
    frames += [('idle', 1)] * 6
    bake_poses(arm, frames)
    death_fall(root, 13, 6, tip=radians(150), sink=-0.03 * length)
    return mesh, arm, root


def _snake_look(mesh, arm, skin_rgb, belly_rgb, eye_rgb, eye_scale=1.0, eye_glow=5.0):
    skin = material(f'{mesh.name}.Scales', skin_rgb)
    for slot in mesh.material_slots:
        slot.material = skin
    for poly in mesh.data.polygons:
        poly.use_smooth = True
    sub = mesh.modifiers.new('Smooth', 'SUBSURF')
    sub.levels = sub.render_levels = 1
    bpy.context.view_layer.update()
    eye = glow(f'{mesh.name}.Eyes', eye_rgb, eye_glow)
    group = mesh.vertex_groups['head'].index if 'head' in mesh.vertex_groups else None
    pts = [mesh.matrix_world @ v.co for v in mesh.data.vertices
           if group is None or any(g.group == group and g.weight > 0.5 for g in v.groups)]
    tip = min(pts, key=lambda p: (p - arm.matrix_world @ arm.data.bones['head'].tail_local).length)
    top = max(p.z for p in pts)
    width = max(p.x for p in pts) - min(p.x for p in pts)
    size = max(width * 0.16, 0.012) * eye_scale
    head_mid = sum(pts, Vector()) / len(pts)
    for s in (-1, 1):
        e = add('uv_sphere', f'Eye.{mesh.name}.{s}', eye,
                (head_mid.x + s * width * 0.3, head_mid.y + (tip.y - head_mid.y) * 0.3,
                 head_mid.z + (top - head_mid.z) * 0.7),
                (size, size, size), segments=8, ring_count=6, radius=1)
        attach(e, 'head', arm)


def _hydra_head(mesh, arm, skin_rgb, height):
    """A heavier, wedge-shaped serpent head with open jaws on the neck's tip, so each head reads at sprite size."""
    bpy.context.view_layer.update()
    bone = arm.data.bones['head']
    tip = arm.matrix_world @ bone.tail_local
    base = arm.matrix_world @ bone.head_local
    direction = (tip - base).normalized()
    skin = material(f'{mesh.name}.HeadScales', tuple(c * 0.85 for c in skin_rgb))
    jaw = material(f'{mesh.name}.Maw', (0.5, 0.08, 0.06))
    rot = direction.to_track_quat('Z', 'Y').to_euler()
    h = height * 0.07
    skull = add('cone', f'Skull.{mesh.name}', skin, base + direction * h * 0.6, (h * 0.75, h * 0.55, h * 1.3),
                rot, vertices=10, radius1=1, radius2=0.25, depth=1, smooth=True)
    maw = add('cone', f'Maw.{mesh.name}', jaw, base + direction * h * 0.7, (h * 0.45, h * 0.3, h * 1.1),
              rot, vertices=8, radius1=1, radius2=0.1, depth=1, smooth=True)
    for ob in (skull, maw):
        attach(ob, 'head', arm)


def crab(height, shell_rgb, claw_rgb, eye_rgb):
    """A giant crab `height` stage units tall, scuttling. Frames: idle 1-4, walk 5-12, death 13-18."""
    clear_stage()
    mesh, arm, root = stage_creature(source(*CRAB), 'crab', 'rig crab', height=height, facing='-Y')
    shell = material(f'{mesh.name}.Shell', shell_rgb)
    for slot in mesh.material_slots:
        slot.material = shell
    for poly in mesh.data.polygons:
        poly.use_smooth = True
    bpy.context.view_layer.update()
    eye = glow(f'{mesh.name}.Eyes', eye_rgb, 5.0)
    pts = [mesh.matrix_world @ v.co for v in mesh.data.vertices]
    top = max(p.z for p in pts)
    # The shell: the highest part of the body (the claws and legs reach further but lower).
    shell = [p for p in pts if p.z > top - height * 0.25]
    front = min(p.y for p in shell)
    centre_x = sum(p.x for p in shell) / len(shell)
    w = max(p.x for p in shell) - min(p.x for p in shell)
    for s in (-1, 1):
        e = add('uv_sphere', f'Eye.{s}', eye, (centre_x + s * w * 0.12, front + height * 0.04, top + height * 0.03),
                (height * 0.045,) * 3, segments=8, ring_count=6, radius=1)
        e.parent = root
        e.matrix_parent_inverse = root.matrix_world.inverted()
    frames = [('idle', f) for f in (1, 13, 25, 37)] + [('walk', f) for f in range(1, 25, 3)]
    frames += [('idle', 1)] * 6
    bake_poses(arm, frames)
    death_fall(root, 13, 6, tip=radians(170), sink=-0.25 * height)
    return mesh, arm, root


def hydra(neck_count, height, skin_rgb, eye_rgb, body_rgb):
    """The Hydra: a mossy mound with `neck_count` serpents rising from it as necks, swaying with their own slither.
    Frames: idle 1-4, walk 5-12, death 13-18."""
    clear_stage()
    platform = D.objects['RenderPlatform']
    root = D.objects.new('Hydra', None)
    scene_collection().objects.link(root)
    root.parent = platform
    body = add('uv_sphere', 'HydraBody', material('HydraHide', body_rgb), (0, 0, height * 0.14),
               (height * 0.5, height * 0.42, height * 0.24), segments=24, ring_count=14, radius=1, smooth=True)
    body.parent = root
    necks = []
    for i in range(neck_count):
        a = (i / neck_count) * pi * 2 + 0.3
        rim = 0.9 if i % 2 else 0.7
        mesh, arm, nroot = stage_creature(source(*SNAKE), 'snake', 'snake armature', height=1.0, facing='-Y')
        _thicken(arm, mesh, 4.0)
        nroot.parent = root
        # Stand the snake up: its head (-Y) to the sky, its tail into the body.
        length = height * (0.95 + 0.25 * ((i * 37) % 5) / 4)
        bpy.context.view_layer.update()
        ys = [(mesh.matrix_world @ v.co).y for v in mesh.data.vertices]
        k = length / (max(ys) - min(ys))
        nroot.scale = tuple(c * k for c in nroot.scale)
        lean = 0.7
        # Head (-Y) up and leaning out from the body.
        nroot.rotation_euler = (-(pi / 2 - lean), 0, a + pi / 2)
        nroot.location = (cos(a) * height * 0.32 * rim, sin(a) * height * 0.26 * rim, height * 0.12 + length * 0.42)
        _snake_look(mesh, arm, skin_rgb, skin_rgb, eye_rgb, eye_scale=0.9, eye_glow=3.0)
        _hydra_head(mesh, arm, skin_rgb, height)
        phase = (i * 13) % 80
        frames = [('idle', (f + phase) % 24 + 1) for f in (0, 6, 12, 18)]
        frames += [('walk', (f + phase) % 80 + 1) for f in range(0, 80, 10)]
        frames += [('idle', 1)] * 6
        bake_poses(arm, frames)
        necks.append(nroot)
    death_fall(root, 13, 6, tip=radians(70), sink=0.0)
    return root



# ---------------------------------------------------------------------------------------------------------------
# The Aegean Shore: Scylla, the heroine with a ring of hound heads at her waist and serpent-tentacles beneath.


def hound_heads(count, ring, z, size, fur_rgb, eye_rgb, bone='Hip'):
    """`count` hound heads (cut from the wolf, unrigged) in a ring of radius `ring` at height `z`, snouts out,
    attached rigidly to `bone` of the stage's own armature."""
    stage_arm = armature()
    mesh, arm, root = stage_creature(source(*WOLF), 'Wolf', 'WolfArmature', height=size * 3, facing='+X')
    head = copy_by_groups(mesh, NECK, name='HoundHead')
    head.modifiers.clear()
    bpy.context.view_layer.update()
    # Bake its world placement into the mesh, then free it from the wolf.
    head.data.transform(head.matrix_world)
    head.parent = None
    head.matrix_world = Matrix.Identity(4)
    head.vertex_groups.clear()
    for ob in (mesh, arm):
        D.objects.remove(ob)
    D.objects.remove(root)
    pts = [v.co for v in head.data.vertices]
    centre = sum(pts, Vector()) / len(pts)
    back = max(pts, key=lambda p: p.y).y  # the neck's cut end (the snout faces -Y)
    head.data.transform(Matrix.Translation(Vector((-centre.x, -back, -centre.z))))
    fur = material('HoundHeadFur', fur_rgb)
    for slot in head.material_slots:
        slot.material = fur
    for poly in head.data.polygons:
        poly.use_smooth = True
    sub = head.modifiers.new('Smooth', 'SUBSURF')
    sub.levels = sub.render_levels = 1
    ember = glow('HoundHeadEyes', eye_rgb, 4.0)
    heads = []
    for i in range(count):
        a = (i / count) * pi * 2
        copy = head.copy() if i else head
        if i:
            copy.data = head.data.copy()
            scene_collection().objects.link(copy)
        # Snout (-Y) outward along a; a little downward, hungry.
        copy.rotation_euler = (radians(6), 0, a + pi / 2)
        copy.location = (cos(a) * ring, sin(a) * ring, z)
        heads.append(copy)
        bpy.context.view_layer.update()
        # Eyes from where the head now is: behind the snout tip (farthest out along a), on top, either side.
        out = Vector((cos(a), sin(a), 0))
        side = Vector((-sin(a), cos(a), 0))
        world = [copy.matrix_world @ v.co for v in copy.data.vertices]
        snout = max(world, key=lambda p: p.dot(out))
        middle = sum(world, Vector()) / len(world)
        top = max(p.z for p in world)
        for s in (-1, 1):
            at = middle.lerp(snout, 0.55) + side * (s * size * 0.12)
            at.z = top - size * 0.08
            eye = add('uv_sphere', f'HoundEye.{i}.{s}', ember, at, (size * 0.05,) * 3,
                      segments=8, ring_count=6, radius=1)
            attach(eye, bone, stage_arm)
    for copy in heads:
        attach(copy, bone, stage_arm)
    return heads


def tentacles(count, length, skin_rgb, frames=32):
    """`count` serpent tentacles lying out from the stage's centre, writhing with the snake's own slither over the
    stage file's `frames` frames."""
    roots = []
    for i in range(count):
        a = (i / count) * pi * 2 + pi / count
        mesh, arm, root = stage_creature(source(*SNAKE), 'snake', 'snake armature', height=1.0, facing='-Y')
        _thicken(arm, mesh, 5.0)
        bpy.context.view_layer.update()
        ys = [(mesh.matrix_world @ v.co).y for v in mesh.data.vertices]
        k = length / (max(ys) - min(ys))
        root.scale = tuple(c * k for c in root.scale)
        # The tail end (+Y) at the centre, the head end reaching out along a.
        root.rotation_euler = (0, 0, a + pi / 2)
        root.location = (cos(a) * length * 0.45, sin(a) * length * 0.45, 0.02)
        skin = material(f'Tentacle.{i}', skin_rgb)
        for slot in mesh.material_slots:
            slot.material = skin
        for poly in mesh.data.polygons:
            poly.use_smooth = True
        phase = (i * 17) % 80
        bake_poses(arm, [('walk', (f * 2.5 + phase) % 80 + 1) for f in range(frames)])
        roots.append(root)
    return roots
