# Swamp serpent: a brood-snake of the Hydra from the Lernaean marsh. methodical pixel's CC0 animated snake,
# thickened, black-green scales and sickly yellow eyes, on the hero file's stage (D15).
#   source: isometric_hero_heroine_blend/isometric_hero_blender/clothes.blend (stage only) + snake/snake/snake.blend
# Frames: idle 1-4, walk 5-12, death 13-18.
from beasts import serpent

FRAMES = '1-18'
serpent(1.7, (0.12, 0.2, 0.12), (0.4, 0.42, 0.22), (0.95, 0.9, 0.2), girth=4.5)
