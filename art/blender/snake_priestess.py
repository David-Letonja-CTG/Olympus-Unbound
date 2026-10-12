# Snake priestess: a priestess of the Minoan serpent goddess, her house fallen with Knossos. Flare's heroine
# (clothes.blend) in a flounced skirt of ochre, cream and deep blue, a gold polos crown, and a snake coiled round
# each forearm, its head reared past her hand; her eyes and theirs burn gold.
#   source: isometric_hero_heroine_blend/isometric_heroine_blender/clothes.blend
from math import cos, pi, sin

from flare_lib import *

SKIN = (0.72, 0.54, 0.4)
b = body()
recolour('TanCloth', (0.78, 0.56, 0.22))
recolour('WhiteCloth', (0.86, 0.8, 0.66))
recolour('BlueCloth', (0.14, 0.22, 0.5))
recolour('Skin', SKIN)
recolour('Leather', (0.5, 0.12, 0.08))
recolour('LightLeather', (0.86, 0.68, 0.3))
recolour('Black', (0.06, 0.05, 0.04))
recolour('Metal', (0.86, 0.68, 0.3), metal=True)


head, hair = heroine_head()
recolour_slots(head, 'Skin', SKIN, name='PriestessSkin')
recolour_slots(hair, 'DarkHair', (0.05, 0.04, 0.03), name='PriestessHair')
recolour_slots(hair, 'HairHighlights', (0.16, 0.1, 0.06), name='PriestessSheen')

eye = glow('PriestessEyes', (1.0, 0.82, 0.25), 8.0)
gold = material('PolosGold', (0.86, 0.68, 0.3), metal=True)
scales = material('SnakeScales', (0.5, 0.62, 0.16))
bands = material('SnakeBands', (0.12, 0.1, 0.06))
with rest_pose():
    eyes = [add('uv_sphere', f'Eye.{s}', eye, (0.03 * s, -0.082, 1.665), (0.012, 0.008, 0.009),
                segments=8, ring_count=6, radius=1) for s in (-1, 1)]
    polos = add('cylinder', 'Polos', gold, (0.0, 0.0, 1.8), (0.085, 0.095, 0.05), vertices=16, radius=1, depth=2)
    snakes = []
    for side, label in ((-1, 'Right'), (1, 'Left')):
        coil = []
        n = 16
        for i in range(n):
            t = i / (n - 1)
            a = t * 4 * pi
            p = (side * (0.46 + 0.34 * t), 0.08 + 0.055 * cos(a), 1.47 + 0.055 * sin(a))
            r = 0.034 - 0.012 * t
            coil.append(add('uv_sphere', f'Snake.{label}.{i}', bands if i % 4 == 0 else scales, p, (r, r, r),
                            segments=10, ring_count=6, radius=1, smooth=True))
        # The head, reared up past the hand.
        coil.append(add('uv_sphere', f'SnakeHead.{label}', scales, (side * 0.86, 0.06, 1.56), (0.042, 0.03, 0.028),
                        segments=10, ring_count=6, radius=1, smooth=True))
        coil.append(add('uv_sphere', f'SnakeNeck.{label}', scales, (side * 0.83, 0.07, 1.51), (0.026, 0.026, 0.04),
                        segments=10, ring_count=6, radius=1, smooth=True))
        coil += [add('uv_sphere', f'SnakeEye.{label}.{k}', eye, (side * 0.87, 0.06 + 0.016 * k, 1.57),
                     (0.007, 0.007, 0.007), segments=6, ring_count=4, radius=1) for k in (-1, 1)]
        snakes.append((coil, f'Forearm.{label}'))
for ob in (*eyes, polos):
    attach(ob, 'Head')
for coil, bone in snakes:
    for ob in coil:
        attach(ob, bone)

# The flounced bell skirt of Minoan dress: tiers of ochre, cream and blue from the waist to the ankles, riding on the
# hips (her feet show beneath it as she walks).
tiers = [(0.92, 0.72, 0.13, 0.19, 'TanCloth'), (0.74, 0.5, 0.18, 0.25, 'BlueCloth'),
         (0.52, 0.28, 0.23, 0.3, 'WhiteCloth'), (0.3, 0.08, 0.28, 0.34, 'BlueCloth')]
with rest_pose():
    skirt = [add('cone', f'Flounce.{i}', D.materials[mat], (0.0, 0.02, (top + bottom) / 2), (1, 1.0, (top - bottom) / 2),
                 vertices=20, radius1=r1, radius2=r0, depth=2, smooth=True)
             for i, (top, bottom, r0, r1, mat) in enumerate(tiers)]
for ob in skirt:
    attach(ob, 'Hip')
