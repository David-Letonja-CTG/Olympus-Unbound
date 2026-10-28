# Helpers for turning Flare's hero, troll and horse models into OLYMPUS UNBOUND characters (art/blender/README.md).
# Colours are display values, as in the 2.49-era files; flare_render.py converts them to linear.
import os
from math import pi

import bpy
from mathutils import Matrix

D = bpy.data
SOURCES = os.environ.get('FLARE_SOURCES', '')  # folder holding the downloaded source files (see README)
# A god's body sheet for runs: the weapon in the hand is its own layer there (gear.py, spec: god-appearance).
EMPTY_HANDED = os.environ.get('EMPTY_HANDED') == '1'


def source(*parts):
    return os.path.join(SOURCES, *parts)


def scene_collection():
    return D.collections.get('Collection 1') or bpy.context.scene.collection


def armature():
    return next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')


def body():
    """The rigged mesh in the visible collection (the hero's body, the troll, the horse)."""
    arm = armature()
    return next(
        o
        for o in scene_collection().objects
        if o.type == 'MESH' and any(m.type == 'ARMATURE' and m.object == arm for m in o.modifiers)
    )


def append(blend, name):
    """Appends one object from another .blend into the visible collection."""
    with D.libraries.load(blend, link=False) as (_, dst):
        dst.objects = [name]
    ob = dst.objects[0]
    scene_collection().objects.link(ob)
    return ob


def rig_like_body(ob):
    """Puts an appended layer mesh (a head) on this file's platform and armature, exactly as the body is."""
    b, arm = body(), armature()
    ob.parent = b.parent
    ob.matrix_parent_inverse = b.matrix_parent_inverse.copy()
    ob.matrix_basis = b.matrix_basis.copy()
    for m in ob.modifiers:
        if m.type == 'ARMATURE':
            m.object = arm


def recolour(name, rgb, metal=False):
    m = D.materials.get(name)
    if m:
        m.diffuse_color = (*rgb, 1)
        m.specular_intensity = 1.0 if metal else 0.0
    return m


def recolour_slots(ob, prefix, rgb, metal=False, name=None):
    """Gives `ob` its own copy of every material starting with `prefix`, recoloured."""
    for slot in ob.material_slots:
        if slot.material and slot.material.name.startswith(prefix):
            m = slot.material.copy()
            m.name = name or f'{prefix}.{ob.name}'
            m.diffuse_color = (*rgb, 1)
            m.specular_intensity = 1.0 if metal else 0.0
            slot.material = m


def material(name, rgb, metal=False):
    m = D.materials.new(name)
    m.diffuse_color = (*rgb, 1)
    m.specular_intensity = 1.0 if metal else 0.0
    return m


def glow(name, rgb, strength=6.0):
    """An emissive material (already node-based, so the renderer leaves it as is)."""
    m = D.materials.new(name)
    m.use_nodes = True
    nodes = m.node_tree.nodes
    nodes.clear()
    out = nodes.new('ShaderNodeOutputMaterial')
    em = nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = (*rgb, 1)
    em.inputs['Strength'].default_value = strength
    m.node_tree.links.new(em.outputs[0], out.inputs[0])
    return m


def set_slots(ob, prefix, mat):
    for slot in ob.material_slots:
        if slot.material and slot.material.name.startswith(prefix):
            slot.material = mat


def split_by_height(ob, prefix, below, z):
    """Faces using material `prefix` whose centre lies below world height `z` (rest pose) take material `below`."""
    if below.name not in [s.material.name for s in ob.material_slots if s.material]:
        ob.data.materials.append(below)
    names = [s.material.name if s.material else '' for s in ob.material_slots]
    dst = names.index(below.name)
    for poly in ob.data.polygons:
        if names[poly.material_index].startswith(prefix) and (ob.matrix_world @ poly.center).z < z:
            poly.material_index = dst


class rest_pose:
    """`with rest_pose():` evaluates the scene with the armature in its rest pose (for measuring and attaching)."""

    def __init__(self, arm=None):
        self.arm = arm

    def __enter__(self):
        self.arm = self.arm or armature()
        self.arm.data.pose_position = 'REST'
        bpy.context.view_layer.update()
        return self.arm

    def __exit__(self, *_):
        self.arm.data.pose_position = 'POSE'
        bpy.context.view_layer.update()


def _bone_tail(arm, bone):
    pb = arm.pose.bones[bone]
    return arm.matrix_world @ pb.matrix @ Matrix.Translation((0, pb.bone.length, 0))


def attach(ob, bone, arm=None):
    """Rigidly attaches `ob` to `bone`, keeping where it is now in the rest pose."""
    arm = arm or armature()
    with rest_pose(arm):
        bpy.context.view_layer.update()
        world = ob.matrix_world.copy()
        tail = _bone_tail(arm, bone)
    ob.parent = arm
    ob.parent_type = 'BONE'
    ob.parent_bone = bone
    ob.matrix_parent_inverse = tail.inverted() @ world
    ob.matrix_basis = Matrix.Identity(4)


def grip(ob, bone, hand_space, arm=None):
    """Attaches a held object by its matrix relative to the hand (world space, scale removed), as measured in
    the weapon's own file. Bone-space numbers do not carry between files whose armatures are scaled differently.
    """
    arm = arm or armature()
    with rest_pose(arm):
        hand = arm.matrix_world @ arm.pose.bones[bone].matrix
        loc, rot, _ = hand.decompose()
        tail = _bone_tail(arm, bone)
        world = Matrix.LocRotScale(loc, rot, None) @ hand_space
    ob.parent = arm
    ob.parent_type = 'BONE'
    ob.parent_bone = bone
    ob.matrix_parent_inverse = tail.inverted() @ world
    ob.matrix_basis = Matrix.Identity(4)


def add(kind, name, mat, location, scale=(1, 1, 1), rotation=(0, 0, 0), **options):
    """Adds a primitive mesh ('uv_sphere', 'cone', 'torus', 'cube', 'cylinder') to the visible collection."""
    smooth = options.pop('smooth', False)
    getattr(bpy.ops.mesh, f'primitive_{kind}_add')(**options)
    ob = bpy.context.active_object
    ob.name = name
    for col in list(ob.users_collection):
        col.objects.unlink(ob)
    scene_collection().objects.link(ob)
    ob.location, ob.scale, ob.rotation_euler = location, scale, rotation
    if mat:
        ob.data.materials.append(mat)
    if smooth:
        for poly in ob.data.polygons:
            poly.use_smooth = True
    return ob


def matrix(rows):
    return Matrix([rows[0:4], rows[4:8], rows[8:12], rows[12:16]])


# Grips measured in the hero's weapon files (hand_space(), art/blender/README.md): the weapon's matrix relative to
# the hand, constant through the animation.
GRIP_GREATSTAFF = matrix([0.01819, 0.03514, -0.12154, -0.03056, -0.04044, -0.11473, -0.03922, 0.08126,
                          -0.11988, 0.04404, -0.00521, 0.03942, 0.0, 0.0, 0.0, 1.0])
GRIP_STAFF = matrix([0.17072, 0.32988, -1.14107, -0.03056, -0.37972, -1.07714, -0.36821, 0.08126,
                     -1.12546, 0.41346, -0.04885, 0.03941, 0.0, 0.0, 0.0, 1.0])
GRIP_LONGSWORD = matrix([-0.0026, 0.15677, -0.98763, -0.02533, -0.51834, -0.84481, -0.13274, 0.06801,
                         -0.85517, 0.51159, 0.08346, 0.00452, 0.0, 0.0, 0.0, 1.0])
GRIP_SHIELD = matrix([-0.11893, 0.70066, -0.11548, -0.02851, -0.70992, -0.11464, 0.03558, 0.18295,
                      0.01624, 0.11974, 0.70979, 0.00695, 0.0, 0.0, 0.0, 1.0])  # on Forearm.Left
GRIP_HEROINE_STAFF = matrix([0.95374, -0.27359, -0.50838, -0.0277, -0.57655, -0.40028, -0.86619, 0.09539,
                             0.03004, 1.00392, -0.48392, -0.04406, 0.0, 0.0, 0.0, 1.0])

HERO = 'isometric_hero_heroine_blend/isometric_hero_blender'
HEROINE = 'isometric_hero_heroine_blend/isometric_heroine_blender'


def hero_part(name):
    return source(HERO, f'{name}.blend')


def heroine_part(name):
    return source(HEROINE, f'{name}.blend')


def held(blend, name, bone, hand_space, arm=None):
    """Appends a weapon from a hero layer file and puts it in this character's hand."""
    ob = append(blend, name)
    grip(ob, bone, hand_space, arm)
    return ob


def drop_held(ob):
    """Removes a held weapon and any prongs fork_head gave it (for EMPTY_HANDED)."""
    for o in [ob] + [o for o in D.objects if o.name.startswith(('Prong.', 'ProngBar'))]:
        D.objects.remove(o)


def corrupt_eyes(head, prefix='Black'):
    """The sickly green glow of corruption in the eyes (docs/art-direction.md)."""
    set_slots(head, prefix, glow(f'CorruptEyes.{head.name}', (0.61, 1.0, 0.42), 8.0))


def strip(ob, prefix):
    """Deletes the faces of `ob` that use material `prefix` (the hidden body in a head layer file)."""
    import bmesh

    names = [s.material.name if s.material else '' for s in ob.material_slots]
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if names[f.material_index].startswith(prefix)], context='FACES')
    bm.to_mesh(ob.data)
    bm.free()


def heroine_head(hair=True):
    """The heroine's head (face from head_long.blend's body mesh, plus the long hair)."""
    head = append(heroine_part('head_long'), 'HumanFemale')
    head.name = 'HeroineHead'
    strip(head, 'Invis')
    rig_like_body(head)
    parts = [head]
    if hair:
        long_hair = append(heroine_part('head_long'), 'LongHair')
        rig_like_body(long_hair)
        parts.append(long_hair)
    return parts


def feather(name, mat, root, direction, length, width=0.05):
    """One tapered feather from `root` along `direction` (rest-pose world space)."""
    from mathutils import Vector

    d = Vector(direction).normalized()
    ob = add('cone', name, mat, Vector(root) + d * (length / 2), (width, 0.01, length / 2),
             vertices=4, radius1=1, radius2=0.15, depth=2)
    ob.rotation_mode = 'QUATERNION'
    ob.rotation_quaternion = d.to_track_quat('Z', 'Y')
    return ob


def wing(name, mat, tip_mat, shoulder, wrist, side, count=11, droop=0.45):
    """Feathers along an arm (rest pose, arms along X; `side` -1 right, 1 left), sweeping from straight back
    at the shoulder to outward at the wrist, longer towards the tip like a bird's wing. Returns
    [(feather, along)] with `along` from 0 (shoulder) to 1 (wrist), to pick the bone each rides on."""
    from math import cos, sin

    out = []
    for i in range(count):
        t = i / (count - 1)
        root = [shoulder[k] + (wrist[k] - shoulder[k]) * t for k in range(3)]
        angle = 0.1 + 1.0 * t * t
        direction = (side * sin(angle), cos(angle), -droop)
        length = 0.3 + 0.38 * t
        out.append((feather(f'{name}.{i}', tip_mat if t > 0.6 else mat, root, direction, length), t))
    return out
GRIP_LONGBOW = matrix([-1.00167, 0.45346, -0.03214, 0.02756, -0.45416, -1.00162, 0.02253, 0.0926,
                       -0.01997, 0.03379, 1.0993, 0.00628, 0.0, 0.0, 0.0, 1.0])  # on Hand.Left


def strip_vertex_groups(ob, groups, threshold=0.5):
    """Deletes the vertices of `ob` weighted mostly to any of `groups` (e.g. the horse's neck and head)."""
    import bmesh

    indices = {ob.vertex_groups[g].index for g in groups if g in ob.vertex_groups}
    doomed = {v.index for v in ob.data.vertices
              if sum(g.weight for g in v.groups if g.group in indices) >= threshold}
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.index in doomed], context='VERTS')
    bm.to_mesh(ob.data)
    bm.free()


def strip_below(ob, z):
    """Deletes the faces of `ob` whose rest-pose world centre lies below height `z` (a rider's legs)."""
    import bmesh

    bm = bmesh.new()
    bm.from_mesh(ob.data)
    m = ob.matrix_world
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if (m @ f.calc_center_median()).z < z], context='FACES')
    bm.to_mesh(ob.data)
    bm.free()
GRIP_SHORTSWORD = matrix([-0.00261, 0.15678, -0.98763, -0.03149, -0.51835, -0.8448, -0.13273, 0.08363,
                          -0.85516, 0.51159, 0.08347, 0.02711, 0.0, 0.0, 0.0, 1.0])


def fork_head(staff, head_material, metal, prongs=2, spread=0.05, length=0.13):
    """Turns a held staff into a bident or trident: `prongs` metal prongs rooted at the staff's head (the faces
    using `head_material`, e.g. its crystal), pointing away from the hand, with a crossbar. Attached to the hand
    like the staff. Run outside rest_pose()."""
    from mathutils import Vector

    arm = armature()
    with rest_pose(arm):
        hand = (arm.matrix_world @ arm.pose.bones['Hand.Right'].matrix).translation
        shaft = staff.evaluated_get(bpy.context.evaluated_depsgraph_get())
        names = [s.material.name for s in staff.material_slots]
        points = [shaft.matrix_world @ shaft.data.vertices[i].co
                  for p in shaft.data.polygons if names[p.material_index] == head_material for i in p.vertices]
        centre = sum(points, Vector()) / len(points)
        along = (centre - hand).normalized()
        side = along.cross(Vector((0, 0, 1))).normalized()
        parts = []
        for k in range(prongs):
            offset = (k - (prongs - 1) / 2) * 2 * spread / max(1, prongs - 1) if prongs > 1 else 0
            # The middle prong of a trident reaches a little further.
            reach = length * (1.25 if prongs % 2 and k == prongs // 2 else 1)
            prong = add('cone', f'Prong.{k}', metal, centre + side * offset + along * (reach - 0.01),
                        (0.022, 0.022, reach), vertices=6, radius1=1, radius2=0, depth=2)
            prong.rotation_mode = 'QUATERNION'
            prong.rotation_quaternion = along.to_track_quat('Z', 'Y')
            parts.append(prong)
        bar = add('cylinder', 'ProngBar', metal, centre - along * 0.03, (0.016, 0.016, spread + 0.015),
                  vertices=6, radius=1, depth=2)
        bar.rotation_mode = 'QUATERNION'
        bar.rotation_quaternion = side.to_track_quat('Z', 'Y')
        parts.append(bar)
    for ob in parts:
        attach(ob, 'Hand.Right')
    return parts
GRIP_HEROINE_SHIELD = matrix([0.01238, 0.07554, 0.71592, -0.0577, -0.71602, -0.07288, 0.02007, 0.16223,
                              0.07457, -0.71231, 0.07387, 0.0524, 0.0, 0.0, 0.0, 1.0])  # on Forearm.Left


# ---------------------------------------------------------------------------------------------------------------
# Creatures from other sources (CC0 models, README.md): put on a Flare file's stage and posed frame by frame.


def clear_stage():
    """Removes the stage file's own figure, keeping its camera, sun, shadow plane and platform."""
    for ob in list(bpy.context.scene.objects):
        if ob.type in ('MESH', 'ARMATURE') and ob.name not in ('RenderPlatform', 'ShadowPlane'):
            D.objects.remove(ob)


def stage_creature(blend, mesh_name, armature_name, height, facing='+X'):
    """Appends a rigged model, stands it on the render platform facing the way Flare's figures do (-Y), and
    scales it to `height` (stage units, the hero is about 1.9). Returns (mesh, armature)."""
    with D.libraries.load(blend, link=False) as (_, dst):
        dst.objects = [mesh_name, armature_name]
    mesh, arm = dst.objects
    for ob in (mesh, arm):
        scene_collection().objects.link(ob)
    root = D.objects.new(f'{armature_name}.Root', None)
    scene_collection().objects.link(root)
    root.parent = D.objects['RenderPlatform']
    arm.parent = root
    # The model's front to the stage's front (-Y).
    turn = {'+X': -pi / 2, '-X': pi / 2, '+Y': pi, '-Y': 0.0}[facing]
    root.rotation_euler = (0, 0, turn)
    bpy.context.view_layer.update()
    top = max((mesh.matrix_world @ v.co).z for v in mesh.data.vertices)
    bottom = min((mesh.matrix_world @ v.co).z for v in mesh.data.vertices)
    s = height / (top - bottom)
    root.scale = (s, s, s)
    root.location = (0, 0, -bottom * s)
    bpy.context.view_layer.update()
    return mesh, arm, root


def bake_poses(arm, frames):
    """Copies the model's own animation into one action, frame by frame: `frames[i]` is (action name, source frame)
    for output frame i + 1. The Flare layout (idle, walk, attack, death) comes from the model's own cycles."""
    sc = bpy.context.scene
    arm.animation_data_create()
    poses = []
    for action_name, src in frames:
        arm.animation_data.action = D.actions[action_name]
        sc.frame_set(int(src), subframe=src - int(src))
        poses.append({pb.name: pb.matrix_basis.copy() for pb in arm.pose.bones})
    baked = D.actions.new(f'{arm.name}.Baked')
    arm.animation_data.action = baked
    for i, pose in enumerate(poses):
        for pb in arm.pose.bones:
            pb.matrix_basis = pose[pb.name]
            pb.rotation_mode = 'QUATERNION'
            for path in ('location', 'rotation_quaternion', 'scale'):
                pb.keyframe_insert(path, frame=i + 1)
    for fc in _fcurves(baked):
        for k in fc.keyframe_points:
            k.interpolation = 'CONSTANT'
    return baked


def _fcurves(action):
    """F-curves of an action (Blender 4.4+ keeps them in layered channelbags)."""
    if hasattr(action, 'fcurves') and len(action.fcurves):
        return list(action.fcurves)
    curves = []
    for layer in getattr(action, 'layers', []):
        for strip in layer.strips:
            for bag in strip.channelbags:
                curves.extend(bag.fcurves)
    return curves


def death_fall(root, first, count, tip=pi / 2, sink=0.0):
    """Keys a fall over `count` frames from `first`: the creature rolls about its own long axis (the model's X, before
    it was turned to face the stage) onto its side and settles; a negative `sink` lifts its flank off the ground."""
    base_loc = root.location.copy()
    base_rot = root.rotation_euler.copy()
    for k in range(count):
        t = (k + 1) / count
        ease = 1 - (1 - t) ** 2
        root.rotation_euler = (base_rot.x + tip * ease, base_rot.y, base_rot.z)
        root.location = (base_loc.x, base_loc.y, base_loc.z - sink * ease)
        root.keyframe_insert('rotation_euler', frame=first + k)
        root.keyframe_insert('location', frame=first + k)
    root.rotation_euler, root.location = base_rot, base_loc
    for f in range(1, first):
        root.keyframe_insert('rotation_euler', frame=f)
        root.keyframe_insert('location', frame=f)
    if root.animation_data and root.animation_data.action:
        for fc in _fcurves(root.animation_data.action):
            for k in fc.keyframe_points:
                k.interpolation = 'CONSTANT'


def copy_by_groups(ob, groups, threshold=0.4, name=None):
    """A copy of the faces of `ob` weighted to any of `groups` (kept rigged): for extra heads and limbs."""
    copy = ob.copy()
    copy.data = ob.data.copy()
    copy.name = name or f'{ob.name}.Copy'
    scene_collection().objects.link(copy)
    idx = {copy.vertex_groups[g].index for g in groups if g in copy.vertex_groups}
    keep = set()
    for v in copy.data.vertices:
        if sum(g.weight for g in v.groups if g.group in idx) >= threshold:
            keep.add(v.index)
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(copy.data)
    bm.verts.ensure_lookup_table()
    gone = [f for f in bm.faces if not all(v.index in keep for v in f.verts)]
    bmesh.ops.delete(bm, geom=gone, context='FACES')
    loose = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=loose, context='VERTS')
    bm.to_mesh(copy.data)
    bm.free()
    return copy


def ghost(name, rgb, alpha, glow_strength=0.3):
    """A translucent, faintly glowing material for the dead (already node-based, so the renderer leaves it as is;
    the sheet keeps the partial alpha)."""
    lin = tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb)
    m = D.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*lin, 1)
    bsdf.inputs['Alpha'].default_value = alpha
    bsdf.inputs['Roughness'].default_value = 0.8
    bsdf.inputs['Emission Color'].default_value = (*lin, 1)
    bsdf.inputs['Emission Strength'].default_value = glow_strength
    return m


def dress_all(mat, keep=('Invis',), only=None):
    """Gives every slot of every visible mesh `mat`, except holdouts and the slots named in `keep`."""
    for ob in scene_collection().objects:
        if ob.type != 'MESH' or (only and ob not in only):
            continue
        for slot in ob.material_slots:
            if slot.material and not slot.material.name.startswith(keep):
                slot.material = mat


def scaled_tail(points, mats, count, r_start, r_end, name='Tail'):
    """A tail of overlapping scaled segments along `points` (call inside rest_pose and attach the result to the hip):
    serpent and fish tails for the half-human. `mats` alternate along the tail."""
    from mathutils import Vector

    path = [Vector(p) for p in points]
    segments = []
    for i in range(count):
        t = i / (count - 1)
        f = t * (len(path) - 1)
        k = min(int(f), len(path) - 2)
        p = path[k].lerp(path[k + 1], f - k)
        r = r_start * (1 - t) + r_end * t
        segments.append(add('uv_sphere', f'{name}.{i}', mats[i % len(mats)], p, (r, r, r * 0.85),
                            segments=12, ring_count=8, radius=1, smooth=True))
    return segments


def labrys_head(ob, wood_prefix, metal, bone='Hand.Right', blade=(0.2, 0.3, 0.02), thin=1.0):
    """Turns a held club or staff into a labrys, the Minoan double axe: two blades flaring out either side of the
    shaft near its far end (the vertex of the `wood_prefix` faces farthest from the hand), attached to the hand,
    and a spike beyond. `blade` is (reach, height along the shaft, thickness); `thin` < 1 slims the shaft (a club
    becomes a haft). Run outside rest_pose()."""
    from mathutils import Vector

    arm = armature()
    with rest_pose(arm):
        hand = (arm.matrix_world @ arm.pose.bones[bone].matrix).translation
        names = [s.material.name if s.material else '' for s in ob.material_slots]
        wood = sorted({i for p in ob.data.polygons if names[p.material_index].startswith(wood_prefix)
                       for i in p.vertices})
        mw = ob.matrix_world.copy()
        points = {i: mw @ ob.data.vertices[i].co for i in wood}
        tip = max(points.values(), key=lambda p: (p - hand).length)
        along = (tip - hand).normalized()
        if thin < 1:
            axis = sum(points.values(), Vector()) / len(points)
            inverse = mw.inverted()
            for i, w in points.items():
                foot = axis + along * (w - axis).dot(along)
                ob.data.vertices[i].co = inverse @ (foot + (w - foot) * thin)
            tip = axis + along * (tip - axis).dot(along)
        side = along.cross(Vector((0, 0, 1))).normalized()
        centre = tip - along * (blade[1] * 0.6)
        parts = []
        for s in (-1, 1):
            out = side * s
            # A flat plate (cone with four sides, flattened), narrow at the shaft and broad at its edge: local Z out
            # from the shaft, X along it, Y the blade's thickness.
            b = add('cone', f'Labrys.{s}', metal, centre + out * (blade[0] / 2), (blade[1] / 2, blade[2], blade[0] / 2),
                    vertices=4, radius1=0.35, radius2=1, depth=2)
            b.rotation_mode = 'QUATERNION'
            b.rotation_quaternion = Matrix((along, out.cross(along), out)).transposed().to_quaternion()
            parts.append(b)
        spike = add('cone', 'LabrysSpike', metal, tip + along * 0.06, (0.025, 0.025, 0.08),
                    vertices=6, radius1=1, radius2=0, depth=2)
        spike.rotation_mode = 'QUATERNION'
        spike.rotation_quaternion = along.to_track_quat('Z', 'Y')
        parts.append(spike)
    for p in parts:
        attach(p, bone)
    return parts
