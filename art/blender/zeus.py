# Zeus: Flare's hero (clothes.blend) in a knee-length white chiton with gold belt and bracers, silver hair and
# beard, a gold laurel, and the great staff as a golden sceptre crowned with a storm crystal.
#   source: isometric_hero_heroine_blend/isometric_hero_blender/clothes.blend
from flare_lib import *

b = body()
recolour('TanCloth', (0.93, 0.9, 0.82))
recolour('WhiteCloth', (0.97, 0.95, 0.9))
recolour('BlueCloth', (0.93, 0.9, 0.82))
recolour('Leather', (0.55, 0.38, 0.16))
recolour('LightLeather', (0.86, 0.66, 0.24))
recolour('Metal', (0.95, 0.78, 0.35), metal=True)
split_by_height(b, 'BlueCloth', D.materials['Skin.001'], 0.6)  # chiton to the knee, bare shins

head = append(hero_part('male_head1'), 'MaleHead1')
head.name = 'ZeusHead'
rig_like_body(head)
recolour_slots(head, 'DarkHair', (0.86, 0.86, 0.88), name='SilverHair')

sceptre = held(hero_part('greatstaff'), 'GreatStaff', 'Hand.Right', GRIP_GREATSTAFF)
recolour_slots(sceptre, 'DarkSteel', (0.98, 0.8, 0.32), metal=True, name='Gold')
set_slots(sceptre, 'BlueCrystal', glow('StormCrystal', (0.75, 0.9, 1.0), 6.0))

# Beard and laurel on the head (face looks along -Y; chin at z 1.60, crown 1.87 in the rest pose).
silver = material('SilverBeard', (0.88, 0.88, 0.9))
gold = material('LaurelGold', (0.98, 0.78, 0.28), metal=True)
with rest_pose():
    beard = add('uv_sphere', 'Beard', silver, (0.0, -0.095, 1.615), (0.078, 0.055, 0.09),
                segments=12, ring_count=8, radius=1, smooth=True)
    laurel = add('torus', 'Laurel', gold, (0.0, 0.02, 1.80), (0.097, 0.13, 0.097), (0.2, 0, 0),
                 major_radius=1.0, minor_radius=0.12, major_segments=24, minor_segments=6)
attach(beard, 'Head')
attach(laurel, 'Head')
