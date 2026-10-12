# Lamia: the serpent-tailed queen of Libya, cursed by Hera, haunting the marsh. Flare's heroine (clothes.blend) to
# the hips, with a long tail of green-bronze scales coiling behind her, pale olive skin, black hair and slit-yellow
# serpent eyes.
#   source: isometric_hero_heroine_blend/isometric_heroine_blender/clothes.blend
from mathutils import Vector

from flare_lib import *

SCALES = (0.22, 0.3, 0.14)
BELLY = (0.6, 0.56, 0.3)
SKIN = (0.62, 0.62, 0.48)
b = body()
for name in ('TanCloth', 'WhiteCloth', 'BlueCloth'):
    recolour(name, (0.22, 0.3, 0.16))
recolour('Skin', SKIN)
recolour('Leather', (0.3, 0.24, 0.1))
recolour('LightLeather', (0.62, 0.5, 0.24))  # a gold girdle
recolour('Black', (0.06, 0.05, 0.04))
recolour('Metal', (0.7, 0.55, 0.25), metal=True)
strip_below(b, 0.86)  # the woman ends at the hips; the serpent begins

head, hair = heroine_head()
recolour_slots(head, 'Skin', SKIN, name='LamiaSkin')
recolour_slots(hair, 'DarkHair', (0.05, 0.05, 0.04), name='LamiaHair')
recolour_slots(hair, 'HairHighlights', (0.2, 0.24, 0.1), name='LamiaSheen')

eye = glow('LamiaEyes', (0.98, 0.86, 0.2), 8.0)
scales = material('LamiaScales', SCALES)
belly = material('LamiaBelly', BELLY)
# The tail: overlapping scaled segments from the hips down to the ground and into a coil behind her.
path = [Vector(p) for p in ((0, 0.04, 0.9), (0, 0.1, 0.55), (0, 0.2, 0.2), (0.05, 0.38, 0.08),
                            (0.22, 0.55, 0.07), (0.38, 0.5, 0.06), (0.42, 0.32, 0.05))]
segments = []
with rest_pose():
    eyes = [add('uv_sphere', f'Eye.{s}', eye, (0.03 * s, -0.082, 1.665), (0.012, 0.008, 0.009),
                segments=8, ring_count=6, radius=1) for s in (-1, 1)]
    count = 26
    for i in range(count):
        t = i / (count - 1)
        f = t * (len(path) - 1)
        k = min(int(f), len(path) - 2)
        p = path[k].lerp(path[k + 1], f - k)
        r = 0.13 * (1 - t) + 0.025 * t
        segments.append(add('uv_sphere', f'Tail.{i}', scales if i % 3 else belly, p, (r, r, r * 0.85),
                            segments=12, ring_count=8, radius=1, smooth=True))
for ob in eyes:
    attach(ob, 'Head')
for ob in segments:
    attach(ob, 'Hip')
