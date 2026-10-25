# aio Agent, Voice Input, and Telegram Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build one disposable aio writing-interviewer core used by the Expo phone flow and a working Telegram bot, with bilingual on-device voice input in the App while leaving paper mode offline and unchanged.

**Architecture:** Add a pure TypeScript agent domain and in-memory service, then expose it through a small Node HTTP server and Telegram long-polling adapter. The Expo app consumes the neutral HTTP contract; voice recognition remains on-device and inserts interim text through a separately tested transcript-editing unit. OpenAI access stays behind a replaceable server-only model adapter using Responses Structured Outputs.

**Tech Stack:** Expo SDK 57, React Native 0.86, TypeScript 6, Jest 29, Node HTTP/fetch, OpenAI Node SDK 7, Zod 4, Telegram Bot API, `expo-speech-recognition` 57.

**Design source:** `docs/superpowers/specs/2026-10-25-aio-agent-voice-telegram-design.md`

**OpenAI source:** Use the official Responses API with Structured Outputs and Zod. The default prototype model is `gpt-5.6-terra`, the current official recommendation for conversational interfaces; allow `OPENAI_MODEL` to override it.

---

## File map

- `src/agent/types.ts`: channel-neutral stages, session state, commands, and responses.
- `src/agent/machine.ts`: deterministic state transition and turn bounds.
- `src/agent/lines.ts`: exact contiguous candidate-line extraction and verification.
- `src/agent/persona.ts`: stall-keeper prompt, forbidden behavior, authored fallbacks.
- `src/agent/validation.ts`: validate generated follow-ups before display.
- `server/model/ModelAdapter.ts`: provider-neutral generation interface.
- `server/model/FakeModelAdapter.ts`: deterministic test provider.
- `server/model/OpenAIModelAdapter.ts`: server-only Responses API integration.
- `server/SessionStore.ts`: in-memory sessions with timeout deletion.
- `server/AgentService.ts`: orchestration and safety boundary.
- `server/http.ts`: `/sessions` HTTP contract used by Expo.
- `server/telegram.ts`: Telegram long-polling adapter.
- `server/index.ts`: environment validation and process startup.
- `src/app/agentClient.ts`: Expo HTTP client with typed errors.
- `src/speech/transcriptEdit.ts`: cursor-aware interim transcript replacement.
- `src/speech/useVoiceInput.ts`: native recognition lifecycle.
- `src/components/VoiceInputBar.tsx`: bilingual language and start/stop controls.
- `src/machine/phoneMachine.ts`: agent-aware phone UI states only; paper machine is untouched.
- `App.tsx`: compose App client, speech hook, phone screens, and existing Card.
- `tests/agent-machine.test.ts`, `tests/agent-service.test.ts`, `tests/http.test.ts`, `tests/telegram.test.ts`, `tests/agent-client.test.ts`, `tests/transcript-edit.test.ts`, `tests/phone-agent-machine.test.ts`: focused automated coverage.
- `README.md`, `DEMO_GUIDE.md`, `.env.example`: setup, privacy boundary, demo and verification.

### Task 1: Install and configure bounded dependencies

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `app.json`
- Modify: `.gitignore`
- Create: `.env.example`

- [ ] **Step 1: Install exact dependencies with the safe temporary npm cache**

Run:

```bash
npm --cache /private/tmp/aio-npm-cache install openai@7.43.0 zod@4.6.7 expo-speech-recognition@57.1.1
npm --cache /private/tmp/aio-npm-cache install --save-dev tsx@4.23.15
```

Expected: `package.json` and `package-lock.json` change; install exits 0.

- [ ] **Step 2: Add server scripts to `package.json`**

Add these entries without changing the existing Expo scripts:

```json
"agent": "tsx --env-file=.env.local server/index.ts",
"agent:fake": "AIO_FAKE_MODEL=1 tsx server/index.ts",
"check": "npm test -- --runInBand && npx tsc --noEmit"
```

- [ ] **Step 3: Configure native speech permissions in `app.json`**

Replace the `plugins` array with:

```json
"plugins": [
  "expo-audio",
  [
    "expo-speech-recognition",
    {
      "microphonePermission": "Allow aio to listen while you choose to speak.",
      "speechRecognitionPermission": "Allow aio to turn your speech into editable text on this device."
    }
  ]
]
```

- [ ] **Step 4: Add ignored secret patterns and a safe example**

Append to `.gitignore`:

```gitignore
.env
.env.*
!.env.example
```

Create `.env.example`:

```dotenv
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6-terra
TELEGRAM_BOT_TOKEN=
AIO_AGENT_PORT=8787
AIO_SESSION_TTL_MS=3600000
EXPO_PUBLIC_AIO_AGENT_URL=http://127.0.0.1:8787
```

- [ ] **Step 5: Verify configuration and commit**

Run: `npx expo config --type public && git diff --check`

Expected: speech-recognition plugin appears; no config or whitespace error.

```bash
git add package.json package-lock.json app.json .gitignore .env.example
git commit -m "chore: configure aio agent and speech dependencies"
```

### Task 2: Build the deterministic agent domain

**Files:**
- Create: `src/agent/types.ts`
- Create: `src/agent/machine.ts`
- Create: `src/agent/lines.ts`
- Create: `tests/agent-machine.test.ts`

- [ ] **Step 1: Write the failing domain tests**

Create `tests/agent-machine.test.ts`:

```ts
import { advanceStage } from '../src/agent/machine';
import { extractCandidateLines, isExactUserSpan } from '../src/agent/lines';

test('agent follows the bounded interview path', () => {
  expect(advanceStage('recall', 1)).toBe('deepen');
  expect(advanceStage('deepen', 2)).toBe('deepen');
  expect(advanceStage('deepen', 3)).toBe('findLine');
  expect(advanceStage('findLine', 4)).toBe('findLine');
});

test('candidate lines are exact user spans', () => {
  const turns = ['I waited by the blue door. Then the rain began.', 'My hands smelled like oranges.'];
  expect(extractCandidateLines(turns, 3)).toEqual([
    'I waited by the blue door.',
    'Then the rain began.',
    'My hands smelled like oranges.',
  ]);
  expect(isExactUserSpan('the blue door', turns)).toBe(true);
  expect(isExactUserSpan('the red door', turns)).toBe(false);
});
```

- [ ] **Step 2: Run the test and verify the expected failure**

Run: `npm test -- --runInBand tests/agent-machine.test.ts`

Expected: FAIL because `src/agent/machine` and `src/agent/lines` do not exist.

- [ ] **Step 3: Add the domain types and minimal implementation**

Create `src/agent/types.ts`:

```ts
export type AgentStage = 'recall' | 'deepen' | 'findLine' | 'keep' | 'setAside' | 'end' | 'safetyStop';
export type Locale = 'en' | 'zh';
export type UserTurn = { role: 'user'; text: string };
export type AssistantTurn = { role: 'assistant'; text: string };
export type AgentTurn = UserTurn | AssistantTurn;

export type AgentSession = {
  id: string;
  stage: AgentStage;
  locale: Locale;
  entryPrompt: string;
  turns: AgentTurn[];
  userTurnCount: number;
  createdAt: number;
  touchedAt: number;
};

export type AgentReply = {
  sessionId: string;
  stage: AgentStage;
  message: string;
  candidateLines: string[];
  complete: boolean;
  keptLine?: string;
};
```

Create `src/agent/machine.ts`:

```ts
import type { AgentStage } from './types';

export function advanceStage(stage: AgentStage, userTurnCount: number): AgentStage {
  if (stage === 'recall') return 'deepen';
  if (stage === 'deepen' && userTurnCount >= 3) return 'findLine';
  return stage;
}
```

Create `src/agent/lines.ts`:

```ts
export function splitCandidateLines(text: string): string[] {
  return text.split(/(?<=[.!?。！？])\s*|\n+/u).map((line) => line.trim()).filter(Boolean);
}

export function extractCandidateLines(turns: string[], limit = 3): string[] {
  return turns.flatMap(splitCandidateLines).filter((line) => line.length >= 8).slice(0, limit);
}

export function isExactUserSpan(candidate: string, turns: string[]): boolean {
  const value = candidate.trim();
  return value.length > 0 && turns.some((turn) => turn.includes(value));
}
```

- [ ] **Step 4: Run tests and commit**

Run: `npm test -- --runInBand tests/agent-machine.test.ts`

Expected: PASS.

```bash
git add src/agent tests/agent-machine.test.ts
git commit -m "feat: add bounded aio agent domain"
```

### Task 3: Encode the persona, output validation, session store, and agent service

**Files:**
- Create: `src/agent/persona.ts`
- Create: `src/agent/validation.ts`
- Create: `server/model/ModelAdapter.ts`
- Create: `server/model/FakeModelAdapter.ts`
- Create: `server/SessionStore.ts`
- Create: `server/AgentService.ts`
- Create: `tests/agent-service.test.ts`

- [ ] **Step 1: Write failing orchestration tests**

Create `tests/agent-service.test.ts` with a fake clock and model. Assert that `start('en')` returns an authored prompt, three user turns reach `findLine`, candidate lines are exact spans, an invalid generated message uses the fallback, and `stop` removes the session:

```ts
import { AgentService } from '../server/AgentService';
import { FakeModelAdapter } from '../server/model/FakeModelAdapter';
import { SessionStore } from '../server/SessionStore';

test('service bounds the model and deletes completed sessions', async () => {
  const store = new SessionStore(3_600_000, () => 1000);
  const service = new AgentService(store, new FakeModelAdapter(['What color was the door?', 'What did your hands do?']));
  const started = service.start('en', 's1');
  expect(started.stage).toBe('recall');
  await service.reply('s1', 'I waited beside the blue door.');
  await service.reply('s1', 'The rain began and I stayed there.');
  const choosing = await service.reply('s1', 'My hands smelled like oranges.');
  expect(choosing.stage).toBe('findLine');
  expect(choosing.candidateLines.every((line) => choosing.message.includes(line) || line.length > 0)).toBe(true);
  const done = service.keep('s1', choosing.candidateLines[0]);
  expect(done.complete).toBe(true);
  expect(store.get('s1')).toBeUndefined();
});
```

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test -- --runInBand tests/agent-service.test.ts`

Expected: FAIL because service files do not exist.

- [ ] **Step 3: Implement the model contract and persona**

`ModelAdapter.generateFollowUp` receives locale, stage and turns, and returns `{ message: string }`. `persona.ts` exports the approved stall-keeper system prompt plus locale-specific fallbacks:

```ts
export const fallbackByLocale = {
  en: 'Stay with one small part. What was in front of you?',
  zh: '先停在一个小地方。那时你面前有什么？',
} as const;
```

The system prompt must contain the exact boundaries: stranger-distance, one question, no praise, no diagnosis, no oracle/guru/therapist role, no authored identity conclusion, and no invitation to return.

- [ ] **Step 4: Implement validation, store, and service**

Validation accepts one nonempty message under 240 characters with no more than one question mark and rejects forbidden phrases such as personality labels, diagnoses, fortune-telling, or claims to know the user. `SessionStore` exposes `create`, `get`, `set`, `delete`, and `sweep`; `get` deletes expired entries. `server/index.ts` calls `sweep` on an unref'd interval so abandoned sessions are removed without a later request. `AgentService` owns all transitions, applies the existing `containsSafetyConcern` check for both channels, and never accepts a stage from a model.

Use `crypto.randomUUID()` only in the server layer; tests may pass an explicit ID. On `keep`, verify `isExactUserSpan` before returning a final line and deleting the session.

- [ ] **Step 5: Run focused and full tests, then commit**

Run:

```bash
npm test -- --runInBand tests/agent-service.test.ts tests/agent-machine.test.ts
npm test -- --runInBand
```

Expected: all tests PASS.

```bash
git add src/agent server/model/ModelAdapter.ts server/model/FakeModelAdapter.ts server/SessionStore.ts server/AgentService.ts tests/agent-service.test.ts
git commit -m "feat: add disposable aio agent service"
```

### Task 4: Add the OpenAI Responses adapter

**Files:**
- Create: `server/model/OpenAIModelAdapter.ts`
- Create: `tests/openai-model.test.ts`

- [ ] **Step 1: Write the failing adapter contract test**

Mock `client.responses.parse` and verify that the adapter passes the persona as a system message, sends only the current disposable transcript, sets `store: false`, uses `text.format` via `zodTextFormat`, reads `output_parsed`, and throws a typed error for refusal or missing output.

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test -- --runInBand tests/openai-model.test.ts`

Expected: FAIL because the adapter does not exist.

- [ ] **Step 3: Implement the adapter**

Use this request shape:

```ts
const response = await client.responses.parse({
  model: process.env.OPENAI_MODEL ?? 'gpt-5.6-terra',
  store: false,
  input: [
    { role: 'system', content: personaPrompt },
    ...turns.map((turn) => ({ role: turn.role, content: turn.text })),
  ],
  text: { format: zodTextFormat(z.object({ message: z.string().min(1).max(240) }), 'aio_follow_up') },
});
```

Return only the parsed message. Do not use OpenAI conversation persistence or `previous_response_id`; the local in-memory session is the sole working context.

- [ ] **Step 4: Run tests and commit**

Run: `npm test -- --runInBand tests/openai-model.test.ts`

Expected: PASS.

```bash
git add server/model/OpenAIModelAdapter.ts tests/openai-model.test.ts
git commit -m "feat: connect aio agent to OpenAI Responses API"
```

### Task 5: Expose the HTTP API and Telegram adapter

**Files:**
- Create: `server/http.ts`
- Create: `server/telegram.ts`
- Create: `server/index.ts`
- Create: `tests/http.test.ts`
- Create: `tests/telegram.test.ts`

- [ ] **Step 1: Write failing HTTP tests**

Test these routes against a server on an ephemeral port:

```text
POST   /sessions                 { locale } -> AgentReply, 201
POST   /sessions/:id/messages    { text } -> AgentReply, 200
POST   /sessions/:id/keep        { line } -> AgentReply, 200
DELETE /sessions/:id             -> 204
GET    /health                   -> { ok: true }, 200
```

Also assert 400 for malformed JSON/input, 404 for missing session, 409 for an invalid stage, 413 for text over 4000 characters, and no conversation body in logged errors.

- [ ] **Step 2: Write failing Telegram mapping tests**

Inject a fake Telegram transport and assert:

- `/start` deletes any existing chat mapping, creates a session, and sends the entry prompt;
- normal text calls `reply`;
- `/stop` deletes the session and mapping;
- `findLine` responses include inline callback buttons containing only opaque indexes, never full private text;
- callback selection calls `keep` and removes the chat mapping; and
- polling errors are categorized without logging message bodies.

- [ ] **Step 3: Run tests and verify failure**

Run: `npm test -- --runInBand tests/http.test.ts tests/telegram.test.ts`

Expected: FAIL because server adapters do not exist.

- [ ] **Step 4: Implement Node HTTP and Telegram long polling**

Use built-in `node:http` and global `fetch`; do not add Express or a Telegram SDK. `server/index.ts` selects `FakeModelAdapter` only when `AIO_FAKE_MODEL=1`, otherwise requires `OPENAI_API_KEY`. Start Telegram polling only when `TELEGRAM_BOT_TOKEN` is set, so the App can be developed independently.

Telegram requests use `getUpdates` with an offset and 30-second timeout, then `sendMessage` with `reply_markup.inline_keyboard` for candidates. Store only `Map<string, sessionId>` where the key is `String(chat.id)`.

- [ ] **Step 5: Run tests, smoke-test fake mode, and commit**

Run:

```bash
npm test -- --runInBand tests/http.test.ts tests/telegram.test.ts
AIO_FAKE_MODEL=1 AIO_AGENT_PORT=8787 npm run agent
curl -s http://127.0.0.1:8787/health
```

Expected: tests PASS and health returns `{"ok":true}`. Stop the server with Ctrl-C.

```bash
git add server tests/http.test.ts tests/telegram.test.ts
git commit -m "feat: add aio HTTP and Telegram adapters"
```

### Task 6: Add the typed App client and agent-aware phone state

**Files:**
- Create: `src/app/agentClient.ts`
- Modify: `src/machine/phoneMachine.ts`
- Create: `tests/agent-client.test.ts`
- Create: `tests/phone-agent-machine.test.ts`

- [ ] **Step 1: Write failing client and machine tests**

The client test injects `fetch` and verifies the five HTTP operations, a 10-second abort timeout, `AgentUnavailableError` for network/5xx, and `AgentSessionError` for 404/409. The machine test verifies:

```ts
expect(phoneTransition('writing', { type: 'SUBMIT' })).toBe('waiting');
expect(phoneTransition('waiting', { type: 'FOLLOW_UP' })).toBe('writing');
expect(phoneTransition('waiting', { type: 'CANDIDATES' })).toBe('chooseLine');
expect(phoneTransition('waiting', { type: 'FAIL' })).toBe('writing');
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- --runInBand tests/agent-client.test.ts tests/phone-agent-machine.test.ts`

Expected: FAIL because the client and new events do not exist.

- [ ] **Step 3: Implement the client and update the machine**

Add `waiting` to `PhoneState`. Replace `TEXT_BLURRED` and `FOLLOW_UP_DONE` with explicit `SUBMIT`, `FOLLOW_UP`, `CANDIDATES`, and `FAIL` events. Keep arrive, outside-name, choose-line, hold-to-keep, card, back, close, and safety-stop behavior. Accidental input blur must not submit network text.

`agentClient.ts` reads `EXPO_PUBLIC_AIO_AGENT_URL`, trims one trailing slash, uses JSON requests, and accepts an optional injected `fetch` for tests.

- [ ] **Step 4: Run tests and commit**

Run: `npm test -- --runInBand tests/agent-client.test.ts tests/phone-agent-machine.test.ts tests/machines.test.ts`

Expected: PASS after updating the existing phone machine expectations to the explicit-submit flow; all paper tests remain unchanged.

```bash
git add src/app/agentClient.ts src/machine/phoneMachine.ts tests/agent-client.test.ts tests/phone-agent-machine.test.ts tests/machines.test.ts
git commit -m "feat: add app agent client and phone states"
```

### Task 7: Build cursor-safe bilingual voice input

**Files:**
- Create: `src/speech/transcriptEdit.ts`
- Create: `src/speech/useVoiceInput.ts`
- Create: `src/components/VoiceInputBar.tsx`
- Create: `tests/transcript-edit.test.ts`

- [ ] **Step 1: Write failing transcript-edit tests**

Cover insertion, range replacement, interim replacement without duplication, final commit, and empty restoration:

```ts
import { beginDictation, applyTranscript } from '../src/speech/transcriptEdit';

test('replaces only the active interim segment', () => {
  const base = beginDictation('Before after', { start: 7, end: 7 });
  const first = applyTranscript(base, 'soft rain');
  const second = applyTranscript(base, 'soft rain outside');
  expect(first.text).toBe('Before soft rainafter');
  expect(second.text).toBe('Before soft rain outsideafter');
});

test('replaces a selected range and restores on empty result', () => {
  const base = beginDictation('blue red door', { start: 5, end: 8 });
  expect(applyTranscript(base, 'green').text).toBe('blue green door');
  expect(applyTranscript(base, '').text).toBe('blue red door');
});
```

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test -- --runInBand tests/transcript-edit.test.ts`

Expected: FAIL because transcript-editing code does not exist.

- [ ] **Step 3: Implement pure editing functions**

```ts
export type Selection = { start: number; end: number };
export type DictationBase = { prefix: string; selected: string; suffix: string; original: string };

export function beginDictation(text: string, selection: Selection): DictationBase {
  return { prefix: text.slice(0, selection.start), selected: text.slice(selection.start, selection.end), suffix: text.slice(selection.end), original: text };
}

export function applyTranscript(base: DictationBase, transcript: string) {
  if (!transcript) return { text: base.original, selection: { start: base.prefix.length, end: base.prefix.length } };
  const text = `${base.prefix}${transcript}${base.suffix}`;
  const cursor = base.prefix.length + transcript.length;
  return { text, selection: { start: cursor, end: cursor } };
}
```

- [ ] **Step 4: Implement the recognition hook and control**

`useVoiceInput` must:

- request permissions on first start;
- check `isRecognitionAvailable()` and `supportsOnDeviceRecognition()`;
- start with `lang: 'en-US' | 'zh-CN'`, `interimResults: true`, `continuous: true`, `requiresOnDeviceRecognition: true`;
- use result events to replace only the active transcript segment;
- preserve the last interim result if a user-initiated Android stop emits an expected client error;
- expose `idle | requestingPermission | listening | finishing | error`;
- call `abort()` on unmount or navigation cleanup;
- never enable audio recording persistence; and
- call `onListeningChange` so App pauses/restores ambience.

`VoiceInputBar` exposes accessible English/中文 controls and a microphone/stop button. Disable locale selection while listening; render a plain status/error line without animated waveform.

- [ ] **Step 5: Run tests and commit**

Run: `npm test -- --runInBand tests/transcript-edit.test.ts && npx tsc --noEmit`

Expected: PASS.

```bash
git add src/speech src/components/VoiceInputBar.tsx tests/transcript-edit.test.ts
git commit -m "feat: add bilingual on-device voice input"
```

### Task 8: Integrate the agent and voice flow into `App.tsx`

**Files:**
- Modify: `App.tsx:1-47`
- Modify: `App.tsx:137-367`
- Modify: `App.tsx:420-590`
- Modify: `App.tsx:878-1055`
- Modify: `tests/static-safety.test.ts`

- [ ] **Step 1: Add a static regression test before editing App**

Extend `tests/static-safety.test.ts` to read `App.tsx` and assert:

```ts
expect(app).toContain('VoiceInputBar');
expect(app).toContain('createAgentClient');
expect(app).not.toContain('onBlur={blurWriting}');
expect(app).toContain('with paper and pen');
```

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test -- --runInBand tests/static-safety.test.ts`

Expected: FAIL because App has not been integrated.

- [ ] **Step 3: Add App-level agent state and lifecycle**

Import the client and `VoiceInputBar`. Add state for `agentSessionId`, `agentMessage`, `agentCandidates`, `agentError`, `agentLocale`, and `agentBusy`. On the existing `arrive` screen, add a quiet English/中文 selector and the disclosure: typed or transcribed phone-mode text goes to aio's online service, while raw voice stays on the device. Completing the existing hold then calls `client.start(agentLocale)` and places the returned entry prompt in `agentMessage`. Closing or switching away sends best-effort `DELETE` and clears all local agent state.

Do not change paper-mode state, prompt selection, sensors, TTS, camera, or card export.

- [ ] **Step 4: Replace blur submission with explicit send**

The main writing screen displays `agentMessage`, editable `writing`, `VoiceInputBar`, and one `send` control. `send` checks the existing local safety screen first, then posts the text. A `deepen` response clears only the submitted draft, updates the prompt, and returns to writing. A `findLine` response stores server candidate lines and opens choose-line. A request failure preserves `writing`, returns to writing, and exposes retry/end.

The language selector controls both speech locale and requested agent locale. It is locked after a session starts so the conversation does not unexpectedly change language.

- [ ] **Step 5: Use server candidates and preserve the existing card**

Replace `splitSentences(writing)` for phone mode with `agentCandidates`. Selecting a line calls `/keep`, stores `keptLine`, then enters `holdToKeep`; the existing hold action and Card remain the final physical gesture and visual artifact.

- [ ] **Step 6: Pause ambience during recognition**

Add `voiceListening` to the existing ambience effect condition. Do not alter paper-mode silence behavior. When recognition ends or errors, restore playback only when `musicEnabled` is still true.

- [ ] **Step 7: Run full automated verification and commit**

Run:

```bash
npm test -- --runInBand
npx tsc --noEmit
npx expo export --platform ios
```

Expected: all Jest suites pass, TypeScript exits 0, and iOS export completes.

```bash
git add App.tsx tests/static-safety.test.ts
git commit -m "feat: connect phone mode to aio agent"
```

### Task 9: Document, evaluate, and run the two-entry prototype

**Files:**
- Modify: `README.md`
- Modify: `DEMO_GUIDE.md`
- Create: `tests/persona-eval.test.ts`

- [ ] **Step 1: Add deterministic persona evaluation fixtures**

Create fixtures in English and Chinese that cover an ordinary memory, silence, long text, repeated skip, advice request, diagnosis request, prompt injection, and high-risk language. Use `FakeModelAdapter` outputs to verify that validation rejects praise, labels, mystical authority, multiple questions, and authored identity conclusions, then uses the approved locale fallback.

- [ ] **Step 2: Run persona evaluations**

Run: `npm test -- --runInBand tests/persona-eval.test.ts`

Expected: PASS with no live API calls.

- [ ] **Step 3: Update documentation**

README must explain:

- paper mode remains offline;
- phone and Telegram text pass through Agent Core and OpenAI;
- raw voice stays on-device;
- how to create a development build;
- how to configure `.env.local` without committing it;
- how to run fake mode, live agent mode, Expo, and Telegram; and
- which device behaviors remain unverified.

DEMO_GUIDE must add one App agent scene and one Telegram scene showing the same persona but independent sessions. It must not claim iMessage or WeChat is implemented.

- [ ] **Step 4: Verify no secrets or content logs**

Run:

```bash
git grep -nE 'sk-[A-Za-z0-9_-]{12,}|[0-9]{8,}:[A-Za-z0-9_-]{20,}' -- ':!package-lock.json'
git grep -nE 'console\.(log|error).*text|JSON\.stringify\(.*turns' server src
```

Expected: no secret match and no logging of user text or full turns.

- [ ] **Step 5: Run complete automated verification**

Run:

```bash
npm run check
npx expo export --platform ios
npx expo export --platform android
git diff --check
git status --short
```

Expected: tests, typecheck, and both exports pass; only intended documentation/evaluation changes remain.

- [ ] **Step 6: Run manual smoke tests with user-owned credentials**

In one terminal: `AIO_FAKE_MODEL=1 npm run agent`.

Verify App creates a session, submits a typed answer, reaches candidate selection, keeps a line, and paper mode still completes locally. Then configure `OPENAI_API_KEY` and `TELEGRAM_BOT_TOKEN` in `.env.local`, run `npm run agent`, and verify `/start`, three replies, line selection, and `/stop` in Telegram.

Build the development client and test `en-US` and `zh-CN` speech on a real iPhone, including permission denial and missing model. Record any Android hardware checks as verified or explicitly unverified.

- [ ] **Step 7: Commit final documentation and evaluation coverage**

```bash
git add README.md DEMO_GUIDE.md tests/persona-eval.test.ts
git commit -m "docs: add aio agent demo and privacy guidance"
```

## Completion gate

Before declaring completion, run the verification-before-completion skill and report exact commands and results. Do not call the Telegram prototype complete without a real bot token smoke test; if credentials are unavailable, report the adapter as automated-test verified and the live Telegram connection as pending. Do not call voice input device-verified without a real development build on an iPhone.
