# Payload

A tiny astronaut delivers a message. You pick the suit, the visor, the accent, and a personality, then send a link. The recipient opens it with no account and no install. The astronaut flies in, lands, and reads the message out loud in text. They can talk back. They can send it away.

Sound is off unless someone turns it on.

## Run it

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:4317](http://127.0.0.1:4317). No environment variables are required. Deliveries are written to `data/deliveries.json`, and replies come from in-character fallback lines until you add a model key.

## Environment

Copy `.env.example` to `.env.local`.

| Variable | Purpose |
| --- | --- |
| `LLM_API_KEY` | Nous Portal key. This is the only secret. Leave it empty and replies stay canned. |
| `LLM_BASE_URL` | OpenAI-compatible Portal base. Default `https://inference-api.nousresearch.com/v1`. |
| `LLM_MODEL` | Default `Hermes-4-70B`, the Hermes 4 70B id in the Portal docs and on `NousResearch/Hermes-4-70B`. |
| `SUPABASE_URL` | Optional. Switches persistence off the local JSON file. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key. Never expose it in the browser. |
| `NEXT_PUBLIC_APP_URL` | Absolute origin for Open Graph metadata. `VERCEL_URL` is used when this is empty. |

The chat route is the only caller of `src/lib/llm/adapter.ts`. With `LLM_API_KEY` set, it streams Hermes 4 70B from Nous Portal (`LLM_BASE_URL`, default `https://inference-api.nousresearch.com/v1`, model `Hermes-4-70B`). Hermes 4 is a hybrid reasoning model, so the request sends `chat_template_kwargs.enable_thinking: false` and strips any `<think>` blocks. If the provider rejects that field, the adapter retries once without it. If the key is missing, or the call fails, the same route answers with an in-character canned line and the landing still plays. A live check of `Hermes-4-70B` on that base URL currently returns `404` with “This model has been retired.” Put a key in `.env.local` only when you have one, then restart:

```bash
LLM_API_KEY=your-portal-key
LLM_BASE_URL=https://inference-api.nousresearch.com/v1
LLM_MODEL=Hermes-4-70B
```

Chat responses include `X-Payload-Voice: hermes` when a key is set and `X-Payload-Voice: canned` when it is not. The header says which path was selected. A failed Hermes call still returns the canned line.

Supabase schema: `supabase/schema.sql`. Row level security is on and there are no anon policies. Only the service role, used from route handlers, can read or write.

## Architecture

- **Send** (`/`) builds a delivery: colors, personality, name, message. Launch returns a share link.
- **Landing** (`/d/[id]`) plays the arrival, types the message, then offers Reply, Hide, and Make your own.
- **Astronaut** is AIRTIME, a skinned glTF in `public/models/airtime-rigged.glb` (Meshopt + WebP + quantization). `useGLTF` turns Meshopt on. If that file fails, the loader tries `airtime-rigged-uncompressed.glb`, then the original procedural astronaut. The public animation prop stays `idle | arrive | talk | depart`. Arrive plays `FlyIn`, then `Land`, then `DustOff`, with a dust puff and a light squash at impact. Talk loops while a bubble is typing, then Idle. Depart plays `Wave`, then `FlyOff`. Suit, visor, and accent still tint the single albedo: dark pixels become the visor, cyan-leaning pixels take the accent, and the rest is the suit.
- **Clips** are registered by name from the GLB (`src/components/astronaut/clip-registry.ts`). The rig is a 30-bone Mixamo skeleton (`mixamorig:` names) plus helmet, backpack, and mitten-curl bones, bound in an A-pose. A reply may start with one gesture tag — `[wave]`, `[shrug]`, `[celebrate]`, `[think]`, `[facepalm]`, `[bow]`, `[dance]`, `[sad]`, `[laugh]`, or `[point]` — which is stripped from the text and played once, then crossfades back to Talk or Idle. The head keeps a small look-at. Nothing else is posed by hand.
- **Speech** is HTML over the canvas so type stays sharp.
- **Storage** (`src/lib/storage`) is one interface. Supabase when both env vars are set, otherwise a JSON file, otherwise memory if the disk is not writable.
- **LLM** (`src/lib/llm/adapter.ts`) is the only place that talks to a model. Route handlers never call a provider directly.
- **Safety:** names are capped at 40 characters, messages at 400, chat lines at 240. Each delivery allows 8 model turns. Creates are limited per IP, and chat calls are limited per IP as well as per delivery. The model is told not to act on anything outside this chat. Recipient text is not logged.

## Next

- **Companion mode.** The same astronaut stays on your own screen, idle, and can be hidden. Phase 1 is the send landing only.
- **Desktop overlay.** A small always-on-top window for the companion, reusing the stage component.
- **iOS.** A share-sheet target and a home-screen wrapper. The link already works in mobile Safari.
- **Cosmetics.** Gear slots on top of AIRTIME. New clips drop into the same GLB; see below.
- **Bring your own model.** OpenRouter OAuth PKCE and pasted API keys, still through the one adapter. The env base URL, key, and model are the seam.

## Adding animation clips

Export a clip on this Mixamo skeleton. Bone names look like `mixamorig:Hips`, `mixamorig:Spine`, `mixamorig:Spine1`, `mixamorig:Spine2`, `mixamorig:Neck`, `mixamorig:Head`, plus `Helmet`, `Backpack`, and the mitten-curl bones. Name the clip in Pascal case, matching the ones already in the file: `Idle`, `FlyIn`, `Land`, `DustOff`, `Talk`, `Wave`, `FlyOff`, `Shrug`, `Point`, `Celebrate`, `Think`, `Facepalm`, `Bow`, `Dance`, `Sad`, `Laugh`, `Walk`, `Run`, `Jump`.

Merge that clip into `public/models/airtime-rigged.glb` and `public/models/airtime-rigged-uncompressed.glb`. Do not scale the armature. The skinned character is already about 1 unit tall, feet near y=0, facing +Z.

On load, `buildClipRegistry` indexes every clip by name. Courier states play `FlyIn` → `Land` → `DustOff`, `Talk`, `Idle`, `Wave`, and `FlyOff` directly. A gesture tag in a reply plays the matching clip once.
