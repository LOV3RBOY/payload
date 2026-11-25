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
- **Astronaut** is a procedural chibi in React Three Fiber (`src/components/astronaut`). The public props are `colors`, `animation` (`idle | arrive | talk | depart`), and `frame` (`hero | stage`). A rigged GLB can replace `AstronautModel` later without changing that API. Map clips to the same four names. Suit, visor, and accent stay material overrides.
- **Speech** is HTML over the canvas so type stays sharp.
- **Storage** (`src/lib/storage`) is one interface. Supabase when both env vars are set, otherwise a JSON file, otherwise memory if the disk is not writable.
- **LLM** (`src/lib/llm/adapter.ts`) is the only place that talks to a model. Route handlers never call a provider directly.
- **Safety:** names are capped at 40 characters, messages at 400, chat lines at 240. Each delivery allows 8 model turns. Creates are limited per IP, and chat calls are limited per IP as well as per delivery. The model is told not to act on anything outside this chat. Recipient text is not logged.

## Next

- **Companion mode.** The same astronaut stays on your own screen, idle, and can be hidden. Phase 1 is the send landing only.
- **Desktop overlay.** A small always-on-top window for the companion, reusing the stage component.
- **iOS.** A share-sheet target and a home-screen wrapper. The link already works in mobile Safari.
- **Cosmetics.** Gear slots (antenna, decals, jet trail) behind the same color props, then a GLB wardrobe.
- **Bring your own model.** OpenRouter OAuth PKCE and pasted API keys, still through the one adapter. The env base URL, key, and model are the seam.
