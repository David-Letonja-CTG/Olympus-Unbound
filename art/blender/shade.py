# Shade: a spirit of the dead from the fields of Asphodel. Flare's hero (clothes.blend), every garment, limb and
# hair turned to one pale, translucent grey-blue that glows faintly in the dark, with hollow cyan eyes.
#   source: isometric_hero_heroine_blend/isometric_hero_blender/clothes.blend
from flare_lib import *

head = append(hero_part('male_head1'), 'MaleHead1')
head.name = 'ShadeHead'
rig_like_body(head)
eyes = glow('ShadeEyes', (0.55, 0.95, 1.0), 9.0)
set_slots(head, 'Black', eyes)
dress_all(ghost('ShadeMist', (0.58, 0.66, 0.78), 0.62, 0.35), keep=('Invis', 'ShadeEyes'))
