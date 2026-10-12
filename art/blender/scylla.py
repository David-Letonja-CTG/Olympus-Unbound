# Scylla: the monster of the strait, once a nymph. Flare's heroine (clothes.blend) to the hips in sea-dark robes,
# grey-green skin and black hair; at her waist a ring of six hound heads (cut from Quaternius's CC0 wolf), beneath
# her six serpent-tentacles (methodical pixel's CC0 snake) writhing with their own slither. Framed wider and
# rendered larger than the heroine so she stands as a boss (D15).
#   source: isometric_hero_heroine_blend/isometric_heroine_blender/clothes.blend
#           + quaternius-animals/.../Wolf.blend + snake/snake/snake.blend
from beasts import hound_heads, tentacles
from flare_lib import *

RESOLUTION = 1024  # 256 px frames
D.objects['Camera'].data.ortho_scale *= 1.3  # room for the tentacles

SKIN = (0.5, 0.58, 0.52)
b = body()
for name in ('TanCloth', 'WhiteCloth', 'BlueCloth'):
    recolour(name, (0.1, 0.2, 0.22))
recolour('Skin', SKIN)
recolour('Leather', (0.12, 0.16, 0.14))
recolour('LightLeather', (0.5, 0.42, 0.26))
recolour('Black', (0.05, 0.06, 0.06))
recolour('Metal', (0.5, 0.42, 0.26), metal=True)
strip_below(b, 0.86)

head, hair = heroine_head()
recolour_slots(head, 'Skin', SKIN, name='ScyllaSkin')
recolour_slots(hair, 'DarkHair', (0.03, 0.05, 0.05), name='ScyllaHair')
recolour_slots(hair, 'HairHighlights', (0.1, 0.2, 0.2), name='ScyllaSheen')
eye = glow('ScyllaEyes', (0.4, 1.0, 0.9), 8.0)
with rest_pose():
    eyes = [add('uv_sphere', f'Eye.{s}', eye, (0.03 * s, -0.082, 1.665), (0.012, 0.008, 0.009),
                segments=8, ring_count=6, radius=1) for s in (-1, 1)]
for ob in eyes:
    attach(ob, 'Head')

with rest_pose():
    hound_heads(6, 0.24, 0.8, 0.36, (0.32, 0.29, 0.27), (1.0, 0.36, 0.1))
tentacles(6, 1.3, (0.14, 0.28, 0.26))
