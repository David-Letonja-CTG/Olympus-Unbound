# The intro's smith: Flare's hero in work clothes, bald, with a soot-dark apron colour and a short blade.
#   source: isometric_hero_heroine_blend/isometric_hero_blender/clothes.blend
from flare_lib import *

recolour('TanCloth', (0.4, 0.32, 0.24))
recolour('BlueCloth', (0.24, 0.2, 0.17))
head = append(hero_part('male_head2'), 'MaleHead1')
rig_like_body(head)
held(hero_part('shortsword'), 'Shortsword', 'Hand.Right', GRIP_SHORTSWORD)
