# Cerberus, the three-headed hound of the Underworld: Quaternius's CC0 animated wolf with two more heads grown from
# its own neck, soot-black fur, ember eyes (beasts have ember-red eyes, docs/art-direction.md) and the serpent mane
# of the myth as a ridge of smouldering spines; on the troll file's stage (camera, sun, platform) so it shares the
# cast's light and angle (D15).
#   source: Troll.blend (stage only) + quaternius-animals/.../Blends/Wolf.blend
# Frames: idle 1-4, walk 5-12, death 13-18.
from beasts import hound

RESOLUTION = 1024  # framed like the Cyclops (256 px frames)
FRAMES = '1-18'
hound(3.1, (0.11, 0.09, 0.09), (1.0, 0.32, 0.08), extra_heads=((-42, 0.07), (42, -0.04)), mane=True)
