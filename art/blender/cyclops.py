# The Cyclops: VWolfdog's Flare troll (built on Clint Bellanger's base human) reshaped into the forge-giant of the
# mountain: earthen grey-bronze skin, the two eyes closed over, one great eye with an ember-red iris (beasts have
# ember-red eyes, docs/art-direction.md), and its tree-trunk club.
#   source: Troll.blend
from flare_lib import *

RESOLUTION = 1024  # the troll is framed wider than the hero (256 px frames)
SKIN = (0.48, 0.39, 0.32)
recolour('skin', SKIN)
for old_eye in ('Fine White Cloth', 'Dark Cloth'):
    recolour(old_eye, SKIN)
recolour('Hair', (0.16, 0.12, 0.1))  # one heavy brow
recolour('Wood', (0.34, 0.22, 0.13))
recolour('Leather', (0.26, 0.17, 0.1))

white = material('EyeWhite', (0.92, 0.88, 0.8))
iris = glow('CyclopsIris', (1.0, 0.36, 0.1), 1.8)
with rest_pose():
    eyeball = add('uv_sphere', 'Eye', white, (0.0, -0.11, 1.77), (0.09, 0.05, 0.072),
                  segments=16, ring_count=10, radius=1, smooth=True)
    pupil = add('uv_sphere', 'Iris', iris, (0.0, -0.155, 1.77), (0.04, 0.016, 0.04),
                segments=12, ring_count=8, radius=1, smooth=True)
for ob in (eyeball, pupil):
    attach(ob, 'Head')
