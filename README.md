# aio mobile prototype

An offline Expo Go prototype for a guided first-person writing ritual. It calls no model or external API, has no account or API key, and keeps its prompt set in `src/content/prompts.json`.

## Run on iPhone

1. From this folder, run `npx expo start --tunnel`.
2. Open Expo Go and scan the QR code shown by Metro. If scanning is unavailable, Expo Go can open a pasted `exp://` address from its project/URL entry point.
3. Choose `on the phone` or `with paper and pen` on the first screen.

## Paper mode

Read the visible prompt first. Choose which optional haptic, light, and sound cues you want, then tap `I have read it` and turn the phone face down. The screen goes quiet while you write. Double-tap the back of the phone to hear the prompt's local follow-up. Picking the phone up pauses. Put it face down to continue, or turn it face up to organize a card. Taking a photo is optional and explicit.

There is no timer or automatic reminder. The light cue is off by default and requires camera permission. The page is never read by OCR. See [PAPER_MODE_DESIGN.md](PAPER_MODE_DESIGN.md) for the interaction contract and hardware limits.

## Phone mode

Hold to begin, skip or set aside the outside label, write a response, dismiss the keyboard when ready, hear the existing local follow-up, choose a line, and hold to keep it. The writing accessory includes a clear `Done` control for dismissing the iOS keyboard.

## Motion and visuals

The interface uses a warm paper palette, quiet ink, muted sage, and restrained dusty blush. Floating ambient blobs and the cloth-themed welcome art have been removed. The saved card uses a low-amplitude settling spring; the hold fill remains linear so it communicates the user's intentional hold. Reduce Motion disables the card spring.

## Demo

See [DEMO_GUIDE.md](DEMO_GUIDE.md) for three local prompt scenarios and a practical recording setup. Airtable is not connected here; the guide does not claim local prompts are new Airtable records.

## Check

```sh
npm test -- --runInBand
npx tsc --noEmit
```

The unit tests cover the paper and phone state machines, prompt selection, sensors, and safety checks. Back-tap, torch, haptic, camera, and Photos behavior must still be checked on a real iPhone because Expo Go and device models can differ.
