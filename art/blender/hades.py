# Hades: Flare's hero in steel armour (steel_armor.blend), the steel blackened, a crimson tabard, pale skin, black
# hair and beard, eyes and gems lit by teal soul-fire, a spiked iron crown, and a bident (the hero's staff in dark
# iron with two prongs at its tip).
#   source: isometric_hero_heroine_blend/isometric_hero_blender/steel_armor.blend
from math import cos, pi, sin

from flare_lib import *

IRON = (0.17, 0.16, 0.19)
PALE = (0.7, 0.64, 0.62)
recolour('Steel', IRON, metal=True)
recolour('SteelDull', (0.11, 0.1, 0.12), metal=True)
recolour('WhiteCloth.001', (0.42, 0.07, 0.09))  # crimson tabard
recolour('Leather.001', (0.07, 0.06, 0.08))
recolour('Skin', PALE)

head = append(hero_part('male_head1'), 'MaleHead1')
head.name = 'HadesHead'
rig_like_body(head)
recolour_slots(head, 'DarkHair', (0.04, 0.04, 0.05), name='SableHair')  # not 'Black…': that is the eyes
recolour_slots(head, 'Skin', PALE, name='PaleSkin')
soul_fire = glow('SoulFire', (0.5, 1.0, 0.84), 5.0)
set_slots(head, 'Black', soul_fire)

bident = held(hero_part('staff'), 'Staff', 'Hand.Right', GRIP_STAFF)
recolour_slots(bident, 'Wood', IRON, metal=True, name='BidentShaft')
recolour_slots(bident, 'ClothWrap', (0.42, 0.07, 0.09), name='BidentWrap')
set_slots(bident, 'Crystal', glow('BidentGlow', (0.5, 1.0, 0.84), 2.0))

iron = material('CrownIron', IRON, metal=True)
black = material('BlackBeard', (0.05, 0.05, 0.06))
with rest_pose():
    beard = add('uv_sphere', 'Beard', black, (0.0, -0.095, 1.615), (0.08, 0.056, 0.095),
                segments=12, ring_count=8, radius=1, smooth=True)
    crown = [add('torus', 'CrownBand', iron, (0.0, 0.02, 1.81), (0.1, 0.13, 0.1), (0.15, 0, 0),
                 major_radius=1.0, minor_radius=0.12, major_segments=24, minor_segments=6)]
    for i in range(7):
        a = pi * (0.15 + 0.7 * i / 6)  # spikes across the front half of the band
        x, y = 0.098 * cos(a), -0.12 * sin(a) + 0.02
        crown.append(add('cone', f'CrownSpike.{i}', iron, (x, y, 1.86), (0.014, 0.014, 0.05),
                         vertices=6, radius1=1, radius2=0, depth=2))
    crown.append(add('uv_sphere', 'CrownGem', soul_fire, (0.0, -0.11, 1.83), (0.014, 0.01, 0.014),
                     segments=8, ring_count=6, radius=1))
for ob in (beard, *crown):
    attach(ob, 'Head')
fork_head(bident, 'BidentGlow', iron, prongs=2)  # the soul-fire gem glows between the prongs
