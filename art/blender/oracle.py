# Fallen Oracle: a priestess of Delphi taken by the darkness. Flare's heroine (clothes.blend) in dark violet robes
# to the ankle, ash-white hair, eyes and staff crystal burning with corruption.
#   source: isometric_hero_heroine_blend/isometric_heroine_blender/clothes.blend
from flare_lib import *

ROBE = (0.2, 0.12, 0.24)
b = body()
for name in ('TanCloth', 'WhiteCloth', 'BlueCloth'):
    recolour(name, ROBE)
recolour('Skin', (0.62, 0.58, 0.56))
recolour('Leather', (0.12, 0.08, 0.12))
recolour('LightLeather', (0.62, 0.5, 0.24))  # tarnished gold girdle
recolour('Black', (0.08, 0.06, 0.09))
recolour('Metal', (0.62, 0.5, 0.24), metal=True)
split_by_height(b, 'Leather', D.materials['BlueCloth'], 0.55)  # the robe covers the boots to the ankle

head, hair = heroine_head()
recolour_slots(head, 'Skin', (0.62, 0.58, 0.56), name='OracleSkin')
recolour_slots(hair, 'DarkHair', (0.78, 0.76, 0.74), name='AshHair')
recolour_slots(hair, 'HairHighlights', (0.6, 0.58, 0.6), name='AshSheen')

staff = held(heroine_part('staff'), 'Staff', 'Hand.Right', GRIP_HEROINE_STAFF)
recolour_slots(staff, 'Wood', (0.18, 0.12, 0.1), name='BlackWood')
set_slots(staff, 'Crystal', glow('CorruptCrystal', (0.45, 1.0, 0.25), 2.5))
recolour_slots(staff, 'ClothWrap', ROBE, name='RobeWrap')

eye = glow('OracleEyes', (0.61, 1.0, 0.42), 8.0)
with rest_pose():
    eyes = [add('uv_sphere', f'Eye.{s}', eye, (0.03 * s, -0.082, 1.665), (0.012, 0.008, 0.009),
                segments=8, ring_count=6, radius=1) for s in (-1, 1)]
for ob in eyes:
    attach(ob, 'Head')
