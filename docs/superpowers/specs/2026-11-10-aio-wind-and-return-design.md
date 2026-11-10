# aio: Wind and Return

Date: 2026-11-10
Status: Design draft for Yvette's review. No app implementation is authorized by this document alone.

## Product promise

aio gives a person one quiet place to speak or write what is present. A physical gesture lets the words leave the current screen. The complete words remain available in a private, optional archive, so a person may later notice change without being pushed to review after every session.

The two meanings must never be confused: drifting words leave the moment, not the record. aio does not claim to erase them, diagnose the person, or guarantee progress.

## Scope and relationship to the current app

This design revises the `rejection-v1` experience, not the preserved `LegacyApp.tsx` prototype. The current rejection flow stores body sensations and understanding but clears the initial spoken text, does not use a model, and has no delete action. This design changes those three boundaries explicitly. Do not reuse the old storage contract or its copy as though they still describe the new experience.

The first beta is an in-person demonstration on Yvette's own iPhone. It is not a distributed app build. Product behavior, privacy promises, and accessibility must still be represented honestly during that demo.

The experience has two independent implementation slices:

1. capture, local retention, motion, archive, and deletion;
2. optional, on-device interpretation and comparison.

The first slice must work without the second. A beta that has not implemented real on-device interpretation must not present scripted or remote output as live AI.

## Experience structure

### 1. Arrive and record

The initial view has one dominant action: begin speaking or writing. A smaller, discoverable archive entry is present but does not compete with the recording action. There are no tabs, dashboards, scores, streaks, emotion cards, or persistent navigation bars.

Speaking and writing feed the same editable text field. Speech is transcribed on device when the locale and recognizer support that capability. No audio file is retained. The person can inspect and correct the transcript before release. If on-device speech recognition is unavailable, writing remains available; the app does not silently use cloud transcription.

The app discloses, before the first release, that the complete text will be saved locally and that the wind animation is not deletion. The disclosure is brief and is not repeated as a modal after every session.

### 2. Loosen, rest, and wind

The release gesture has distinct states:

```text
editable text -> shaking/loosening -> loosened/ready -> stillness -> local save -> wind -> quiet end
```

- Shaking makes the sentence subtly lose its rigid arrangement. Words loosen, spacing breathes, and individual letters or Chinese characters begin to feel independent, but the text remains readable.
- Motion below the release threshold does not complete the ritual. If shaking stops early, undetached text settles back. Accidental walking or ordinary hand movement must not trigger the wind.
- Once the shake threshold is reached, the text remains on screen in a loosened state. The person may keep holding the phone. No flat surface or horizontal orientation is required.
- A short period of stillness triggers the wind. New movement during that period restarts the stillness timer without erasing the achieved loosened state.
- The complete corrected text is saved locally before the wind removes it from view. If saving fails, the wind does not claim completion; the text stays available with a retry path.
- The wind first preserves enough of the sentence to remain legible, then separates letters or Chinese characters and carries them away in a soft, directional drift. The background stays largely still. No confetti, success sound, or decorative petal particles accompany the user's words.
- Completion ends in a short quiet interval, then returns to the simple starting surface. Archive and comparison do not open automatically.

Shake strength, stillness duration, drift timing, and haptic frequency remain adjustable design tokens until tested on the real iPhone. The stillness detector infers lack of movement; it does not claim to detect physical contact with a table.

The wind reference is the user-shared XiaoHongShu work *做了一场风，把字吹散了* by 鼻毛刺客. Borrow its transition from an arranged passage to independent drifting characters and its final negative space, not its exact composition.

### 3. Return by choice

The archive is a secondary, accessible entry. It never appears as a post-session prompt. Opening it initially shows a quiet list of saved records, not a default comparison of the two most recent entries. Opening one record reveals its full original text.

Comparison is a further optional action. The person selects two records intentionally. The app then may show the two full texts and, if on-device interpretation is available, one short observation grounded in exact words from both. It never automatically picks the latest two and never claims that a negative emotion has been cured.

Each record can be deleted. The archive also offers a separately confirmed action to delete all records. Deletion removes the selected locally stored text and any derived interpretation associated with it. No account, social sharing, notification, or export feature is part of this beta.

## On-device interpretation

Only when the person opens an optional review or comparison does the app request analysis. On-device AI may suggest a core emotion and question for a record and one comparison observation for a selected pair. These are tentative interpretations, not facts about identity or mental health. The person can correct or hide them. AI output is visually subordinate to original words.

The app must check model and language availability on the actual phone. If the on-device model is unavailable, unsupported, not ready, or refuses the input, the original records remain readable and comparison remains a manual side-by-side view without fabricated AI text. There is no cloud fallback and no app-initiated upload of text or audio for processing. The app must not make an absolute claim about operating-system backups unless backup behavior has been verified separately.

An observation is valid only if it points to concrete wording in both selected records. It may describe a change, continuity, or uncertainty. It must not always find improvement, assign a score, diagnose, invent facts, or write a first-person conclusion on the person's behalf. If there is insufficient evidence, it says so or offers no observation.

## Visual grammar

The interface is extremely minimal, with material richness used selectively rather than as layered UI furniture.

- Base surfaces: full-screen warm paper or deep charcoal, not cards placed on a pastel canvas. A low-contrast paper grain may give the surface tactility without reducing text legibility.
- Typography: clear, comfortable text for long original records and controls. An expressive, slightly irregular hand or calligraphic face is limited to the aio mark, a very short phase title, or the moving words. Script is not used for long passages or small instructions.
- Botanical material: a single pressed flower, petal, or plant imprint may mark an arrival, pause, or archive threshold. It does not compete with live transcription. The wind moves the person's letters, not decorative flowers.
- Color: dark ink, warm ivory, and one restrained botanical accent at a time. A pure-color screen is welcome when it gives the moment a clear emotional temperature. Avoid multicolor categories that imply emotion scores.
- Controls: no outlined capsule buttons, bento grids, nested cards, sticker clusters, faux AI dashboard, or decorative chrome. Controls are plain, high-contrast, and easy to recognize.
- Language: app interface copy is English only. User-authored content and recognition language are not restricted to English where supported and tested.

The image references supplied in chat form three levels of use:

1. *Herbarium Imprints* botanical prints are the primary model for quiet app surfaces and archive marks.
2. *Bloom & Shade* translucent floral atmosphere may inform brief arrival or ending states.
3. *Thin Air* and *The Garden Treasures* layered collage can inform a single cover or course-presentation frame, but do not fill the active writing screen.

For this private iPhone beta, the user-supplied promotional images may serve as temporary local visual material. They are not proof that clean component files, fonts, or redistribution rights are available. Do not embed screenshot titles, seller marks, or promotional copy as if they were aio content. Replace such temporary material before any distributed release, and separately check the relevant asset and font permissions.

The previously chosen visual study `01 / Expressive type, quiet frame` remains the base for hierarchy. These botanical references replace its generic flatness with selective physical texture; they do not license a busier layout.

## Accessibility and failure behavior

- A person unable or unwilling to shake can invoke a clearly available alternative release action. VoiceOver exposes a named action. The alternative leads to the same save and quiet-end state.
- Reduce Motion replaces spatial scattering with a brief, non-directional fade after the same explicit release decision. Stillness is not mandatory when the accessibility alternative is used.
- Active and archived text must stay readable with large text settings, strong contrast, and VoiceOver. Decorative images are ignored by assistive technology unless they convey necessary information.
- Microphone denial, unsupported local speech, empty input, interrupted recognition, unavailable motion sensors, save failure, and unavailable local model each have a truthful recovery path. None silently sends content to a server.
- The app never animates the words away before it has confirmed local persistence. A failed save never produces a false sense of completion.

## Acceptance on Yvette's iPhone

The private beta is ready for an in-person test only when these outcomes are observed on the actual device:

1. Speaking or writing produces editable text, and no audio recording remains after the session.
2. Ordinary walking and brief hand movements do not launch the wind. Intentional shaking loosens the words. Stopping early settles them. After sufficient shaking, a held but still phone triggers the wind without needing a table.
3. If motion resumes during the stillness interval, the wind waits. The user can complete the ritual without shaking through the alternative action.
4. The full corrected text is still present in the archive after visual dispersal. No comparison opens after completion. A selected record opens alone, and two records compare only after a deliberate choice.
5. Deleting one record and deleting all records work as described. A failed save leaves the words available and gives a retry path.
6. Local AI either produces an evidence-grounded, correctable observation on an eligible phone or clearly remains unavailable. No cloud request or invented fallback result occurs.
7. English UI, mixed-language user text, VoiceOver, large text, Reduce Motion, and contrast are tested in the screens where they matter.
8. The screens feel quiet to a first-time tester who has not read this document. They understand that drifting is a visual release, not deletion, and can find their record later without being pushed into analysis.

Automated tests and screenshots are supporting evidence, not substitutes for this device and human check.

## Boundaries

This design does not add a therapist persona, notifications, trends, streaks, sentiment charts, a timeline dashboard, cloud sync, social sharing, or an AI-authored identity statement. It does not change the old paper mode. It does not approve any particular third-party asset for public distribution.

Implementation requires a separate plan and a copy review. The code, current beta, and earlier visual sketches must not be described as already matching this document.
