# aio paper mode and motion design

## Product promise

Paper mode lends the phone's physical weight to a writing ritual. The phone is a quiet paperweight, not a screen to watch. The person reads the prompt while the screen is visible, turns the phone face down, writes at their own pace, asks for one local follow-up when they want it, picks the phone up to pause, and turns it face up to make a card.

There is no countdown, idle timer, automatic reminder, model, account, network request, or cloud storage. Prompt and follow-up text come from `src/content/prompts.json` and remain on the device.

## Interaction sequence

| State | What the person does | What aio does |
| --- | --- | --- |
| Read | Read the visible prompt and choose optional haptic, light, and sound cues | Shows the exact local prompt and a plain-language explanation |
| Turn down | Press “I have read it,” then place the phone screen-down on the page | Waits for a continuous stable face-down orientation; signals the start using only enabled cues. A visible “begin quiet writing” action is available if the sensor does not respond; tap it, then turn the phone down |
| Write | Write freely on paper | Hides the interface and status bar. No elapsed time, progress, or reminder appears |
| Ask | Double-tap the phone back when a follow-up would help | Speaks the prompt's local follow-up once, with optional haptic and brief light cue |
| Pause | Pick up or move the phone, or tap the dark screen | Pauses writing; shows a calm pause screen when the phone is visible |
| Return | Put it face-down to continue, or turn it face-up to finish | Resumes writing when face-down; opens card organization when face-up and still |
| Keep | Optionally photograph the page, choose handwriting or type one underlined line, then hold to keep | Makes a local card. Saving to Photos is a separate, explicit action |

The user controls when the follow-up happens and when the session ends. A second follow-up is not generated because this prototype has no source text beyond the one locally authored follow-up.

## Signal and safety rules

- Haptics and sound are enabled by default; the light cue is off by default. The person can change all three before beginning.
- A quiet local ambient bed starts on app launch and can be turned off from the top bar on any visible step. It pauses while paper writing is underway. A separate soft tone marks enabled paper-mode cues; neither sound repeats on a timer.
- Light requires camera permission. If permission is declined, paper mode continues without light.
- No cue repeats on a schedule. There is no flash during ordinary writing.
- Face-down detection uses a continuous stable run of accelerometer readings and may vary by device, case, surface, and orientation. The user can start writing manually if orientation is not detected, and can tap the dark screen to pause. The session does not depend on a perfect sensor reading to preserve the paper they wrote.
- A small contextual back/next dock is available throughout visible flow steps. It does not appear during quiet writing, when the screen is intentionally dark; a touch on that screen pauses the session.
- The physical page is not photographed unless the person explicitly chooses “take a picture.” Photos stay local. Card export asks for Photos permission only when requested.
- Camera/flash behavior, haptics, and back-tap recognition still require a real-iPhone check. Expo Go is a prototype environment, not a guarantee of production hardware behavior.

## Visual framework

- Warm matte paper `#F5F2E9`, quiet ink `#3D473B`, muted sage `#748B7A`, and a small amount of dusty blush `#E7D9D1`.
- Hand-drawn lettering is an accent, not a reason to put every label in display type. Keep long instructions readable and airy.
- No saturated purple/lime fields, floating blobs, cloth/patchwork hero illustration, heavy shadows, or fake depth.
- One clear action per screen. Rounded controls remain quiet and physically legible; the saved card has a nearly flat edge and minimal shadow.
- Illustrative elements are sparse marks. Do not add decorative elements that compete with the writing prompt.

## Motion rules

Motion should explain a change of state, not decorate waiting. The card settles into place with a low-amplitude spring. Button fills track the user's hold linearly because they represent elapsed intentional contact. Other screen changes use a short ease-out and remain immediately cancellable. Reduce Motion disables the card spring.

This follows Apple's guidance to use motion purposefully, briefly, and with alternatives such as haptics or audio, and Material's distinction between expressive spring motion and restrained standard motion. The product uses the restrained end of that range: no overshoot, no repeating loop during writing, and no animation that asks the user to watch the screen.

References:

- [Apple Human Interface Guidelines: Motion](https://developer.apple.com/design/human-interface-guidelines/motion)
- [Material Design: Motion physics system](https://m3.material.io/styles/motion/overview/how-it-works)

## Prototype boundary

This is an offline Expo Go prototype. It does not call a model or external API and contains no API keys. It uses local prompts, device sensors, optional device cues, and explicit local photo actions. It does not detect, transcribe, or interpret handwriting.
