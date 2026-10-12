# Bronze Guardian: one of the kin of Talos, the bronze giant Hephaestus forged to guard Crete. Flare's hero in steel
# armour (steel_armor.blend) cast all in bronze, face and limbs too, with eyes and a furnace heart glowing molten
# through the plates: the ichor that runs in their single vein.
#   source: isometric_hero_heroine_blend/isometric_hero_blender/steel_armor.blend
from flare_lib import *

BRONZE = (0.66, 0.44, 0.22)
DARK = (0.4, 0.26, 0.14)
recolour('Steel', BRONZE, metal=True)
recolour('SteelDull', DARK, metal=True)
recolour('Skin', BRONZE, metal=True)
recolour('Leather.001', DARK, metal=True)
recolour('WhiteCloth.001', DARK, metal=True)
recolour('DarkHair.001', DARK, metal=True)

head = append(hero_part('male_head1'), 'MaleHead1')
head.name = 'GuardianHead'
rig_like_body(head)
recolour_slots(head, 'DarkHair', DARK, metal=True, name='BronzeCurls')
recolour_slots(head, 'Skin', BRONZE, metal=True, name='BronzeFace')
molten = glow('Ichor', (1.0, 0.52, 0.12), 6.0)
set_slots(head, 'Black', molten)

with rest_pose():
    heart = add('uv_sphere', 'FurnaceHeart', molten, (0.0, -0.13, 1.36), (0.05, 0.02, 0.06), segments=12,
                ring_count=8, radius=1)
    seams = [add('cylinder', f'Seam.{s}', molten, (0.06 * s, -0.12, 1.25), (0.008, 0.008, 0.09), vertices=6,
                 radius=1, depth=2) for s in (-1, 1)]
for ob in (heart, *seams):
    attach(ob, 'Back')
