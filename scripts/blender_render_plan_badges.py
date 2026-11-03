# Run inside Blender (Scripting workspace) or via MCP execute_blender_code.
# Renders TvPays tier badges to public/assets/plans/{slug}.png

import bpy
import math
import os

OUT_DIR = r"c:\Users\Oxford\Documents\Cursor Projects\tvpays\public\assets\plans"
os.makedirs(OUT_DIR, exist_ok=True)

PLANS = [
    ("trial", "★", "FREE TRIAL", (0.18, 0.82, 0.75), (0.05, 0.35, 0.28)),
    ("elite", "1", "ELITE", (0.05, 0.35, 0.95), (0.02, 0.12, 0.45)),
    ("elite_pro", "2", "ELITE PRO", (0.12, 0.78, 0.35), (0.04, 0.28, 0.12)),
    ("premium", "3", "PREMIUM", (0.95, 0.55, 0.12), (0.45, 0.22, 0.05)),
    ("premium_elite", "4", "PREMIUM ELITE", (0.92, 0.22, 0.22), (0.38, 0.08, 0.08)),
    ("executive", "5", "EXECUTIVE", (0.55, 0.35, 0.95), (0.22, 0.12, 0.42)),
    ("executive_pro", "6", "EXEC PRO", (0.25, 0.85, 0.95), (0.08, 0.32, 0.42)),
    ("prestige", "7", "PRESTIGE", (0.12, 0.72, 0.92), (0.04, 0.28, 0.38)),
    ("prestige_elite", "8", "PRESTIGE ELITE", (0.88, 0.28, 0.92), (0.35, 0.08, 0.38)),
    ("professional", "9", "PROFESSIONAL", (0.95, 0.72, 0.15), (0.42, 0.28, 0.05)),
]


def clear_scene():
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)


def make_mat(name, rgb, metallic=0.88, roughness=0.22, emit=0.0):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*rgb, 1)
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
        if "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (
                min(rgb[0] + 0.15, 1),
                min(rgb[1] + 0.15, 1),
                min(rgb[2] + 0.2, 1),
                1,
            )
            bsdf.inputs["Emission Strength"].default_value = emit
    return mat


def build_scene():
    clear_scene()
    mat_blue = make_mat("Primary", (0.05, 0.35, 0.95), emit=0.25)
    mat_blue_dark = make_mat("PrimaryDark", (0.02, 0.12, 0.45))
    mat_silver = make_mat("Silver", (0.78, 0.85, 0.98), 1.0, 0.12, 0.12)
    mat_gold = make_mat("Gold", (1.0, 0.78, 0.15), 1.0, 0.18, 0.35)
    mat_glow = make_mat("Glow", (0.2, 0.55, 1.0), 0.0, 1.0, 2.8)

    z = 0
    for i, (r, h) in enumerate([(1.35, 0.18), (1.05, 0.16), (0.78, 0.14)]):
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=64, radius=r, depth=h, location=(0, 0, z + h / 2)
        )
        cyl = bpy.context.active_object
        cyl.name = f"Pedestal_{i}"
        cyl.data.materials.append(mat_blue if i < 2 else mat_blue_dark)
        z += h
    ped_top = z

    bpy.ops.mesh.primitive_cylinder_add(
        vertices=64, radius=0.62, depth=0.12, location=(0, 0, ped_top + 0.06)
    )
    disc = bpy.context.active_object
    disc.name = "EmblemDisc"
    disc.data.materials.append(mat_blue)

    # Shield plate (client mockup circular emblem)
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=64, radius=0.52, depth=0.04, location=(0, -0.02, ped_top + 0.16)
    )
    shield = bpy.context.active_object
    shield.name = "ShieldPlate"
    shield.data.materials.append(mat_blue_dark)

    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.58, minor_radius=0.045, location=(0, 0, ped_top + 0.13)
    )
    rim = bpy.context.active_object
    rim.name = "DiscRim"
    rim.data.materials.append(mat_silver)

    bpy.ops.mesh.primitive_cylinder_add(
        vertices=32, radius=0.22, depth=0.08, location=(0, -0.05, ped_top + 0.22)
    )
    crown_base = bpy.context.active_object
    crown_base.name = "CrownBase"
    crown_base.data.materials.append(mat_silver)
    for ang in [-0.55, -0.2, 0.15, 0.5, 0.85]:
        x = math.sin(ang) * 0.18
        bpy.ops.mesh.primitive_cone_add(
            vertices=4,
            radius1=0.065,
            depth=0.15,
            location=(x, -0.05, ped_top + 0.35),
        )
        p = bpy.context.active_object
        p.rotation_euler = (0.35, 0, ang)
        p.data.materials.append(mat_silver)

    for side in (1, -1):
        bpy.ops.mesh.primitive_cube_add(
            size=1, location=(0.85 * side, 0, ped_top + 0.06)
        )
        wing = bpy.context.active_object
        wing.name = f"Wing_{side}"
        wing.scale = (0.1, 0.58, 0.38)
        wing.rotation_euler = (0.15, 0.12 * side, -0.55 * side)
        wing.data.materials.append(mat_silver)

    bpy.ops.object.text_add(location=(0, -0.32, ped_top + 0.22))
    txt = bpy.context.active_object
    txt.name = "TierNumber"
    txt.data.body = "1"
    txt.data.size = 1.35
    txt.data.extrude = 0.1
    txt.data.bevel_depth = 0.012
    txt.data.align_x = "CENTER"
    txt.data.align_y = "CENTER"
    # Face camera sitting on -Y axis
    txt.rotation_euler = (0, math.pi, 0)
    txt.data.materials.append(mat_gold)
    bpy.ops.object.convert(target="MESH")

    bpy.ops.object.text_add(location=(0, -1.05, 0.22))
    label = bpy.context.active_object
    label.name = "PedestalLabel"
    label.data.body = "ELITE"
    label.data.size = 0.2
    label.data.extrude = 0.045
    label.data.align_x = "CENTER"
    label.rotation_euler = (math.radians(90), 0, 0)
    label.data.materials.append(mat_silver)
    bpy.ops.object.convert(target="MESH")

    bpy.ops.mesh.primitive_circle_add(
        vertices=64, radius=1.2, location=(0, 0.08, ped_top + 0.02)
    )
    glow = bpy.context.active_object
    glow.name = "BackGlow"
    glow.rotation_euler = (math.radians(90), 0, 0)
    glow.data.materials.append(mat_glow)

    col = bpy.context.collection
    cam_data = bpy.data.cameras.new("Cam")
    cam = bpy.data.objects.new("Camera", cam_data)
    col.objects.link(cam)
    cam.location = (0, -2.85, 1.15)
    cam.rotation_euler = (math.radians(68), 0, 0)
    bpy.context.scene.camera = cam
    cam_data.lens = 55

    for name, loc, energy in [
        ("Key", (1.0, -2.0, 2.0), 950),
        ("Fill", (-1.6, -1.0, 0.9), 420),
        ("Rim", (0, 2.0, 1.5), 580),
    ]:
        ld = bpy.data.lights.new(name, "AREA")
        ld.energy = energy
        ld.size = 1.8
        lo = bpy.data.objects.new(name, ld)
        col.objects.link(lo)
        lo.location = loc

    world = bpy.context.scene.world
    if not world:
        world = bpy.data.worlds.new("World")
        bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (0.008, 0.02, 0.08, 1)
        bg.inputs[1].default_value = 0.25


def apply_plan(primary, dark, label, tier):
    prim = make_mat("Primary", primary, emit=0.28)
    dark_m = make_mat("PrimaryDark", dark)
    glow = make_mat("Glow", primary, 0.0, 1.0, 2.5)
    for name in ("Pedestal_0", "Pedestal_1", "EmblemDisc", "ShieldPlate"):
        obj = bpy.data.objects.get(name)
        if obj and obj.data.materials:
            obj.data.materials[0] = prim
    obj = bpy.data.objects.get("Pedestal_2")
    if obj and obj.data.materials:
        obj.data.materials[0] = dark_m
    obj = bpy.data.objects.get("BackGlow")
    if obj and obj.data.materials:
        obj.data.materials[0] = glow
    tier_obj = bpy.data.objects.get("TierNumber")
    if tier_obj and tier_obj.data:
        # Text converted to mesh — update via new text rebuild is hard; use object name
        pass
    # Re-create tier text mesh
    if tier_obj:
        bpy.data.objects.remove(tier_obj, do_unlink=True)
    ped_top = 0.48
    bpy.ops.object.text_add(location=(0, -0.32, ped_top + 0.22))
    txt = bpy.context.active_object
    txt.name = "TierNumber"
    txt.data.body = tier
    txt.data.size = 1.25 if len(tier) == 1 else 0.65
    txt.data.extrude = 0.1
    txt.data.bevel_depth = 0.012
    txt.data.align_x = "CENTER"
    txt.data.align_y = "CENTER"
    txt.rotation_euler = (0, math.pi, 0)
    txt.data.materials.append(bpy.data.materials.get("Gold"))
    bpy.ops.object.convert(target="MESH")
    lbl = bpy.data.objects.get("PedestalLabel")
    if lbl:
        bpy.data.objects.remove(lbl, do_unlink=True)
    bpy.ops.object.text_add(location=(0, -1.05, 0.22))
    label_obj = bpy.context.active_object
    label_obj.name = "PedestalLabel"
    label_obj.data.body = label
    label_obj.data.size = 0.16 if len(label) > 10 else 0.2
    label_obj.data.extrude = 0.045
    label_obj.data.align_x = "CENTER"
    label_obj.rotation_euler = (math.radians(90), 0, 0)
    label_obj.data.materials.append(bpy.data.materials.get("Silver"))
    bpy.ops.object.convert(target="MESH")


def render_all():
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 768
    scene.render.resolution_y = 768
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    build_scene()
    for slug, tier, label, primary, dark in PLANS:
        apply_plan(primary, dark, label, tier)
        scene.render.filepath = os.path.join(OUT_DIR, f"{slug}.png")
        bpy.ops.render.render(write_still=True)
        print("OK", slug)


if __name__ == "__main__":
    render_all()
