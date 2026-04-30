"""
KitBash3D Terrain Atlas Export Script for Blender
Run this in Blender's Scripting tab

What it does:
1. Selects only large mesh objects (>500 vertices, no small clutter)
2. Applies Decimate modifier (ratio 0.5) to each object ONE BY ONE
3. Exports as GLB with Draco compression
4. Saves to: D:/Max/skirmish/Skirmish-Sci-Fi/public/assets/terrain_atlas.glb
"""

import bpy
import os

# CONFIG
EXPORT_PATH = r"D:\Max\skirmish\Skirmish-Sci-Fi\public\assets\terrain_atlas.glb"
MIN_VERTICES = 500
SKIP_KEYWORDS = ['Chair', 'Sofa', 'Table', 'Kiosk', 'Hologram', 'Billboard', 'Planter', 'Stair', 'Light', 'Lamp', 'Bench', 'Trash', 'Canopy']
DECIMATE_RATIO = 0.5

print("=" * 60)
print("KitBash3D Terrain Atlas Export")
print("=" * 60)

# Step 1: Find large objects
large_objects = []
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH':
        vert_count = len(obj.data.vertices)
        if vert_count > MIN_VERTICES:
            # Skip small decorative objects
            if any(kw in obj.name for kw in SKIP_KEYWORDS):
                print(f"SKIP (small): {obj.name} ({vert_count} verts)")
                continue
            large_objects.append(obj)
            print(f"SELECT: {obj.name} ({vert_count} verts)")

print(f"\nFound {len(large_objects)} large objects to export")

# Step 2: Apply Decimate modifier to each object ONE BY ONE
print("\nApplying Decimate modifiers...")
decimated_count = 0
for obj in large_objects:
    # Make object active
    bpy.context.view_layer.objects.active = obj
    
    # Add Decimate modifier
    decimate = obj.modifiers.new(name="Decimate", type='DECIMATE')
    decimate.ratio = DECIMATE_RATIO
    
    # Apply modifier
    bpy.ops.object.modifier_apply(modifier="Decimate")
    
    decimated_count += 1
    if decimated_count % 10 == 0:
        print(f"  Decimated {decimated_count}/{len(large_objects)} objects...")

print(f"Decimated {decimated_count} objects")

# Step 3: Select all large objects for export
bpy.ops.object.select_all(action='DESELECT')
for obj in large_objects:
    obj.select_set(True)

print(f"\nSelected {len(large_objects)} objects for export")

# Step 4: Ensure output directory exists
os.makedirs(os.path.dirname(EXPORT_PATH), exist_ok=True)

# Step 5: Export GLB with Draco
print(f"\nExporting to: {EXPORT_PATH}")
print("Settings: Draco compression, PBR materials (no textures), Y-up")

bpy.ops.export_scene.gltf(
    filepath=EXPORT_PATH,
    export_format='GLB',
    use_selection=True,
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6,
    export_draco_position_quantization=14,
    export_draco_normal_quantization=10,
    export_draco_texcoord_quantization=12,
    export_materials='EXPORT',
    export_image_format='NONE',
    export_cameras=False,
    export_lights=False,
    export_yup=True,
)

# Step 6: Report
file_size = os.path.getsize(EXPORT_PATH)
file_size_mb = file_size / (1024 * 1024)

print("\n" + "=" * 60)
print("EXPORT COMPLETE!")
print("=" * 60)
print(f"File: {EXPORT_PATH}")
print(f"Size: {file_size_mb:.2f} MB")
print(f"Objects: {len(large_objects)}")

if file_size_mb > 50:
    print("WARNING: File is larger than 50 MB! Consider reducing MIN_VERTICES or DECIMATE_RATIO")
elif file_size_mb > 20:
    print("WARNING: File is larger than 20 MB. May be slow to load in browser.")
else:
    print("File size looks good for web delivery!")

print("=" * 60)
