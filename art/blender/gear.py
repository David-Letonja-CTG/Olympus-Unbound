# Gear layers of the gods (spec: god-appearance; dressed-gods design: a god is three layers on one frame index).
# Each layer is rendered on a hero or heroine source file with the body as a holdout that casts no shadow, so the
# game draws it over any god of that body on the same frame: armour looks (neutral grey, tinted in the game by the
# worn armour's colour) and the held weapons (in their own colours). Run by armour_layer.py and weapon_layer.py.
from math import cos, pi, sin

import bpy
from mathutils import Vector

from flare_lib import *

STEEL = (0.82, 0.82, 0.84)  # armour: light and neutral, so the game's tint is the armour's colour
LEATHER = (0.6, 0.6, 0.6)


def hide_body():
    """The source's figure becomes a holdout without a shadow: it only hides the gear behind the god."""
    invis = D.materials.get('Invis') or material('Invis.Body', (0, 0, 0))
    for ob in bpy.context.scene.objects:
        if ob.type != 'MESH' or ob.name in ('RenderPlatform', 'ShadowPlane'):
            continue
        names = [s.material.name if s.material else '' for s in ob.material_slots]
        if not names or all(n.startswith('Invis') for n in names) or ob.name.startswith(('Human', 'Male')):
            for slot in ob.material_slots:
                slot.material = invis
            ob.visible_shadow = False


def bone_point(name, tail=False):
    arm = armature()
    b = arm.data.bones[name]
    return arm.matrix_world @ (b.tail_local if tail else b.head_local)


def _aim(ob, direction):
    ob.rotation_mode = 'QUATERNION'
    ob.rotation_quaternion = direction.to_track_quat('Z', 'Y')


# --- Armour looks (bold outlines at play size): 1 flared shoulder plates, 2 + crested helm and cuirass with a
# skirt of strips, 3 + a long cape. Matte, so the plates catch the sun instead of mirroring the dark sky. ---------

def armour(look):
    steel = material('ArmourSteel', STEEL)
    leather = material('ArmourStrips', LEATHER)
    crest_mat = material('ArmourCrest', (0.7, 0.7, 0.7))
    parts = []
    with rest_pose():
        neck = bone_point('Head')
        hip = bone_point('Hip')
        for side, sign in (('Left', 1), ('Right', -1)):
            shoulder = bone_point(f'Upperarm.{side}')
            # Two overlapping plates, the upper one wide and tilted out: the shoulders' outline doubles.
            for k, (w, h, drop) in enumerate(((0.17, 0.085, 0.0), (0.14, 0.07, -0.07))):
                plate = add('uv_sphere', f'Pauldron.{side}.{k}', steel,
                            shoulder + Vector((sign * (0.05 + 0.02 * k), 0, 0.04 + drop)),
                            (w, w * 0.85, h), (0, sign * -0.45, 0), segments=14, ring_count=8, radius=1,
                            smooth=True)
                parts.append((plate, f'Upperarm.{side}'))
        if look >= 2:
            chest = neck.lerp(hip, 0.35)
            cuirass = add('uv_sphere', 'Cuirass', steel, chest, (0.22, 0.16, 0.27),
                          segments=16, ring_count=10, radius=1, smooth=True)
            parts.append((cuirass, 'Back'))
            for i in range(11):  # pteruges: leather strips hanging round the hips
                a = pi * 2 * i / 11
                strip_ = add('cube', f'Strip.{i}', leather,
                             hip + Vector((0.18 * cos(a), 0.14 * sin(a), -0.12)),
                             (0.04, 0.012, 0.12), (0, 0, a + pi / 2))
                parts.append((strip_, 'Hip'))
            # The crested helm sits over the god's crown (Athena's helmet, a little larger, with a tall crest).
            helm = add('uv_sphere', 'Helm', steel, (0.0, 0.03, 1.775), (0.115, 0.14, 0.105),
                       segments=16, ring_count=10, radius=1, smooth=True)
            crest = add('cylinder', 'HelmCrest', crest_mat, (0.0, 0.05, 1.85), (0.1, 0.17, 0.03),
                        (0, pi / 2, 0), vertices=24, radius=1, depth=2)
            parts += [(helm, 'Head'), (crest, 'Head')]
        if look >= 3:
            # A long cape from the shoulders to the calves, swept back.
            cape = add('cube', 'Cape', leather, neck.lerp(hip, 0.75) + Vector((0, 0.2, -0.2)),
                       (0.26, 0.014, 0.62), (0.2, 0, 0))
            # On the hips, which turn far less in a swing than the back: the cape stays behind the god.
            parts.append((cape, 'Hip'))
            clasp = add('uv_sphere', 'CapeClasp', steel, neck + Vector((0, -0.09, -0.1)), (0.035, 0.025, 0.035),
                        segments=8, ring_count=6, radius=1)
            parts.append((clasp, 'Back'))
    for ob, bone in parts:
        attach(ob, bone)


# --- Weapons ------------------------------------------------------------------------------------------------------

def staff_head(staff, head_material):
    """Centre of the staff's head (faces of `head_material`) and the direction from the hand to it (rest pose)."""
    arm = armature()
    hand = (arm.matrix_world @ arm.pose.bones['Hand.Right'].matrix).translation
    shaft = staff.evaluated_get(bpy.context.evaluated_depsgraph_get())
    names = [s.material.name for s in staff.material_slots]
    points = [shaft.matrix_world @ shaft.data.vertices[i].co
              for p in shaft.data.polygons if names[p.material_index].startswith(head_material) for i in p.vertices]
    centre = sum(points, Vector()) / len(points)
    return centre, (centre - hand).normalized()


def _staff(shaft_rgb, wrap_rgb, crystal, metal_shaft=True):
    staff = D.objects['Staff']
    recolour_slots(staff, 'Wood', shaft_rgb, metal=metal_shaft, name='Shaft')
    recolour_slots(staff, 'ClothWrap', wrap_rgb, name='Wrap')
    set_slots(staff, 'Crystal', crystal)
    return staff


def weapon(wid):
    gold = material('Gold', (0.96, 0.78, 0.32), metal=True)
    iron = material('Iron', (0.2, 0.19, 0.22), metal=True)
    bronze = material('Bronze', (0.78, 0.58, 0.28), metal=True)
    if wid in ('thunder_spear', 'trident', 'bident', 'spear_of_athena', 'soul_scythe', 'war_hammer'):
        look = {
            'thunder_spear': ((0.96, 0.8, 0.34), (0.9, 0.9, 0.95), glow('HeadSpark', (0.75, 0.9, 1.0), 4.0), gold, 1),
            'trident': ((0.96, 0.76, 0.3), (0.18, 0.46, 0.44), glow('HeadSea', (0.4, 0.95, 1.0), 1.6), gold, 3),
            'bident': ((0.17, 0.16, 0.19), (0.42, 0.07, 0.09), glow('HeadSoul', (0.5, 1.0, 0.84), 2.0), iron, 2),
            'spear_of_athena': ((0.3, 0.2, 0.12), (0.14, 0.2, 0.38), material('HeadSocket', (0.78, 0.58, 0.28), metal=True), bronze, 1),
            'soul_scythe': ((0.12, 0.11, 0.13), (0.2, 0.2, 0.22), glow('HeadScythe', (0.5, 1.0, 0.84), 2.0), iron, 0),
            'war_hammer': ((0.35, 0.24, 0.14), (0.4, 0.3, 0.2), material('HeadHammer', (0.5, 0.48, 0.5), metal=True), iron, 0),
        }[wid]
        shaft, wrap, head, metal, prongs = look
        staff = _staff(shaft, wrap, head, metal_shaft=wid not in ('spear_of_athena', 'war_hammer'))
        if prongs:
            fork_head(staff, head.name, metal, prongs=prongs, spread=0.03 if prongs == 1 else 0.06,
                      length=0.16 if prongs == 1 else 0.14)
        elif wid == 'soul_scythe':
            with rest_pose():
                centre, along = staff_head(staff, head.name)
                side = along.cross(Vector((0, 0, 1))).normalized()
                blade = add('cone', 'ScytheBlade', glow('ScytheEdge', (0.6, 1.0, 0.88), 1.2),
                            centre + side * 0.16 - along * 0.02, (0.03, 0.012, 0.17), vertices=4,
                            radius1=1, radius2=0, depth=2)
                _aim(blade, side)
            attach(blade, 'Hand.Right')
        else:  # war hammer: an iron head across the top of the haft
            with rest_pose():
                centre, along = staff_head(staff, head.name)
                side = along.cross(Vector((0, 0, 1))).normalized()
                block = add('cube', 'HammerHead', iron, centre, (0.055, 0.055, 0.1))
                _aim(block, side)
            attach(block, 'Hand.Right')
    elif wid == 'flaming_sword':
        sword = D.objects['Longsword']
        set_slots(sword, 'Blade', glow('FlameBlade', (1.0, 0.55, 0.2), 3.0))
        recolour_slots(sword, 'Guard', (0.96, 0.78, 0.32), metal=True, name='SwordGold')
        recolour_slots(sword, 'Pommel', (0.96, 0.78, 0.32), metal=True, name='SwordPommel')
    elif wid == 'divine_bow':
        bow = next(ob for ob in D.objects if ob.type == 'MESH' and ob.name.lower().startswith('longbow'))
        recolour_slots(bow, 'Wood', (0.96, 0.84, 0.5), metal=True, name='BowGold')
        recolour_slots(bow, 'Silver', (0.98, 0.95, 0.88), metal=True, name='BowSilver')
        set_slots(bow, 'BowString', glow('BowString.Light', (1.0, 0.92, 0.7), 2.0))
    elif wid == 'lightning_orb':
        wand = D.objects['Wand']
        recolour_slots(wand, 'Wood', (0.96, 0.78, 0.32), metal=True, name='WandGold')
        with rest_pose():
            arm = armature()
            hand = (arm.matrix_world @ arm.pose.bones['Hand.Right'].matrix).translation
            ev = wand.evaluated_get(bpy.context.evaluated_depsgraph_get())
            tip = max((ev.matrix_world @ v.co for v in ev.data.vertices), key=lambda p: (p - hand).length)
            orb = add('uv_sphere', 'Orb', glow('OrbLight', (0.7, 0.9, 1.0), 6.0), tip, (0.05, 0.05, 0.05),
                      segments=12, ring_count=8, radius=1, smooth=True)
        attach(orb, 'Hand.Right')
    elif wid == 'thunderbolt':
        rod = D.objects['Rod']
        set_slots(rod, 'Blade', glow('BoltBlade', (0.78, 0.92, 1.0), 4.0))
        set_slots(rod, 'Crystal', glow('BoltCrystal', (0.9, 0.97, 1.0), 6.0))
    else:
        raise ValueError(f'No layer for weapon {wid}')
