# The Lernaean Hydra: five serpent necks rising from a moss-dark mound, swaying with their own slither, eyes
# burning sickly yellow; built from methodical pixel's CC0 animated snake on the troll file's stage (D15).
#   source: Troll.blend (stage only) + snake/snake/snake.blend
# Frames: idle 1-4, walk 5-12, death 13-18.
from beasts import hydra

RESOLUTION = 1024  # framed like the Cyclops (256 px frames)
FRAMES = '1-18'
hydra(5, 2.6, (0.14, 0.26, 0.14), (0.95, 0.9, 0.2), (0.12, 0.16, 0.1))
