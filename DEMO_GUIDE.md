# aio demo recording guide

## Suggested scenes

Use the existing local prompt IDs below. The prompt wording stays unchanged.

1. **A small moment that felt like you**: `p01`. Best for showing the phone ritual and how a specific memory grows from a simple prompt. Read the prompt, turn the screen down, write, request the follow-up with two taps, then turn the phone up and type one underlined line onto the card.
2. **Three things from yesterday**: `p03`. Best for a quiet paper-first demonstration. Write three ordinary details, ask the follow-up only after you have written, then choose one detail worth keeping.
3. **The first thing you bought with your own money**: `p09`. Best for a more narrative demo. Let the memory unfold on paper, use the follow-up, and keep a line that captures the object or where it ended up.

The prompts and follow-ups are in `src/content/prompts.json`. This guide references them by ID instead of copying or editing the source text. In paper mode, tap `choose another question` until the visible prompt matches the scenario you want to record.

## Recording setup

- Make one clean 60 to 90 second take per scene. Use a quiet table, warm daylight, a plain sheet of paper, and a dark or neutral phone case so the screen-down action reads clearly.
- Record the phone screen with iOS Screen Recording. For paper mode, also film a top-down view with a second device so viewers can see the page, the phone being turned over, the intentional double-tap, and the return to the card.
- Keep the two recordings aligned in editing. The phone screen should go dark/quiet while face-down, not show a timer or progress animation. Let the physical writing take most of the time.
- Before each take, verify the chosen cues. Keep light off unless the room is dim; the light signal is brief and optional. Set notification banners to Focus/Do Not Disturb so the writing moment stays private.
- End with the card and, if demonstrating export, show the explicit “save the card” action and the result in Photos. Do not imply that paper mode automatically reads or stores handwriting.

## Current source boundary

This prototype currently reads samples from the local prompt file. Airtable is not connected to this workspace through an available tool, so no Airtable records have been read or changed. Do not describe these three local prompt IDs as new Airtable records.
