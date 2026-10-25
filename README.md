# aio agent prototype

aio is a quiet writing interviewer with two implemented entry points: the Expo app and a Telegram bot adapter. Both phone conversations use the same bounded Agent Core. The paper ritual stays local and offline.

The persona is warm but reserved, like a stall keeper meeting strangers at a market or near a temple. It asks one concrete question at a time and does not diagnose, praise, label identity, tell fortunes, or claim special knowledge of the visitor.

## Privacy boundary

| Entry | Leaves the device | Session storage |
| --- | --- | --- |
| App phone mode | Typed text and on-device transcript text go to the aio service and OpenAI | In memory only; deleted on completion, stop, timeout, or server restart |
| App raw voice | No. Recognition is configured to require the device model | Not recorded or saved by aio |
| Telegram | Messages go through Telegram, the aio service, and OpenAI | In memory only, with the same deletion rules |
| Paper mode | Nothing | Local interaction only |

## Configure the agent service

Copy `.env.example` to `.env.local` and add your own values. Do not commit `.env.local`.

```sh
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-5.6-terra
TELEGRAM_BOT_TOKEN=your_bot_token
EXPO_PUBLIC_AIO_AGENT_URL=http://YOUR_COMPUTER_LAN_IP:8787
```

The iPhone cannot reach your computer through `127.0.0.1`, so use the computer's LAN address when testing on a physical phone.

Run the deterministic fake agent without credentials:

```sh
npm run agent:fake
```

Run the OpenAI-backed service:

```sh
npm run agent
```

When `TELEGRAM_BOT_TOKEN` is present, the same process also starts Telegram long polling. When it is absent, the App HTTP service still runs.

## Run the App on iPhone

Voice input uses a native speech-recognition module, so create a development build rather than relying on Expo Go:

```sh
npx expo run:ios --device
```

For UI work that does not exercise voice input, start Metro with `npx expo start`. Then choose `on the phone` or `with paper and pen` on the first screen.

Keep the agent service running and set `EXPO_PUBLIC_AIO_AGENT_URL` before building. The phone and computer must be able to reach each other on the network.

## Telegram

1. Create a bot with BotFather and place its token in `.env.local`.
2. Start `npm run agent`.
3. Send `/start`, answer three times, choose one candidate line, or send `/stop` to discard the session.

Inline callback data contains only an opaque candidate index. It does not repeat the private line in the callback payload.

1. From this folder, run `npx expo start --tunnel`.
2. Open Expo Go and scan the QR code shown by Metro. If scanning is unavailable, Expo Go can open a pasted `exp://` address from its project/URL entry point.
3. Choose `on the phone` or `with paper and pen` on the first screen.

## Paper mode

Read the visible prompt first. Choose which optional haptic, light, and sound cues you want, then tap `I have read it` and turn the phone face down. The screen goes quiet while you write. Double-tap the back of the phone to hear the prompt's local follow-up. Picking the phone up pauses. Put it face down to continue, or turn it face up to organize a card. Taking a photo is optional and explicit.

There is no timer or automatic reminder. The light cue is off by default and requires camera permission. The page is never read by OCR. See [PAPER_MODE_DESIGN.md](PAPER_MODE_DESIGN.md) for the interaction contract and hardware limits.

## Phone mode

Choose English or 中文, review the privacy note, and hold to begin. The main writing box accepts typing or on-device speech. Dismissing the keyboard does not send the draft. Only the explicit `next` action submits it. aio returns one bounded follow-up at a time, then offers exact lines from the visitor's own writing. Holding to keep a line closes and deletes the server session.

## Motion and visuals

The interface uses a warm paper palette, quiet ink, muted sage, and restrained dusty blush. Floating ambient blobs and the cloth-themed welcome art have been removed. The saved card uses a low-amplitude settling spring; the hold fill remains linear so it communicates the user's intentional hold. Reduce Motion disables the card spring.

## Demo

See [DEMO_GUIDE.md](DEMO_GUIDE.md) for App, Telegram, and paper scenes. iMessage and WeChat are future adapter possibilities, not implemented channels.

## Check

```sh
npm test -- --runInBand
npx tsc --noEmit
npx expo export --platform ios
npx expo export --platform android
```

The automated suite covers the Agent Core, persona bounds, disposable sessions, OpenAI request shape, HTTP routes, Telegram mapping, App client, cursor-safe transcript editing, state machines, sensors, and safety checks.

Still requiring user-owned credentials or hardware verification:

- live OpenAI and Telegram end-to-end behavior;
- English and Mandarin on-device recognition in an iPhone development build;
- permission denial, missing offline language model, and user-initiated stop on iOS and Android;
- Android speech hardware behavior;
- back-tap, torch, haptic, camera, and Photos behavior on a real iPhone.
