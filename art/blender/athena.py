# Athena: Flare's heroine in steel armour (steel_armor.blend) turned to bronze and gold with a deep-blue skirt,
# long dark hair under a crested gold helmet, the Aegis (the heroine's shield in bronze and gold) and a spear (the
# heroine's staff with a bronze blade).
#   source: isometric_hero_heroine_blend/isometric_heroine_blender/steel_armor.blend
from flare_lib import *

BRONZE = (0.78, 0.58, 0.28)
GOLD = (0.96, 0.78, 0.34)
recolour('Steel', BRONZE, metal=True)
recolour('SteelDull', (0.5, 0.36, 0.18), metal=True)
recolour('Leather', (0.14, 0.2, 0.38))  # deep-blue skirt and straps
recolour('Skin', (0.74, 0.57, 0.44))

head, hair = heroine_head()
recolour_slots(hair, 'DarkHair', (0.2, 0.12, 0.07), name='AthenaHair')
recolour_slots(hair, 'HairHighlights', (0.34, 0.22, 0.12), name='AthenaSheen')

aegis = held(heroine_part('shield'), 'HeavyShield', 'Forearm.Left', GRIP_HEROINE_SHIELD)
recolour_slots(aegis, 'RoughSteel', BRONZE, metal=True, name='AegisBronze')
recolour_slots(aegis, 'BlackenedIron', GOLD, metal=True, name='AegisGold')

spear = held(heroine_part('staff'), 'Staff', 'Hand.Right', GRIP_HEROINE_STAFF)
recolour_slots(spear, 'Wood', (0.3, 0.2, 0.12), name='SpearShaft')
recolour_slots(spear, 'ClothWrap', (0.14, 0.2, 0.38), name='SpearWrap')
recolour_slots(spear, 'Crystal', BRONZE, metal=True, name='SpearSocket')

gold = material('HelmGold', GOLD, metal=True)
crest = material('HelmCrest', (0.56, 0.1, 0.1))
with rest_pose():
    helm = add('uv_sphere', 'Helmet', gold, (0.0, 0.03, 1.77), (0.1, 0.125, 0.09),
               segments=16, ring_count=10, radius=1, smooth=True)
    # A solid horsehair crest: a thin disc front to back, its lower half inside the helmet.
    plume = add('cylinder', 'Crest', crest, (0.0, 0.04, 1.8), (0.12, 0.15, 0.022), (0, 1.5708, 0),
                vertices=24, radius=1, depth=2)
for ob in (helm, plume):
    attach(ob, 'Head')
fork_head(spear, 'SpearSocket', D.materials['SpearSocket'], prongs=1, spread=0.03, length=0.16)

if EMPTY_HANDED:
    drop_held(spear)
