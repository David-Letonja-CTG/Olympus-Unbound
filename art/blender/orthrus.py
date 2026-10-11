# Orthrus, Cerberus's two-headed brother: Quaternius's CC0 animated wolf with a second head grown from its neck,
# ash-brown fur and ember eyes, on the hero file's stage so it stands with the cast (D15).
#   source: isometric_hero_heroine_blend/isometric_hero_blender/clothes.blend (stage only)
#           + quaternius-animals/.../Blends/Wolf.blend
# Frames: idle 1-4, walk 5-12, death 13-18.
from beasts import hound

FRAMES = '1-18'
hound(1.15, (0.24, 0.19, 0.16), (1.0, 0.36, 0.1), extra_heads=((-50, 0.12),))
