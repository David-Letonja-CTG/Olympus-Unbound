# An armour look as a layer (gear.py): LOOK 1-3 on the hero or heroine file the render was started with.
#   source: isometric_hero_heroine_blend/isometric_{hero,heroine}_blender/clothes.blend
import os

from gear import *

hide_body()
armour(int(os.environ['LOOK']))
