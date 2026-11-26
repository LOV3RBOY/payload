# AIRTIME model report

Chibi astronaut courier character for Payload. Source is a Meshy AI mesh, originally auto-rigged, now re-rigged in Blender to a Mixamo-compatible humanoid plus a few extra bones, with authored clips and retargeted locomotion.

References live in `/workspace/astro-app/model-in/AIRTIME-Astronaut/`. Editable master and web exports live in `/workspace/astro-app/model-out/`.

## Look

Cute chibi astronaut: large spherical helmet, short chubby body, mitten hands. Off-white / cream padded suit with horizontal rib seams. Glossy black visor. Cyan ear-cup rings and a small cyan chest mark. Grey collar and backpack straps, rounded backpack, chunky boots. The turnaround concept art is cleaner and more graphic than the 3D bake — cyan accents are thinner and the material is a bit softer and more plastic, matching the Meshy preview more than the illustrations.

The bind pose is an **A-pose**, not a T-pose. In glTF the character faces **+Z**, is about **1.0 unit** tall, and has feet on **y ≈ 0**. In Blender (Z-up) the character faces **−Y**.

## Deliverables

| File | Size | What it is |
|---|---|---|
| **airtime-rigged.glb** | **1.33 MB** (1,391,100 bytes) | Runtime file: Meshopt + KHR_mesh_quantization + WebP, 19 clips, 30-bone skin |
| airtime-rigged-uncompressed.glb | 2.92 MB (3,059,392 bytes) | Same mesh, clips, and WebP textures; no Meshopt/quantization |
| airtime-rigged.blend | 11.8 MB | Editable Blender 4.5 master (packed textures, new rig, all actions) |
| airtime-rigged-mixamo.fbx | 2.45 MB | A-pose, **no animation**, Mixamo-oriented (forward −Z, up Y, units applied) |
| previews/airtime-rigged-contact.png | 424 KB | Contact sheet of all clips (peaks where useful) |
| previews/airtime-reel.mp4 | 405 KB, 16.9 s | Highlight reel: Idle, Walk×2, Wave, Land, Celebrate, Jump, Dance, FlyIn, FlyOff |
| previews/<Clip>.mp4 | — | 480×480, 24 fps preview of each clip |

`airtime-rigged.glb` needs `MeshoptDecoder` and WebP in the GLTF loader (`loader.setMeshoptDecoder(MeshoptDecoder)`). The uncompressed fallback only needs WebP.

The earlier `airtime.glb` (1.05 MB, original 24-bone Meshy rig, only Idle/Walk/Run/Jump) is still in this folder if you need it; prefer `airtime-rigged.glb` going forward.

Mesh: **47,688 triangles**, 37,353 vertices. Textures are the same look as the previous web export: albedo 2048 WebP, normal 2048 WebP, metallic-roughness 1024 WebP.

## Skeleton (30 bones)

Mixamo-compatible names and spine order. Hierarchy:

```
mixamorig:Hips
├── mixamorig:Spine
│   └── mixamorig:Spine1
│       └── mixamorig:Spine2
│           ├── mixamorig:Neck
│           │   └── mixamorig:Head
│           │       ├── mixamorig:HeadTop_End
│           │       └── Helmet
│           │           └── Visor
│           ├── mixamorig:LeftShoulder → LeftArm → LeftForeArm → LeftHand → LeftHandCurl
│           ├── mixamorig:RightShoulder → RightArm → RightForeArm → RightHand → RightHandCurl
│           └── Backpack
├── mixamorig:LeftUpLeg → LeftLeg → LeftFoot → LeftToeBase → LeftToe_End
└── mixamorig:RightUpLeg → RightLeg → RightFoot → RightToeBase → RightToe_End
```

Extra bones (not in stock Mixamo):

- **Helmet** — child of Head; keeps the helmet rigid as the neck/head move
- **Visor** — child of Helmet; for a visor tilt (a UV seam is visible when it moves)
- **Backpack** — child of Spine2
- **LeftHandCurl / RightHandCurl** — one curl joint per mitten

Bone rolls were aligned to the original Meshy skeleton so Walk/Run/Jump could be copied as local rotations. The rest mesh is unchanged (roll does not deform the bind pose).

## Clips (24 fps)

| Name | Duration | Frames | Loop | Notes |
|---|---|---|---|---|
| Idle | 3.96 s | 1–96 | yes | Breathing, weight shift, head drift |
| FlyIn | 1.46 s | 1–36 | no | Jetpack pose, enters from above, settles |
| Land | 0.96 s | 1–24 | no | Impact squash (peak ~frame 6) then recover |
| DustOff | 1.29 s | 1–32 | no | Pats the suit, left then right |
| Talk | 1.96 s | 1–48 | yes | Nods and hand gestures |
| Wave | 1.29 s | 1–32 | no | Right arm up, side-to-side wave |
| FlyOff | 1.29 s | 1–32 | no | Crouch, then launch upward out of frame |
| Shrug | 0.96 s | 1–24 | no | Shoulders up, palms out; relatively small |
| Point | 1.12 s | 1–28 | no | Forward / toward-camera point, not a long side point |
| Celebrate | 1.46 s | 1–36 | no | Hop with a fist up by the helmet |
| Think | 1.96 s | 1–48 | no | Hand to the side of the helmet, slight head tilt |
| Facepalm | 1.46 s | 1–36 | no | Head drops; mitten is near the visor but often hidden by the black sphere |
| Bow | 1.46 s | 1–36 | no | Forward waist bow, knees slightly bent |
| Dance | 1.96 s | 1–48 | yes | Side-to-side steps and arm swings |
| Sad | 1.96 s | 1–48 | no | Slump, head down; holds the pose at the end |
| Laugh | 1.46 s | 1–36 | yes | Shoulder bounce, hands in toward the chest |
| Walk | 1.08 s | 0–26 | yes | Retargeted from the Meshy walk; first/last frames match |
| Run | 0.67 s | 0–16 | yes | Retargeted from the Meshy run |
| Jump | 1.92 s | 0–46 | no | Retargeted from the Meshy jump |

Authored clips are stylized and snappy, with chibi weight (deep land squash, a hop in Celebrate, a clear Wave). They are not motion-capture quality. Locomotion is the original Meshy acting, transferred onto the new rig; arm and torso motion reads clearly after bone-roll alignment. Mesh-minimum height was lifted so feet no longer dip below y = 0 (a small hips-up offset is baked into Walk/Run/Jump).

## How to add new clips (Mixamo)

The bind is an **A-pose**. Use the same A-pose FBX, not a T-pose retarget.

1. Upload `/workspace/astro-app/model-out/airtime-rigged-mixamo.fbx` to Mixamo (character already has a Mixamo-named skeleton).
2. Pick a clip, download **FBX, without skin** (animation only).
3. In Blender, open `airtime-rigged.blend`, import that FBX. Bone names should match `mixamorig:*` on `AIRTIME_Rig`.
4. Assign the imported action to `AIRTIME_Rig`. In Blender 4.5 you must also set `animation_data.action_slot` (usually `action_suitable_slots[0]`).
5. Do **not** scale the scene 100×. The character is already ~1 unit tall. The old hidden Armature object still has scale 0.01; leave it hidden.
6. Optionally fix ground (sample skinned mesh min-z, add a small offset on `mixamorig:Hips` location along the bone’s up axis, which is local Y).
7. Name the action exactly as you want it in glTF, fake-user it, then re-export the GLB (all actions, skins on, no cameras/lights). Run the same Meshopt + WebP pipeline if you need the small runtime file.
8. Finger / face Mixamo curves will not do anything useful here (mittens + no morphs). Helmet, Visor, Backpack, and curl bones are not in stock Mixamo; leave them at rest or key them by hand after import.

Merging a “without skin” clip with matching `mixamorig:` names is just action assignment plus the 4.5 action slot, not a full retarget.

## Known limitations

- **Meshy auto-UVs** have polar/fan islands on the visor and torn island edges. That is in the source bake, not the re-rig. Tilting **Visor** shows a seam.
- **No facial morphs** and no jaw/eye bones. Expression is pose-only (head, visor, hands).
- **Mitten hands** with a single curl joint. No fingers; waves and points are arm-level. Curl is subtle on most clips.
- **Facepalm** reads mainly as a disappointed head-down. The mitten is keyed near the visor but the big black visor often hides it from a three-quarter camera.
- **Think** is hand-to-the-side-of-the-helmet, not a chin rest (the helmet has no chin).
- **Point** is a forward / toward-camera gesture, not a long outstretched side point.
- **Shrug** is smaller than the more cartoony clips.
- **Celebrate** raises a clear fist on the hop; the opposite arm is less obvious from the default camera, and the armpit deforms a little at the extreme.
- **FlyIn / FlyOff** leave the default 50 mm framing; previews for those two use a wider lens. In-app you will want a camera that can follow or start wider.
- Locomotion is a **retarget**, not a recapture. It looks like a walk/run/jump, with a slightly wide A-pose arm carriage and some residual Meshy stiffness. Ground dips from the source were corrected (mesh min-z ≥ 0).
- **Helmet** is weighted to stay mostly rigid; some neck/collar verts still follow the neck slightly.
- **Backpack** has exclusive weights in the pack volume; straps still follow the chest.
- Old 24-bone armature is kept in a hidden `OLD_SOURCE_RIG` collection in the .blend (scale 0.01, actions renamed `SRC_Walk` / `SRC_Run` / `SRC_Jump` / `SRC_Idle`). Do not export it.
- Runtime `airtime-rigged.glb` requires MeshoptDecoder. Do not confuse inspect-tool bounding boxes on the quantized file with world size; the uncompressed GLB and a skinned runtime view are both ~1 unit tall with feet on y = 0.

## Source (for reference)

Original pack: `Game/AIRTIME-Astronaut.glb` (43 MB, 119,220 tris, 24-bone inverted-spine Meshy rig, Jump/Walk/Run). Unskinned and high-res Meshy meshes were not used for the web file. The optimized 47.6k-tri mesh and 2K WebP textures from the first web export were the starting point for this re-rig.
