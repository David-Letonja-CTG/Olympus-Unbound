# Prints a held object's matrix relative to the hand (world space, scale removed), for flare_lib.grip().
#   blender -b <weapon.blend> --python measure_grip.py -- <object name>   (uses the bone the object hangs on)
import sys

import bpy
from mathutils import Matrix

argv = sys.argv[sys.argv.index('--') + 1:]
name = argv[0]
arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
ob = bpy.data.objects[name]
bone = ob.parent_bone
print('BONE', bone)
for frame in (1, 13):  # the same numbers at both frames means the grip is rigid
    bpy.context.scene.frame_set(frame)
    loc, rot, _ = (arm.matrix_world @ arm.pose.bones[bone].matrix).decompose()
    relative = Matrix.LocRotScale(loc, rot, None).inverted() @ ob.matrix_world
    print('GRIP', frame, [round(v, 5) for row in relative for v in row])
