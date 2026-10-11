# Lampad: a torch-bearing nymph of the Underworld, companion of Hecate. Flare's heroine (clothes.blend) in robes of
# midnight blue to the ankle, silver hair, and a staff crowned with cold blue soul-fire that lights her eyes too.
#   source: isometric_hero_heroine_blend/isometric_heroine_blender/clothes.blend
from flare_lib import *

ROBE = (0.08, 0.11, 0.24)
b = body()
for name in ('TanCloth', 'WhiteCloth', 'BlueCloth'):
    recolour(name, ROBE)
recolour('Skin', (0.7, 0.72, 0.78))
recolour('Leather', (0.06, 0.07, 0.12))
recolour('LightLeather', (0.62, 0.66, 0.74))  # silver girdle
recolour('Black', (0.05, 0.05, 0.08))
recolour('Metal', (0.7, 0.74, 0.82), metal=True)
split_by_height(b, 'Leather', D.materials['BlueCloth'], 0.55)  # the robe covers the boots to the ankle

head, hair = heroine_head()
recolour_slots(head, 'Skin', (0.7, 0.72, 0.78), name='LampadSkin')
recolour_slots(hair, 'DarkHair', (0.82, 0.86, 0.92), name='SilverHair')
recolour_slots(hair, 'HairHighlights', (0.62, 0.7, 0.86), name='SilverSheen')

torch = held(heroine_part('staff'), 'Staff', 'Hand.Right', GRIP_HEROINE_STAFF)
recolour_slots(torch, 'Wood', (0.1, 0.08, 0.1), name='BlackWood')
set_slots(torch, 'Crystal', glow('SoulFire', (0.35, 0.75, 1.0), 6.0))
recolour_slots(torch, 'ClothWrap', ROBE, name='RobeWrap')

eye = glow('LampadEyes', (0.45, 0.85, 1.0), 8.0)
with rest_pose():
    eyes = [add('uv_sphere', f'Eye.{s}', eye, (0.03 * s, -0.082, 1.665), (0.012, 0.008, 0.009),
                segments=8, ring_count=6, radius=1) for s in (-1, 1)]
for ob in eyes:
    attach(ob, 'Head')

# The torch's flame: a tongue of soul-fire on the staff's head, large enough to read in a crowd.
fire = glow('SoulFlame', (0.45, 0.82, 1.0), 9.0)
core = glow('SoulFlameCore', (0.85, 0.97, 1.0), 12.0)
with rest_pose():
    bpy.context.view_layer.update()
    top = max((torch.matrix_world @ v.co for v in torch.data.vertices), key=lambda p: p.z)
    flame = add('cone', 'Flame', fire, (top.x, top.y, top.z + 0.1), (0.085, 0.085, 0.2),
                vertices=10, radius1=1, radius2=0, depth=1, smooth=True)
    heart = add('uv_sphere', 'FlameCore', core, (top.x, top.y, top.z + 0.04), (0.06, 0.06, 0.07),
                segments=8, ring_count=6, radius=1)
for ob in (flame, heart):
    attach(ob, 'Hand.Right')
