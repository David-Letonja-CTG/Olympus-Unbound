# Fury (one of the Erinyes): the avengers of the Underworld. Flare's heroine (clothes.blend) in blood-dark robes,
# ash-grey skin, serpent-green hair, eyes burning crimson, and black bat-like wings along her arms.
#   source: isometric_hero_heroine_blend/isometric_heroine_blender/clothes.blend
from flare_lib import *

ROBE = (0.28, 0.05, 0.06)
SKIN = (0.52, 0.5, 0.5)
for name in ('TanCloth', 'WhiteCloth', 'BlueCloth'):
    recolour(name, ROBE)
recolour('Skin', SKIN)
recolour('Leather', (0.1, 0.06, 0.06))
recolour('LightLeather', (0.16, 0.06, 0.06))
recolour('Black', (0.08, 0.05, 0.05))
recolour('Metal', (0.42, 0.3, 0.2), metal=True)

head, hair = heroine_head()
recolour_slots(head, 'Skin', SKIN, name='FurySkin')
recolour_slots(hair, 'DarkHair', (0.1, 0.2, 0.1), name='SerpentHair')
recolour_slots(hair, 'HairHighlights', (0.22, 0.38, 0.14), name='SerpentSheen')

membrane = material('FuryWing', (0.1, 0.06, 0.07))
tips = material('FuryWingTips', (0.32, 0.05, 0.05))
eye = glow('FuryEyes', (1.0, 0.12, 0.08), 9.0)
with rest_pose():
    eyes = [add('uv_sphere', f'Eye.{s}', eye, (0.03 * s, -0.082, 1.665), (0.012, 0.008, 0.009),
                segments=8, ring_count=6, radius=1) for s in (-1, 1)]
    wings = []
    for side, label in ((-1, 'Right'), (1, 'Left')):
        for blade, along in wing(f'Wing.{label}', membrane, tips, (0.16 * side, 0.12, 1.45),
                                 (0.8 * side, 0.12, 1.52), side, count=9, droop=0.6):
            wings.append((blade, f'Upperarm.{label}' if along < 0.5 else f'Forearm.{label}'))
for ob in eyes:
    attach(ob, 'Head')
for blade, bone in wings:
    attach(blade, bone)
