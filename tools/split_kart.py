"""Split a built kart into the parts the game moves: its body, and each wheel with its origin at its hub.

blender -b --factory-startup --python tools/split_kart.py -- <kart.glb> <out folder>

Writes <out>/body.glb (the body and the steering wheel, as the kart sits) and <out>/wheel_FL.glb … one per
wheel, each centred on its hub, in the kart's own axes, so the game hangs each under its wheel. The engine
places a model whole, so a kart's wheels have to arrive as models of their own to spin and steer.

A kart built from one texture atlas shares it across every part. Each wheel gets its own copy of just the
patch of the atlas its UVs use (a little padding round it, its UVs remapped onto the patch), at most
WHEEL_MAX pixels a side, so a wheel doesn't carry the whole kart's textures.
"""

import sys

import bpy
import numpy as np

args = sys.argv[sys.argv.index("--") + 1 :]
src, out = args[0], args[1]

# Pixels kept round a wheel's patch of the atlas, so filtering at its edge doesn't pick up its neighbours.
PAD = 8
# The largest side of a wheel's own textures: a wheel is small on screen, and its UVs can spread over
# much of the atlas, so the patch is scaled down to this.
WHEEL_MAX = 512

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)

objects = [o for o in bpy.data.objects if o.type == "MESH"]
for o in objects:
    if o.parent is not None:
        world = o.matrix_world.copy()
        o.parent = None
        o.matrix_world = world


def export(selected, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in selected:
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=f"{out}/{name}.glb", export_format="GLB", use_selection=True, export_yup=True, export_extras=True)


def crop(image, x0, y0, x1, y1, name):
    """A new image holding the pixels [x0, x1) × [y0, y1) of `image` (Blender's rows run bottom up)."""
    w, h = image.size
    px = np.empty(w * h * 4, dtype=np.float32)
    image.pixels.foreach_get(px)
    px = px.reshape(h, w, 4)[y0:y1, x0:x1].copy()
    patch = bpy.data.images.new(name, x1 - x0, y1 - y0, alpha=True, float_buffer=False, is_data=image.colorspace_settings.is_data)
    patch.colorspace_settings.name = image.colorspace_settings.name
    patch.pixels.foreach_set(px.ravel())
    pw_, ph_ = patch.size
    if max(pw_, ph_) > WHEEL_MAX:
        k = WHEEL_MAX / max(pw_, ph_)
        patch.scale(max(1, round(pw_ * k)), max(1, round(ph_ * k)))
    patch.pack()
    return patch


def own_patch(o):
    """Give a part its own material whose textures are only the patch of the atlas its UVs cover."""
    if not o.data.uv_layers or not o.material_slots or o.material_slots[0].material is None:
        return
    uv = o.data.uv_layers.active.data
    us = np.array([d.uv[0] for d in uv])
    vs = np.array([d.uv[1] for d in uv])
    material = o.material_slots[0].material
    images = {n.image for n in material.node_tree.nodes if n.type == "TEX_IMAGE" and n.image is not None}
    if not images or us.size == 0 or us.min() < 0 or us.max() > 1 or vs.min() < 0 or vs.max() > 1:
        return
    # The patch, in the largest image's pixels; every map in the atlas is cropped to the same fraction.
    w, h = max(images, key=lambda i: i.size[0] * i.size[1]).size
    x0, x1 = max(0, int(us.min() * w) - PAD), min(w, int(np.ceil(us.max() * w)) + PAD)
    y0, y1 = max(0, int(vs.min() * h) - PAD), min(h, int(np.ceil(vs.max() * h)) + PAD)
    f = (x0 / w, y0 / h, x1 / w, y1 / h)
    mine = material.copy()
    mine.name = f"{material.name}_{o.name}"
    for node in mine.node_tree.nodes:
        if node.type == "TEX_IMAGE" and node.image is not None:
            iw, ih = node.image.size
            node.image = crop(node.image, int(f[0] * iw), int(f[1] * ih), int(f[2] * iw), int(f[3] * ih), f"{node.image.name}_{o.name}")
    o.material_slots[0].material = mine
    for d in uv:
        d.uv = ((d.uv[0] - f[0]) / (f[2] - f[0]), (d.uv[1] - f[1]) / (f[3] - f[1]))


wheels = [o for o in objects if o.name.startswith("wheel_")]
for w in wheels:
    own_patch(w)
    at = w.location.copy()
    w.location = (0.0, 0.0, 0.0)
    export([w], w.name)
    w.location = at
export([o for o in objects if o not in wheels], "body")
for w in wheels:
    print(f"part {w.name} hub {tuple(round(v, 4) for v in w.location)}")
