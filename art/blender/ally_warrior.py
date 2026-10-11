# The intro's warrior: Flare's hero in leather armour with shield and longsword.
#   source: isometric_hero_heroine_blend/isometric_hero_blender/leather_armor.blend
from flare_lib import *

head = append(hero_part('male_head1'), 'MaleHead1')
rig_like_body(head)
held(hero_part('shield'), 'HeavyShield', 'Forearm.Left', GRIP_SHIELD)
held(hero_part('longsword'), 'Longsword', 'Hand.Right', GRIP_LONGSWORD)
