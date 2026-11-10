# aio wind core implementation plan

Design source: `../specs/2026-11-10-aio-wind-and-return-design.md`.

## Scope

Implement the independent first slice: editable voice or typed input, local persistence before wind, shake then stillness, reduced motion and an alternative release, hidden archive, individual and all deletion. Keep the prior rejection implementation intact. The later on-device interpretation is a separate plan because it needs a native iPhone capability check.

## Files

- `App.tsx`: route to the new independent surface.
- `src/wind/store.ts`: versioned full-text record store and delete operations.
- `src/wind/motion.ts`: pure shake/stillness phase logic.
- `src/wind/WindWords.tsx`: loosening and wind animation, with reduced-motion fade.
- `src/wind/WindApp.tsx`: capture, state flow, archive, explicit comparison, and failure paths.
- `tests/wind-store.test.ts`, `tests/wind-motion.test.ts`: persistence and gesture boundary checks.

## Task 1: full-text local store

1. Add a failing test: whitespace-only drafts reject; saved corrected text survives read; one and all deletion work.
2. Implement a new AsyncStorage key. Never write to the old rejection key.
3. Run the focused test.

## Task 2: motion phases

1. Add failing tests: ordinary movement never arms; repeated deliberate shakes arm; held-still phone triggers only after a delay; renewed movement restarts delay.
2. Implement a pure phase function with explicit timestamps and thresholds, using the existing shake detector for deliberate motion and axis-delta checks for stillness.
3. Run the focused test.

## Task 3: quiet capture and wind

1. Build one full-screen writing surface with English-only controls, one editable field, on-device voice recognition through the existing hook, and short first-use local-save disclosure.
2. Keep the complete draft visible until the store confirms saving. Start wind only after save succeeds. On failure keep the text and show retry.
3. Animate letter movement after the shake/stillness trigger. During shake only loosen the arrangement. Reduced Motion uses fade.
4. Expose a visible alternative release and VoiceOver action. Keep archive secondary and never auto-open it.

## Task 4: archive and verification

1. Show a quiet list, selected full record, and optional comparison of two records only after explicit selection. Without local model, show full text side by side and state that interpretation is unavailable.
2. Confirm one/all deletion in the UI. Keep records locally, with no share/export.
3. Run focused tests, full `npm run check`, and an iOS export check. Report device-only acceptance items separately.

## Later slice

Plan and implement optional on-device interpretation only after verifying native model availability and language support on Yvette's actual iPhone. Do not substitute scripted or cloud output.
