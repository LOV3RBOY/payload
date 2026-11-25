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
| `LLM_API_KEY` | Nous Portal API key. Leave empty for canned replies. |
| `LLM_BASE_URL` | OpenAI-compatible base URL. Default `https://inference-api.nousresearch.com/v1`. |
| `LLM_MODEL` | Model id. Default `Hermes-4-70B` (free tier on Nous Portal). |
| `SUPABASE_URL` | Optional. Switches persistence off the local JSON file. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key. Never expose it in the browser. |
| `NEXT_PUBLIC_APP_URL` | Absolute origin for Open Graph metadata. `VERCEL_URL` is used when this is empty. |

The same three `LLM_*` variables point at any later OpenAI-compatible provider. Hermes 4 is a hybrid reasoning model, so requests send `chat_template_kwargs.enable_thinking: false` and strip any `<think>` blocks. If a provider rejects that field, the adapter retries once without it, then falls back to a canned line.

Supabase schema: `supabase/schema.sql`. Row level security is on and there are no anon policies. Only the service role, used from route handlers, can read or write.

## Architecture

- **Send** (`/`) builds a delivery: colors, personality, name, message. Launch returns a share link.
- **Landing** (`/d/[id]`) plays the arrival, types the message, then offers Reply, Hide, and Make your own.
- **Astronaut** is AIRTIME, a skinned glTF in `public/models/airtime.glb` (Meshopt + WebP). `useGLTF` turns Meshopt on. If that file fails, the loader tries `airtime-uncompressed.glb`, then the original procedural astronaut. The public props stay `colors`, `animation` (`idle | arrive | talk | depart`), and `frame` (`hero | stage`). Suit, visor, and accent tint the single albedo in the shader: dark pixels stay the visor, cyan pixels take the accent, and the rest of the suit is multiplied by the suit color. There is no separate visor material in this file.
- **Clips** are registered by name from the GLB (`src/components/astronaut/clip-registry.ts`). Idle, Walk, Run, and Jump ship today. Courier states pick the first name that exists: talk looks for `Talk` then `Idle`, arrive flies with `Fly` or `Jump`, the landing prefers `Land`, and depart prefers `Wave` before a procedural arm wave. A later LLM call can play any registered name.
- **Speech** is HTML over the canvas so type stays sharp.
- **Storage** (`src/lib/storage`) is one interface. Supabase when both env vars are set, otherwise a JSON file, otherwise memory if the disk is not writable.
- **LLM** (`src/lib/llm/adapter.ts`) is the only place that talks to a model. Route handlers never call a provider directly.
- **Safety:** names are capped at 40 characters, messages at 400, chat lines at 240. Each delivery allows 8 model turns. Creates are limited per IP, and chat calls are limited per IP as well as per delivery. The model is told not to act on anything outside this chat. Recipient text is not logged.

## Next

- **Companion mode.** The same astronaut stays on your own screen, idle, and can be hidden. Phase 1 is the send landing only.
- **Desktop overlay.** A small always-on-top window for the companion, reusing the stage component.
- **iOS.** A share-sheet target and a home-screen wrapper. The link already works in mobile Safari.
- **Cosmetics.** Gear slots on top of AIRTIME. New clips drop into the same GLB; see below.

## Adding animation clips

Export a clip on this same skeleton (the bone names in `MODEL` notes: `Hips`, `Spine02`, `Spine01`, `Spine`, `neck`, `Head`, `LeftArm`, `RightArm`, and the rest). Name it in Pascal case: `Wave`, `Land`, `Talk`, `Fly`, `Shrug`, `Dance`.

Merge that clip into `public/models/airtime.glb` and `public/models/airtime-uncompressed.glb`. Do not rescale the armature. It stays at `0.01`, and the skinned character is already 1 unit tall.

On load, `buildClipRegistry` indexes every clip by name. No code change is required for the name to become addressable. If the name is one the courier states already look for (`Talk`, `Fly`, `Land`, `Wave`), that state uses it automatically. Anything else is available to a later gesture call through `listGestures`.

Keep feet near y=0. Clips that dip a centimeter or two are lifted by a small model offset.
- **Bring your own model.** OpenRouter OAuth PKCE and pasted API keys, still through the one adapter. The env base URL, key, and model are the seam.
