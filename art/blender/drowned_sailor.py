# Drowned sailor: one of Odysseus's lost crew, risen from the wrecks of the Aegean. Flare's hero (clothes.blend) in
# sodden, sea-bleached tunic and kilt, grey-blue skin, hair hung with kelp, eyes lit a cold sea-green.
#   source: isometric_hero_heroine_blend/isometric_hero_blender/clothes.blend
from flare_lib import *

SKIN = (0.46, 0.54, 0.56)
recolour('TanCloth', (0.36, 0.38, 0.34))
recolour('WhiteCloth', (0.5, 0.52, 0.48))
recolour('BlueCloth', (0.24, 0.3, 0.32))
recolour('Skin.001', SKIN)
recolour('Leather', (0.2, 0.18, 0.14))
recolour('LightLeather', (0.32, 0.3, 0.24))
recolour('Metal', (0.36, 0.42, 0.38), metal=True)  # verdigris

head = append(hero_part('male_head1'), 'MaleHead1')
head.name = 'DrownedHead'
rig_like_body(head)
recolour_slots(head, 'DarkHair', (0.12, 0.2, 0.12), name='KelpHair')
recolour_slots(head, 'Skin', SKIN, name='DrownedSkin')
set_slots(head, 'Black', glow('DrownedEyes', (0.45, 1.0, 0.85), 8.0))

kelp = material('Kelp', (0.14, 0.26, 0.12))
with rest_pose():
    strands = [add('cylinder', f'Kelp.{i}', kelp, (x, y, z), (0.012, 0.012, h), vertices=6, radius=1, depth=2)
               for i, (x, y, z, h) in enumerate(((-0.12, 0.02, 1.32, 0.12), (0.13, 0.04, 1.3, 0.14),
                                                  (0.05, -0.08, 1.1, 0.1), (-0.06, 0.1, 1.2, 0.12)))]
for ob in strands:
    attach(ob, 'Back')
