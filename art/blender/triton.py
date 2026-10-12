# Triton: a merman of Poseidon's train. Flare's hero (clothes.blend) to the hips, sea-green skin and kelp hair, a
# scaled fish tail sweeping behind him to a fluke, and a bronze trident.
#   source: isometric_hero_heroine_blend/isometric_hero_blender/clothes.blend
from math import radians

from flare_lib import *

SKIN = (0.36, 0.52, 0.46)
b = body()
recolour('TanCloth', (0.16, 0.34, 0.32))
recolour('WhiteCloth', (0.7, 0.8, 0.76))
recolour('BlueCloth', (0.16, 0.34, 0.32))
recolour('Skin.001', SKIN)
recolour('Leather', (0.2, 0.26, 0.2))
recolour('LightLeather', (0.66, 0.5, 0.26))
recolour('Metal', (0.66, 0.46, 0.24), metal=True)
strip_below(b, 0.9)  # the man ends at the hips; the fish begins

head = append(hero_part('male_head1'), 'MaleHead1')
head.name = 'TritonHead'
rig_like_body(head)
recolour_slots(head, 'DarkHair', (0.08, 0.2, 0.14), name='KelpHair')
recolour_slots(head, 'Skin', SKIN, name='TritonSkin')
set_slots(head, 'Black', glow('TritonEyes', (0.4, 0.95, 1.0), 8.0))

trident = held(hero_part('staff'), 'Staff', 'Hand.Right', GRIP_STAFF)
recolour_slots(trident, 'Wood', (0.66, 0.46, 0.24), metal=True, name='TridentBronze')
recolour_slots(trident, 'ClothWrap', (0.16, 0.34, 0.32), name='TridentWrap')
set_slots(trident, 'Crystal', glow('TritonCrystal', (0.4, 0.95, 1.0), 1.4))
fork_head(trident, 'TritonCrystal', D.materials['TridentBronze'], prongs=3, spread=0.06, length=0.13)

scales = material('TritonScales', (0.16, 0.42, 0.4))
light = material('TritonScalesLight', (0.4, 0.66, 0.56))
fin = material('TritonFin', (0.3, 0.6, 0.56))
with rest_pose():
    tail = scaled_tail([(0, 0.04, 0.95), (0, 0.12, 0.6), (0, 0.24, 0.25), (0, 0.42, 0.1), (0, 0.6, 0.12)],
                       [scales, scales, light], 22, 0.14, 0.035, name='FishTail')
    flukes = [add('cone', f'Fluke.{s}', fin, (0.07 * s, 0.7, 0.14), (0.05, 0.12, 0.012),
                  (radians(90), 0, radians(30 * s)), vertices=3, radius1=1, radius2=0, depth=1)
              for s in (-1, 1)]
for ob in (*tail, *flukes):
    attach(ob, 'Hip')
