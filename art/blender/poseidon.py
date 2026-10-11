# Poseidon: Flare's hero (clothes.blend) in a sea-green chiton and kilt with bronze and gold, sun-dark skin, long
# dark-teal hair and beard, a gold crown with a sea gem, and a golden trident (the hero's staff with three
# prongs around a glowing aquamarine).
#   source: isometric_hero_heroine_blend/isometric_hero_blender/clothes.blend
from math import cos, pi, sin

from flare_lib import *

SEA = (0.18, 0.46, 0.44)
SKIN = (0.62, 0.44, 0.3)
GOLD = (0.96, 0.76, 0.3)
b = body()
recolour('TanCloth', SEA)
recolour('WhiteCloth', (0.86, 0.92, 0.9))  # sea-foam trim
recolour('BlueCloth', SEA)
recolour('Skin.001', SKIN)
recolour('Leather', (0.42, 0.28, 0.14))
recolour('LightLeather', GOLD)
recolour('Metal', (0.8, 0.56, 0.26), metal=True)
split_by_height(b, 'BlueCloth', D.materials['Skin.001'], 0.6)  # kilt to the knee, bare shins

head = append(hero_part('male_head1'), 'MaleHead1')
head.name = 'PoseidonHead'
rig_like_body(head)
recolour_slots(head, 'DarkHair', (0.07, 0.2, 0.22), name='SeaHair')
recolour_slots(head, 'Skin', SKIN, name='SunSkin')

trident = held(hero_part('staff'), 'Staff', 'Hand.Right', GRIP_STAFF)
recolour_slots(trident, 'Wood', GOLD, metal=True, name='TridentGold')
recolour_slots(trident, 'ClothWrap', SEA, name='TridentWrap')
set_slots(trident, 'Crystal', glow('SeaCrystal', (0.4, 0.95, 1.0), 1.6))

gold = material('CrownGold', GOLD, metal=True)
hair = material('SeaBeard', (0.07, 0.2, 0.22))
with rest_pose():
    beard = add('uv_sphere', 'Beard', hair, (0.0, -0.095, 1.6), (0.08, 0.056, 0.11),
                segments=12, ring_count=8, radius=1, smooth=True)
    crown = [add('torus', 'CrownBand', gold, (0.0, 0.02, 1.81), (0.1, 0.13, 0.1), (0.15, 0, 0),
                 major_radius=1.0, minor_radius=0.12, major_segments=24, minor_segments=6)]
    for i in range(5):
        a = pi * (0.2 + 0.6 * i / 4)
        x, y = 0.098 * cos(a), -0.12 * sin(a) + 0.02
        crown.append(add('cone', f'CrownPoint.{i}', gold, (x, y, 1.865), (0.016, 0.016, 0.055),
                         vertices=6, radius1=1, radius2=0, depth=2))
    crown.append(add('uv_sphere', 'CrownGem', glow('SeaGem', (0.4, 0.95, 1.0), 2.0), (0.0, -0.11, 1.825),
                     (0.016, 0.011, 0.016), segments=8, ring_count=6, radius=1))
for ob in (beard, *crown):
    attach(ob, 'Head')
fork_head(trident, 'SeaCrystal', D.materials['TridentGold'], prongs=3, spread=0.07, length=0.15)
