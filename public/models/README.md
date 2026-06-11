# Real 3D models (drop-in)

Place `.glb` / `.gltf` files in this folder to replace the procedural PC part
models with real ones. Nothing here by default → the app renders the high-detail
procedural models.

## How to add a model

1. Download a model (e.g. CC0 / royalty-free from Sketchfab, Poly Pizza,
   Quaternius, CGTrader free section). Prefer `.glb` (single file, embedded
   textures).
2. Copy it here, e.g. `public/models/gpu-rtx5090.glb`.
3. Register it in `src/components/3D/modelRegistry.ts`:

   ```ts
   const BY_PART_ID: Record<string, ModelEntry> = {
     'rtx-5090': { path: '/models/gpu-rtx5090.glb', scale: 1, rotation: [0, Math.PI, 0] },
   }
   ```

   - `scale` — fit the model into the layout slot (start at 1, adjust).
   - `rotation` — radians; rotate so the part faces +Z (toward the front glass).
   - `offset` — nudge `[x, y, z]` if the model's origin isn't centered.

4. Reload. If the file is missing or fails to parse, the app automatically falls
   back to the procedural model (no crash).

## Slots

Part ids come from `src/data/parts.ts`. Categories: `cpu`, `gpu`, `motherboard`,
`ram`, `storage`, `psu`, `cooling`, `case`. Register by exact part id for a
specific model, or by category for a generic one.
