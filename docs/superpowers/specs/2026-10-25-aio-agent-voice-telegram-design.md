# aio Agent, Voice Input, and Telegram Prototype Design

Date: 2026-10-25

## Status

Approved product direction. This document is the implementation source of truth for the first working prototype.

## Product promise

aio is a one-session, cross-channel quiet writing interviewer. It uses a small number of bounded follow-up questions to help a person find and keep one sentence from their own words. It does not diagnose, assign a personality, author an identity statement, or build a long-term profile.

The prototype demonstrates that aio is not limited to an app by exposing the same agent core through two real entry points:

1. the existing Expo mobile app, with text and bilingual on-device speech input; and
2. a working Telegram bot.

Each entry point creates an independent, disposable session. There is no cross-channel identity matching or session handoff.

## Existing product boundary

The current Expo SDK 57 app contains phone and paper modes. This work changes phone mode into a networked agent experience. Paper mode remains unchanged: it continues to use local authored prompts and no model or network service.

The current visual direction remains warm, restrained, and writing-first. The feature must not introduce a dashboard, scores, streaks, personality labels, decorative recording animation, or persistent navigation.

## System architecture

The prototype has one shared agent core and two thin adapters:

```text
Expo App -----\
               >--- aio Agent Core --- ModelAdapter --- OpenAI API
Telegram Bot -/
```

### aio Agent Core

The core is a TypeScript service responsible for:

- creating and deleting one-session conversations;
- enforcing the interview state machine;
- selecting an existing authored entry prompt;
- requesting one short model-generated follow-up at a time;
- validating all model output before it reaches a user;
- extracting candidate lines only from the user's own text;
- returning a channel-neutral response contract; and
- removing session content on completion, stop, timeout, or process restart.

The state machine is:

```text
arrive -> recall -> deepen -> findLine -> keep | setAside -> end
```

The model cannot select arbitrary stages. Stage transitions are deterministic and owned by the core. A normal conversation completes within four to seven user messages.

### Shared response contract

Every adapter consumes a validated response with these conceptual fields:

- `sessionId`
- `stage`
- `message`
- `candidateLines`, when the user is choosing a line
- `complete`
- `keptLine`, only after the user chooses or edits a line

The implementation may refine field names, but it must preserve this separation between deterministic state and generated language.

### ModelAdapter

The first provider is the OpenAI API. Provider-specific code sits behind a replaceable `ModelAdapter`; the agent core does not import provider-specific types.

The OpenAI API key remains server-side in an ignored environment file. Tests use a deterministic fake adapter by default. Only live integration tests and real use call the API.

### Prototype runtime

The agent core and Telegram adapter run in one local Node process for the first prototype. Telegram uses long polling, so a public webhook is not required. The Expo app reaches the same service over a local network address or secure development tunnel.

Sessions are stored only in server memory with a short inactivity timeout. A service restart therefore clears every session by design.

## Interview behavior

### Persona: the keeper of a small public stall

aio should feel like encountering the keeper of a small stall at a market or near a temple: someone rooted in one place who regularly meets strangers, welcomes them without demanding intimacy, and offers a little focused attention before they continue on their way.

The relationship is warm but deliberately bounded:

- aio is hospitable, observant, and easy to approach;
- aio maintains the respectful distance of a stranger and never pretends to know the user deeply;
- aio offers one invitation at a time instead of pursuing, persuading, or interrogating;
- aio is comfortable with pauses, short answers, refusal, and departure;
- aio may reflect a concrete word or image the user has offered, but does not perform emotional mirroring;
- aio treats the kept line like something the user noticed and chose at the stall, not a verdict handed down by the agent; and
- aio lets the encounter end cleanly, without promising a relationship or asking the user to return.

This is a relational metaphor, not a decorative theme or claim to spiritual authority. aio must not act like an oracle, fortune teller, guru, priest, therapist, or life coach. It does not predict, preach, diagnose, interpret symbols, or present ordinary model output as wisdom.

The language should be plain, brief, and gently specific. Warmth comes from attention and permission, not praise, pet names, excessive reassurance, emojis, mystical language, or forced familiarity.

aio follows these rules in both channels:

- Ask one question at a time using one or two short sentences.
- Start from the existing local prompt collection.
- Use at most two or three dynamic follow-ups.
- Prefer concrete people, places, actions, objects, and sensory details.
- Do not praise, diagnose, teach, optimize, label, or infer identity.
- Do not write the user's final sentence for them.
- When finding a line, offer only exact contiguous text from the user's messages.
- Allow `skip`, `set aside`, and `stop` without persuasion.
- Never send reminders or contact the user after the session ends.

If generated output violates the schema, length limit, current stage, or behavioral rules, the service discards it and uses a short authored fallback question.

## Expo app adapter

Only phone mode becomes agent-backed. Paper mode stays local and unchanged.

Phone mode preserves the existing one-question-at-a-time layout. The user may type or dictate in the main writing field. The app stores the current unsent draft locally so that a network failure does not erase it. API credentials never ship in the app.

When the service cannot be reached, the app shows a quiet error, keeps the draft, and offers retry, return to writing, or end. It does not pretend the response succeeded.

At the end of a completed phone session, the existing card experience displays the kept line.

## On-device voice input

Voice input is available only in the main phone-mode writing field. It uses `expo-speech-recognition` compatible with Expo SDK 57 in a development build.

Requirements:

- Request microphone and speech-recognition permission only when the user first starts voice input.
- Require on-device recognition; never fall back silently to network recognition.
- Support an explicit `English` (`en-US`) and `中文` (`zh-CN`) selector.
- Stream interim text into the current writing field.
- Preserve existing text and insert at the current selection; replace selected text when a range is selected.
- During recognition, lock keyboard editing and language switching.
- On stop, commit the final result or the latest valid interim result.
- If no speech is recognized, restore the original text.
- Pause ambient audio while listening and restore it according to the user's existing music setting.
- Stop and clean up recognition when the user leaves the writing step, changes mode, or closes the session.
- Do not persist an audio file.

The interface uses a calm language selector, microphone/stop control, and plain text states such as `listening`, `finishing`, and a specific error. It does not use a looping waveform or decorative pulse.

If the device lacks an installed English or Chinese on-device model, the app explains which model is missing and directs the user to system settings. Phone typing and paper mode remain available.

## Telegram adapter

The Telegram bot uses the official Bot API through long polling.

- `/start` deletes any previous unfinished session for that chat and opens a new one.
- Plain text becomes a user response in the current session.
- Candidate lines are presented with concise inline buttons plus an option to type a revised line.
- `/stop` deletes the session immediately.
- Completion sends the kept line and states that the session has ended and its working context was cleared.
- A Telegram chat may have only one active aio session.
- The bot never initiates reminders or follow-up messages.

Telegram chat identifiers are used only as in-memory routing keys and are not written to content logs.

## Privacy and safety

The privacy boundary must be visible to the user:

- Raw microphone audio remains on device and is not saved.
- Dictated transcripts and typed phone-mode text are sent to the local agent service and then to the configured cloud model.
- Paper mode remains fully offline.
- Full conversation bodies are excluded from application and error logs.
- Logs may contain time, stage, adapter, duration, and error category.
- Completion, stop, timeout, or restart removes the in-memory session.

For language indicating immediate risk of self-harm or harm to others, aio pauses the reflective writing flow and shows a concise, non-diagnostic support response encouraging real-world help. It does not claim to be a therapist, provide a diagnosis, or contact another person automatically. Exact resources must be verified for the user's region before they are shown.

## Error handling

The product exposes distinct, actionable states for:

- microphone permission denied;
- speech-recognition permission denied;
- on-device recognition unavailable;
- selected language model missing;
- no speech detected;
- recognition interrupted;
- agent service unreachable;
- model request failed or timed out;
- invalid model response; and
- Telegram polling or send failure.

No failure may discard an unsent app draft. No channel may mark a session complete unless the core records a valid terminal transition.

## Testing and acceptance

### Unit tests

- Every legal and illegal agent state transition.
- Four-to-seven-turn completion boundary.
- Candidate lines are exact contiguous spans from user text.
- Session deletion on complete, stop, timeout, replacement, and restart.
- Chinese and English schema validation.
- Cursor insertion, selected-range replacement, partial-result replacement, and empty-result restoration for voice input.

### Model behavior evaluations

Use Chinese and English fixtures covering ordinary reflection, empty answers, very long answers, repeated skips, prompt injection, requests for advice or diagnosis, and high-risk language. Verify one-question output, brevity, specificity, non-diagnostic behavior, and fallback behavior.

### Adapter and integration tests

- Run the same event fixtures through the App and Telegram adapters and assert identical core transitions.
- Cover Telegram `/start`, normal replies, candidate selection, revised lines, `/stop`, repeated start, polling failure, and restart.
- Cover App network failure, retry, navigation cleanup, local draft preservation, and card completion.

### Device tests

On a real iPhone development build, verify both locales, permission allow and deny, missing language model, start and stop, live interim text, cursor insertion, selected-text replacement, ambient-audio pause and restoration, navigation cleanup, and final editable text.

Android must pass build and automated tests. If no Android device is available, Android hardware behavior remains explicitly unverified.

### Acceptance criteria

1. App and Telegram can each independently complete a one-session interview through the same agent core.
2. The kept line is derived from the user's own words.
3. Phone mode accepts typed or bilingual on-device speech input.
4. Paper mode remains offline and behaviorally unchanged.
5. Ending a session removes it from the agent core.
6. No raw audio, complete conversation body, model key, or Telegram token is committed or written to ordinary logs.

## Explicitly out of scope

- Cross-channel identity or session handoff.
- Long-term memory or user profiles.
- Proactive reminders.
- iMessage, WeChat, or OpenClaw channel implementation.
- Accounts, analytics dashboards, scores, streaks, or rankings.
- Handwriting transcription or interpretation.
- Production hosting, horizontal scaling, durable databases, or production incident tooling.
