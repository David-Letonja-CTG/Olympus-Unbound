# A held weapon as a layer (gear.py): WEAPON on Flare's own layer file for its kind of weapon (staff, longsword,
# longbow, wand or rod), where the figure is already hidden and the weapon already in the hand.
#   source: isometric_hero_heroine_blend/isometric_{hero,heroine}_blender/<kind>.blend
import os

from gear import *

hide_body()
weapon(os.environ['WEAPON'])
