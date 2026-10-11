# Centaur Archer: VWolfdog's Flare horse (on _canyon's rigged horse) without its neck and head, carrying the
# torso of Clint Bellanger's hero in place of them: leather jerkin, dark hair, eyes lit by corruption, the
# longbow drawn. The horse's 24 frames drive the walk; the rider holds the bow-drawing pose of the hero's action.
#   source: Horse.blend (+ the hero files)
from mathutils import Matrix

from flare_lib import *

FRAMES = '1-24'
SHOOT_FRAME = 30  # the hero's action: shoot bow, string drawn

horse = bpy.data.objects['horse_mesh']
horse_rig = bpy.data.objects['horse_rig']
recolour('Fur', (0.42, 0.27, 0.15))
recolour('Mane & Tail', (0.1, 0.06, 0.04))
recolour('Hoof', (0.08, 0.07, 0.06))
# Old Blender Internal texture slots are ignored by the converter; the coat is the flat Fur colour.
with rest_pose(horse_rig):
    strip_vertex_groups(horse, ['neck', 'head', 'Forelock', 'Mane'])

# The rider: the hero's body and head on their own armature, frozen in the bow-drawing pose.
rider_body = append(hero_part('clothes'), 'HumanMale')
rider_arm = next(m.object for m in rider_body.modifiers if m.type == 'ARMATURE')
scene_collection().objects.link(rider_arm)
head = append(hero_part('male_head1'), 'MaleHead1')
head.parent = rider_body.parent
head.matrix_parent_inverse = rider_body.matrix_parent_inverse.copy()
head.matrix_basis = rider_body.matrix_basis.copy()
for m in head.modifiers:
    if m.type == 'ARMATURE':
        m.object = rider_arm
# The hero's action does not come along with the appended armature: load it, pose, then drop it.
with D.libraries.load(hero_part('clothes'), link=False) as (_, dst):
    dst.actions = ['Action.008']
rider_arm.animation_data_create()
rider_arm.animation_data.action = dst.actions[0]
if hasattr(rider_arm.animation_data, 'action_slot') and dst.actions[0].slots:
    rider_arm.animation_data.action_slot = dst.actions[0].slots[0]
bpy.context.scene.frame_set(SHOOT_FRAME)
bpy.context.view_layer.update()
rider_arm.animation_data.action = None  # keep the evaluated pose, drop the animation

with rest_pose(rider_arm):
    strip_below(rider_body, 0.92)  # nothing below the hips: the horse is the rest of him

recolour_slots(rider_body, 'TanCloth', (0.36, 0.24, 0.14), name='Jerkin')
recolour_slots(rider_body, 'WhiteCloth', (0.36, 0.24, 0.14), name='JerkinTrim')
recolour_slots(rider_body, 'BlueCloth', (0.36, 0.24, 0.14), name='JerkinSkirt')
recolour_slots(head, 'DarkHair', (0.14, 0.09, 0.06), name='RiderHair')
corrupt_eyes(head)

bow = held(hero_part('longbow'), 'LongBow', 'Hand.Left', GRIP_LONGBOW, rider_arm)

# Mount the rider where the horse's neck was: hips (z 0.94 in the hero file) onto the front of the back.
rider = bpy.data.objects.new('Rider', None)
scene_collection().objects.link(rider)
for ob in (rider_arm, rider_body, head):
    world = ob.matrix_world.copy()
    ob.parent = rider
    ob.matrix_parent_inverse = Matrix.Identity(4)
    ob.matrix_world = world
# The hero is human-sized and this horse is large: scale him up and set his hips (z 0.94) on the withers.
RIDER_SCALE = 1.4
rider.scale = (RIDER_SCALE,) * 3
rider.location = (0.0, -0.95, 2.12 - 0.94 * RIDER_SCALE)
bpy.context.view_layer.update()
attach(rider, 'rib', horse_rig)

# Close the opening where the neck was with the horse's coat, under the rider's waist.
with rest_pose(horse_rig):
    withers = add('uv_sphere', 'Withers', D.materials['Fur'], (0.0, -0.85, 1.98), (0.3, 0.42, 0.34),
                  segments=16, ring_count=10, radius=1, smooth=True)
attach(withers, 'rib', horse_rig)
