# Asterion: the Minotaur, king of the Labyrinth, son of Pasiphae and the Cretan bull. VWolfdog's Flare troll (built
# on Clint Bellanger's base human) as a hulking bull-man: dark hide, a modelled bull's head with ivory horns, a gold
# ring through the muzzle and ember-red eyes (beasts have ember-red eyes, docs/art-direction.md), a Minoan red kilt,
# and his club turned into a bronze labrys, the double axe of Knossos.
#   source: Troll.blend
from flare_lib import *

RESOLUTION = 1024  # framed like the Cyclops (256 px frames)
HIDE = (0.36, 0.24, 0.17)
recolour('skin', HIDE)
for old_eye in ('Fine White Cloth', 'Dark Cloth'):
    recolour(old_eye, HIDE)
recolour('Hair', (0.12, 0.08, 0.06))
recolour('Leather', (0.52, 0.12, 0.08))  # Minoan red
recolour('Leather.001', (0.78, 0.6, 0.26), metal=True)
recolour('Leather Boots', (0.2, 0.13, 0.09))
recolour('Wood', (0.3, 0.2, 0.12))

hide = material('BullHide', HIDE)
snout = material('BullMuzzle', (0.5, 0.36, 0.3))
horn = material('BullHorn', (0.86, 0.8, 0.66))
dark = material('BullNostril', (0.04, 0.03, 0.03))
gold = material('Gold', (0.86, 0.68, 0.3), metal=True)
bronze = material('LabrysBronze', (0.74, 0.5, 0.26), metal=True)
eye = glow('AsterionEyes', (1.0, 0.3, 0.08), 6.0)


def horn_piece(name, root, direction, length, r0, r1):
    """A tapered round length of horn from `root` along `direction` (rest-pose world space)."""
    from mathutils import Vector

    d = Vector(direction).normalized()
    ob = add('cone', name, horn, Vector(root) + d * (length / 2), (1, 1, length / 2), vertices=10, radius1=r0,
             radius2=r1, depth=2, smooth=True)
    ob.rotation_mode = 'QUATERNION'
    ob.rotation_quaternion = d.to_track_quat('Z', 'Y')
    return ob


with rest_pose():
    parts = [
        add('uv_sphere', 'Skull', hide, (0.0, -0.03, 1.72), (0.15, 0.16, 0.14), segments=16, ring_count=10,
            radius=1, smooth=True),
        add('uv_sphere', 'Muzzle', snout, (0.0, -0.2, 1.64), (0.1, 0.13, 0.09), segments=16, ring_count=10,
            radius=1, smooth=True),
        add('torus', 'NoseRing', gold, (0.0, -0.32, 1.59), (0.035, 0.035, 0.035), (1.5708, 0, 0),
            major_radius=1, minor_radius=0.22, major_segments=16, minor_segments=6),
    ]
    for s in (-1, 1):
        parts += [
            add('uv_sphere', f'Nostril.{s}', dark, (0.04 * s, -0.32, 1.66), (0.018, 0.012, 0.015), segments=8,
                ring_count=6, radius=1),
            add('uv_sphere', f'Eye.{s}', eye, (0.085 * s, -0.17, 1.75), (0.026, 0.016, 0.02), segments=8,
                ring_count=6, radius=1),
            add('cone', f'Ear.{s}', hide, (0.17 * s, 0.0, 1.73), (0.04, 0.015, 0.07), (0, 1.5708 * s, 0),
                vertices=8, radius1=1, radius2=0.2, depth=2),
            # A horn: out from the brow, then sweeping up and forward to an ivory point.
            horn_piece(f'Horn.{s}.0', (0.12 * s, -0.04, 1.82), (s, 0.0, 0.55), 0.18, 0.06, 0.045),
            horn_piece(f'Horn.{s}.1', (0.27 * s, -0.04, 1.9), (0.15 * s, -0.4, 1.0), 0.3, 0.045, 0.006),
        ]
for ob in parts:
    attach(ob, 'Head')
labrys_head(body(), 'Wood', bronze, blade=(0.26, 0.4, 0.025), thin=0.35)
