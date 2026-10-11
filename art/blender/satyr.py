# Satyr: Flare's hero (clothes.blend) bare-chested, with shaggy goat-fur legs, dark hooves, curling horns and a
# goat beard, eyes lit by corruption, carrying a thyrsus (the hero's staff tipped with a pine cone).
#   source: isometric_hero_heroine_blend/isometric_hero_blender/clothes.blend
from math import pi

from flare_lib import *

SKIN = (0.66, 0.44, 0.3)
recolour('TanCloth', SKIN)
recolour('WhiteCloth', SKIN)
recolour('Skin.001', SKIN)
recolour('BlueCloth', (0.3, 0.2, 0.12))       # goat fur
recolour('Leather', (0.12, 0.09, 0.07))       # hooves and wrist wraps
recolour('LightLeather', (0.35, 0.22, 0.12))
recolour('Metal', (0.72, 0.5, 0.25), metal=True)

head = append(hero_part('male_head1'), 'MaleHead1')
head.name = 'SatyrHead'
rig_like_body(head)
recolour_slots(head, 'DarkHair', (0.2, 0.12, 0.07), name='SatyrHair')
recolour_slots(head, 'Skin', SKIN, name='SatyrSkin')
corrupt_eyes(head)

thyrsus = held(hero_part('staff'), 'Staff', 'Hand.Right', GRIP_STAFF)
recolour_slots(thyrsus, 'Wood', (0.32, 0.2, 0.1), name='DarkWood')
recolour_slots(thyrsus, 'Crystal', (0.36, 0.26, 0.12), name='PineCone')
recolour_slots(thyrsus, 'ClothWrap', (0.25, 0.4, 0.15), name='Ivy')

horn = material('Horn', (0.78, 0.7, 0.55))
beard = material('GoatBeard', (0.2, 0.12, 0.07))
with rest_pose():
    horns = [
        add('cone', f'Horn.{side}', horn, (0.06 * side, 0.02, 1.87), (0.036, 0.036, 0.16),
            (-0.9, 0.5 * side, 0), vertices=10, radius1=1, radius2=0, depth=2, smooth=True)
        for side in (-1, 1)
    ]
    goatee = add('cone', 'Goatee', beard, (0.0, -0.105, 1.575), (0.03, 0.025, 0.06), (pi - 0.3, 0, 0),
                 vertices=8, radius1=1, radius2=0, depth=2, smooth=True)
for ob in (*horns, goatee):
    attach(ob, 'Head')
