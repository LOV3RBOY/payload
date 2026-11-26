# Payload handoff

This is the note for the next developer. The product is a phone app. What is in this repo today is the web slice that proves the courier: send a silent message, watch the astronaut land, and talk back.

The target screens are in [docs/mockup.jpg](docs/mockup.jpg).

## Product goal

Payload is a floating astronaut on a phone. You can keep your own on screen, or send one to a friend. Theirs flies in and delivers the message in a speech bubble. No sound unless someone turns it on. No account to receive one.

The astronaut is also an assistant, not only a mascot. The owner can bring their own model (any OpenAI-compatible endpoint) or run with nothing configured. One standout, uniquely useful feature is still undecided. Do not invent it. Leave a seam for it.

Three screens in the mockup:

1. **Home screen overlay.** A small astronaut on the home screen, with a bubble and a short action (“Tell Sam”).
2. **Send a courier.** Suit and accent, personality, a message, Launch.
3. **Delivery received.** The astronaut lands in a chat, types the message, then Reply, Keep him, or Hide.

## Current state

Built and running as a website:

- `/` Send. Pick suit, visor, and accent. Pick a personality (deadpan, hype, dramatic, sarcastic). Name, message, Launch. Copy the share link.
- `/d/[id]` Recipient. The astronaut plays FlyIn, Land, and DustOff, then types the message. Reply is an in-character chat. Hide plays Wave, then FlyOff, then leaves. “Make your own” goes back to send.
- The character is the re-rigged AIRTIME model, not the procedural placeholder. The procedural astronaut is still the last-resort fallback if both GLBs fail to load.
- Chat uses Nous Portal when `LLM_API_KEY` is set. With no key, or if the call fails, the reply is a canned in-character line. The landing still plays either way.
- Deliveries are stored in `data/deliveries.json` unless Supabase env vars are set. `data/` is gitignored.
- Not built: iOS, a home-screen widget, companion mode, accounts, push, or a real free model tier. The free path today is the canned voice.

## Stack and architecture

- Next.js 16 App Router, React 19, TypeScript, Tailwind 4, shadcn/ui (Base UI).
- The astronaut is React Three Fiber and drei (`useGLTF` with Meshopt on, Draco off). Three.js r187.
- One LLM adapter, `src/lib/llm/adapter.ts`. It uses the OpenAI SDK against `LLM_BASE_URL`. Route handlers never call a provider themselves.
- One storage interface, `src/lib/storage`. Supabase when both Supabase env vars are set, otherwise the JSON file, otherwise memory.
- Speech bubbles are HTML over the canvas so type stays sharp.
- Public animation prop is still `idle | arrive | talk | depart`. Gesture tags are a separate prop.

Useful paths:

| Path | What it is |
|---|---|
| `src/app/page.tsx` | Send page |
| `src/app/d/[id]/page.tsx` | Delivery page |
| `src/components/delivery/delivery-experience.tsx` | Arrival, bubble, reply, hide |
| `src/components/astronaut/airtime.tsx` | GLB, clip sequences, tint, look-at |
| `src/components/astronaut/clip-registry.ts` | Clip name index |
| `src/lib/gestures.ts` | Tag parse and clip names |
| `src/lib/personalities.ts` | Voices and canned lines |
| `src/lib/llm/adapter.ts` | Portal client, think-stripping, fallback |
| `public/models/airtime-rigged.glb` | Runtime mesh, Meshopt + WebP |
| `public/models/airtime-rigged-uncompressed.glb` | Same character, no Meshopt |
| `model-source/` | Blender master, Mixamo FBX, runtime GLB, model report |
| `docs/mockup.jpg` | Target phone UI |

Suit, visor, and accent tint the single albedo. Dark pixels become the visor, cyan-leaning pixels take the accent, and the rest is the suit.

## Run it locally

```bash
npm install
npm run dev
```

`npm run dev` serves on port **4317** (`next dev -H 0.0.0.0 -p 4317`). Open http://127.0.0.1:4317. No env vars are required. A phone on the same network can use the machine’s LAN address on that port. `127.0.0.1` on the phone is the phone itself, not the laptop.

## Environment

Copy `.env.example` to `.env.local`. Do not commit `.env`, `.env.local`, or any `.env*.local`.

| Variable | Purpose |
|---|---|
| `LLM_API_KEY` | The only secret. Nous Portal key, or any OpenAI-compatible key. Empty means canned replies. |
| `LLM_BASE_URL` | Default `https://inference-api.nousresearch.com/v1`. |
| `LLM_MODEL` | Default `deepseek/deepseek-v4-pro`. |
| `SUPABASE_URL` | Optional. Switches persistence off the JSON file. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only. Never expose it in the browser. |
| `NEXT_PUBLIC_APP_URL` | Absolute origin for Open Graph links. |

Hermes-4-70B is **retired** on Nous Portal. A completion to that id returns 404, “This model has been retired.” It is not in the live `/v1/models` catalog. Do not point the default back at it.

DeepSeek V4 Pro is a current text flagship on that catalog. The adapter sends `chat_template_kwargs.enable_thinking: false` and strips `<think>` blocks so the courier stays short. If a provider rejects that extra field, the adapter retries once without it, then falls back to a canned line.

Chat responses include `X-Payload-Voice: portal` when a key is set and `X-Payload-Voice: canned` when it is not. A failed model call still returns the canned line.

Bring-your-own-model is the same three `LLM_*` variables. There is no second client.

## Animation and gesture tags

The rig is a 30-bone Mixamo skeleton (`mixamorig:` names) plus Helmet, Visor, Backpack, and LeftHandCurl / RightHandCurl. Bind is an A-pose. In glTF the character faces +Z, is about 1 unit tall, and has feet near y = 0. Do not scale the armature by 100.

Runtime clips, 24 fps, from `model-source/MODEL-REPORT.md`:

| Clip | Length | Loop | Used for |
|---|---|---|---|
| Idle | 3.96 s | yes | Idle, and after Talk finishes typing |
| FlyIn | 1.46 s | no | Arrive, first |
| Land | 0.96 s | no | Arrive, second. Dust puff and a light squash at impact |
| DustOff | 1.29 s | no | Arrive, third |
| Talk | 1.96 s | yes | While a bubble is typing |
| Wave | 1.29 s | no | Depart, first. Also the `[wave]` tag |
| FlyOff | 1.29 s | no | Depart, second, then the UI exits |
| Shrug | 0.96 s | no | `[shrug]` |
| Point | 1.12 s | no | `[point]` |
| Celebrate | 1.46 s | no | `[celebrate]` |
| Think | 1.96 s | no | `[think]` |
| Facepalm | 1.46 s | no | `[facepalm]` |
| Bow | 1.46 s | no | `[bow]` |
| Dance | 1.96 s | yes | `[dance]`, played once |
| Sad | 1.96 s | no | `[sad]` |
| Laugh | 1.46 s | yes | `[laugh]`, played once |
| Walk | 1.08 s | yes | In the file, not a courier state |
| Run | 0.67 s | yes | In the file, not a courier state |
| Jump | 1.92 s | no | In the file, not a courier state |

The model may start a reply with one tag: `[wave]`, `[shrug]`, `[celebrate]`, `[think]`, `[facepalm]`, `[bow]`, `[dance]`, `[sad]`, `[laugh]`, or `[point]`. The tag is stripped from the bubble and from the stored turn. The matching clip plays once, then crossfades back to Talk or Idle. Canned lines carry tags too. The only procedural motion left is a small look-at on `mixamorig:Head`.

`useGLTF(url, false, true)` turns Meshopt on. The compressed GLB needs `MeshoptDecoder` and WebP. If it fails, the loader tries the uncompressed GLB, then the procedural astronaut.

## Known weak clips

From the model report. These are the authored clips, not bugs in the player:

- **Facepalm** reads as a head drop. The mitten is near the visor, and the black visor often hides it.
- **Think** is a hand at the side of the helmet, not a chin rest. The helmet has no chin.
- **Point** is a short forward gesture, not a long side point.
- **Shrug** is smaller than the other gestures.
- **Celebrate** raises one fist. The other arm is easy to miss, and the armpit deforms a little at the extreme.
- **Walk, Run, and Jump** are retargets of the old Meshy clips. They read, with a wide A-pose arm carriage and some stiffness. Ground dips were already fixed.
- **FlyIn and FlyOff** were authored for a wider camera than a 50 mm portrait. The in-app camera is pulled back so the flight stays in frame. They do not fly in from off screen on a tight lens.
- No face morphs. Expression is pose only. Mitten hands have one curl joint, so fingers will not show.
- Tilting the **Visor** bone shows a UV seam from the original Meshy bake.

## Model source

`model-source/` is the editable pack. None of these files is over 50 MB, so they are plain git, not Git LFS.

| File | What it is |
|---|---|
| `airtime-rigged.blend` | Blender 4.5 master. About 12 MB. |
| `airtime-rigged-mixamo.fbx` | A-pose, no animation, for Mixamo. About 2.5 MB. |
| `airtime-rigged.glb` | The same runtime file as `public/models/airtime-rigged.glb`. About 1.3 MB. |
| `MODEL-REPORT.md` | Bones, clips, export notes, limitations. |

The Mixamo FBX is an A-pose. Do not retarget from a T-pose. New clips: upload that FBX, download animation-only FBX, assign the action in Blender 4.5 (set the action slot), and re-export. Details are in `model-source/MODEL-REPORT.md`.

## Next steps

The mockup is the spec for what to build next. Suggested order:

1. **iOS shell in Xcode.** Two honest options. React Native / Expo can reuse the R3F astronaut (`expo-gl`) and the same gesture player. A SwiftUI app can host the existing web app in a web view first, then load `airtime-rigged.glb` natively if the web view is not enough. Pick one before rewriting the courier twice.
2. **Floating widget.** Screen 1 of the mockup: a small astronaut on the home screen with one bubble and one action. iOS will not give a free-floating view over other apps without a widget, Live Activity, or a declared overlay. Start with a home-screen widget or an in-app overlay, not a private API.
3. **Companion mode.** The same astronaut stays on the owner’s screen, idle, and can be hidden. Today Hide only exists on a delivery.
4. **Send on the phone.** Screen 2 is close to `/`, tightened to the mockup: suit and accent, four personalities, 240-character message, Launch.
5. **Delivery inside a thread.** Screen 3 shows the courier landing in a chat, with Reply, Keep him, and Hide. Keep him is new. It should leave the astronaut on screen instead of flying him off.
6. **Deployment.** The web app can go to any Next host. The phone app needs a TestFlight or a dev build from Xcode. Do not put `LLM_API_KEY` in the client.
7. **The undecided feature.** Leave it open until the owner names it. The adapter and the gesture tag are the seams it should use.

## Safety already in the web app

Names are capped at 40 characters, messages at 400, chat lines at 240. Each delivery allows 8 model turns. Creates and chats are rate limited. The model is told not to act on anything outside this chat. Recipient text is not logged.
