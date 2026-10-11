# Harpy: Flare's heroine (clothes.blend) with slate feathers, pale grey skin, yellow taloned feet, black hair,
# eyes lit by corruption, and feathered wings along both arms, so they beat as she runs.
#   source: isometric_hero_heroine_blend/isometric_heroine_blender/clothes.blend
from flare_lib import *

FEATHER = (0.25, 0.21, 0.29)
SKIN = (0.66, 0.6, 0.6)
for name in ('TanCloth', 'WhiteCloth', 'BlueCloth'):
    recolour(name, FEATHER)
recolour('Skin', SKIN)
recolour('Leather', (0.76, 0.6, 0.22))   # scaled talons
recolour('LightLeather', (0.2, 0.17, 0.22))
recolour('Black', (0.12, 0.1, 0.13))
recolour('Metal', (0.7, 0.5, 0.26), metal=True)

head, hair = heroine_head()
recolour_slots(head, 'Skin', SKIN, name='HarpySkin')
recolour_slots(hair, 'DarkHair', (0.06, 0.05, 0.07), name='HarpyHair')
recolour_slots(hair, 'HairHighlights', (0.2, 0.12, 0.24), name='HarpySheen')

feathers = material('Feathers', FEATHER)
tips = material('FeatherTips', (0.12, 0.1, 0.14))
eye = glow('HarpyEyes', (0.61, 1.0, 0.42), 8.0)
with rest_pose():
    eyes = [add('uv_sphere', f'Eye.{s}', eye, (0.03 * s, -0.082, 1.665), (0.012, 0.008, 0.009),
                segments=8, ring_count=6, radius=1) for s in (-1, 1)]
    wings = []
    for side, label in ((-1, 'Right'), (1, 'Left')):
        for blade, along in wing(f'Wing.{label}', feathers, tips, (0.16 * side, 0.12, 1.45),
                                 (0.76 * side, 0.1, 1.47), side):
            wings.append((blade, f'Upperarm.{label}' if along < 0.5 else f'Forearm.{label}'))
for ob in eyes:
    attach(ob, 'Head')
for blade, bone in wings:
    attach(blade, bone)
