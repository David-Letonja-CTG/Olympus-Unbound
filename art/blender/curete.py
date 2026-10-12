# Curete: one of the Kouretes, the armed dancers of Crete who clashed spear on shield to hide the infant Zeus's cries,
# now the Labyrinth's cursed guard. Flare's hero in leather armour (leather_armor.blend) in Minoan red and bronze, a
# boar's-tusk helmet of ivory bands, a bronze shield and a spear, eyes lit by the corruption (docs/art-direction.md).
#   source: isometric_hero_heroine_blend/isometric_hero_blender/leather_armor.blend
from flare_lib import *

BRONZE = (0.74, 0.52, 0.26)
RED = (0.5, 0.12, 0.08)
SKIN = (0.62, 0.44, 0.3)
recolour('Skin.001', SKIN)
recolour('LeatherDistressed', RED)
recolour('LeatherDistressed.001', BRONZE, metal=True)
recolour('LeatherDistressed.002', (0.7, 0.5, 0.22))
recolour('ClothBlack', (0.16, 0.08, 0.06))
recolour('SteelRough', BRONZE, metal=True)

head = append(hero_part('male_head1'), 'MaleHead1')
head.name = 'CureteHead'
rig_like_body(head)
recolour_slots(head, 'DarkHair', (0.06, 0.04, 0.03), name='CureteHair')
recolour_slots(head, 'Skin', SKIN, name='CureteSkin')
corrupt_eyes(head)

shield = held(hero_part('shield'), 'HeavyShield', 'Forearm.Left', GRIP_SHIELD)
recolour_slots(shield, 'RoughSteel', BRONZE, metal=True, name='CureteShield')
recolour_slots(shield, 'BlackenedIron', RED, name='CureteShieldRim')

spear = held(hero_part('staff'), 'Staff', 'Hand.Right', GRIP_STAFF)
recolour_slots(spear, 'Wood', (0.3, 0.2, 0.12), name='SpearShaft')
recolour_slots(spear, 'ClothWrap', RED, name='SpearWrap')
recolour_slots(spear, 'Crystal', BRONZE, metal=True, name='SpearSocket')
fork_head(spear, 'SpearSocket', D.materials['SpearSocket'], prongs=1, spread=0.03, length=0.16)

tusk = material('BoarTusk', (0.88, 0.84, 0.72))
leather = material('HelmLeather', (0.3, 0.2, 0.12))
with rest_pose():
    helm = [add('cone', 'Helmet', leather, (0.0, 0.03, 1.8), (0.105, 0.125, 0.11), vertices=16, radius1=1,
                radius2=0.25, depth=2, smooth=True)]
    # The rows of boar's tusk plates: ivory bands around the cone.
    for i, (z, r) in enumerate(((1.73, 1.0), (1.79, 0.8), (1.85, 0.58))):
        helm.append(add('torus', f'Tusks.{i}', tusk, (0.0, 0.03, z), (0.105 * r, 0.125 * r, 0.1),
                        major_radius=1, minor_radius=0.18, major_segments=16, minor_segments=6))
for ob in helm:
    attach(ob, 'Head')
