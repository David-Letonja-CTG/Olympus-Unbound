# Siren: the bird-women of the Aegean whose song wrecks ships. Flare's heroine (clothes.blend) in sea-foam robes,
# copper hair, pale skin, eyes glowing sea-green, with white-grey feathered wings along her arms.
#   source: isometric_hero_heroine_blend/isometric_heroine_blender/clothes.blend
from flare_lib import *

ROBE = (0.78, 0.82, 0.8)
SKIN = (0.8, 0.72, 0.66)
for name in ('TanCloth', 'WhiteCloth', 'BlueCloth'):
    recolour(name, ROBE)
recolour('Skin', SKIN)
recolour('Leather', (0.5, 0.42, 0.3))
recolour('LightLeather', (0.86, 0.7, 0.36))  # gold
recolour('Black', (0.1, 0.1, 0.12))
recolour('Metal', (0.86, 0.7, 0.36), metal=True)

head, hair = heroine_head()
recolour_slots(head, 'Skin', SKIN, name='SirenSkin')
recolour_slots(hair, 'DarkHair', (0.62, 0.3, 0.14), name='CopperHair')
recolour_slots(hair, 'HairHighlights', (0.86, 0.5, 0.24), name='CopperSheen')

feathers = material('SirenFeathers', (0.72, 0.74, 0.76))
tips = material('SirenFeatherTips', (0.36, 0.4, 0.46))
eye = glow('SirenEyes', (0.45, 1.0, 0.85), 8.0)
with rest_pose():
    eyes = [add('uv_sphere', f'Eye.{s}', eye, (0.03 * s, -0.082, 1.665), (0.012, 0.008, 0.009),
                segments=8, ring_count=6, radius=1) for s in (-1, 1)]
    wings = []
    for side, label in ((-1, 'Right'), (1, 'Left')):
        for blade, along in wing(f'Wing.{label}', feathers, tips, (0.16 * side, 0.12, 1.45),
                                 (0.78 * side, 0.1, 1.48), side):
            wings.append((blade, f'Upperarm.{label}' if along < 0.5 else f'Forearm.{label}'))
for ob in eyes:
    attach(ob, 'Head')
for blade, bone in wings:
    attach(blade, bone)
