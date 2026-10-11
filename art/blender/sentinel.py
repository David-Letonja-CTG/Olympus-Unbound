# Marble Sentinel: a temple statue of a hoplite brought to life by the darkness. Flare's hero in steel armour with
# shield and longsword, all carved in white marble, a horsehair crest on the head, eyes burning with corruption.
#   source: isometric_hero_heroine_blend/isometric_hero_blender/steel_armor.blend
from flare_lib import *

MARBLE = (0.86, 0.84, 0.79)
VEIN = (0.7, 0.68, 0.64)
for m in list(D.materials):
    if m.name.startswith(('ShadowCatcher', 'Invis')):
        continue
    m.diffuse_color = (*(VEIN if m.name.startswith(('SteelDull', 'Leather')) else MARBLE), 1)
    m.specular_intensity = 0.0

head = append(hero_part('male_head1'), 'MaleHead1')
head.name = 'StatueHead'
rig_like_body(head)
recolour_slots(head, 'DarkHair', VEIN, name='MarbleHair')
recolour_slots(head, 'Skin', MARBLE, name='MarbleFace')
corrupt_eyes(head)

shield = held(hero_part('shield'), 'HeavyShield', 'Forearm.Left', GRIP_SHIELD)
sword = held(hero_part('longsword'), 'Longsword', 'Hand.Right', GRIP_LONGSWORD)
for ob in (shield, sword):
    for slot in ob.material_slots:
        if slot.material:
            m = slot.material.copy()
            m.diffuse_color = (*MARBLE, 1)
            m.specular_intensity = 0.0
            slot.material = m

with rest_pose():
    crest = add('torus', 'Crest', material('CrestMarble', VEIN), (0.0, 0.03, 1.86), (0.13, 0.15, 0.03),
                (0, 1.5708, 0), major_radius=1.0, minor_radius=0.35, major_segments=20, minor_segments=6)
attach(crest, 'Head')
