# Naiad: a nymph of Lerna's springs, her waters poisoned by the Hydra. Flare's heroine (clothes.blend) in robes the
# green of still water to the ankle, kelp-dark hair, pale sea-green skin and a staff crowned with venom that she
# hurls; eyes lit by the poison.
#   source: isometric_hero_heroine_blend/isometric_heroine_blender/clothes.blend
from flare_lib import *

ROBE = (0.1, 0.28, 0.24)
SKIN = (0.56, 0.68, 0.62)
b = body()
for name in ('TanCloth', 'WhiteCloth', 'BlueCloth'):
    recolour(name, ROBE)
recolour('Skin', SKIN)
recolour('Leather', (0.08, 0.14, 0.1))
recolour('LightLeather', (0.5, 0.6, 0.4))
recolour('Black', (0.04, 0.08, 0.06))
recolour('Metal', (0.5, 0.62, 0.5), metal=True)
split_by_height(b, 'Leather', D.materials['BlueCloth'], 0.55)  # the robe covers the boots to the ankle

head, hair = heroine_head()
recolour_slots(head, 'Skin', SKIN, name='NaiadSkin')
recolour_slots(hair, 'DarkHair', (0.06, 0.16, 0.1), name='KelpHair')
recolour_slots(hair, 'HairHighlights', (0.16, 0.32, 0.18), name='KelpSheen')

staff = held(heroine_part('staff'), 'Staff', 'Hand.Right', GRIP_HEROINE_STAFF)
recolour_slots(staff, 'Wood', (0.14, 0.12, 0.08), name='DriftWood')
set_slots(staff, 'Crystal', glow('Venom', (0.55, 1.0, 0.2), 4.0))
recolour_slots(staff, 'ClothWrap', ROBE, name='RobeWrap')

eye = glow('NaiadEyes', (0.55, 1.0, 0.3), 8.0)
with rest_pose():
    eyes = [add('uv_sphere', f'Eye.{s}', eye, (0.03 * s, -0.082, 1.665), (0.012, 0.008, 0.009),
                segments=8, ring_count=6, radius=1) for s in (-1, 1)]
for ob in eyes:
    attach(ob, 'Head')
