import { AgentService } from '../server/AgentService';
import { FakeModelAdapter } from '../server/model/FakeModelAdapter';
import { SessionStore } from '../server/SessionStore';
import { entryPromptByLocale, fallbackByLocale } from '../src/agent/persona';

test('service bounds the model and deletes completed sessions', async () => {
  const store = new SessionStore(3_600_000, () => 1000);
  const model = new FakeModelAdapter([
    'What color was the door?',
    'What did your hands do?',
  ]);
  const service = new AgentService(store, model);

  const started = service.start('en', 's1');
  expect(started).toMatchObject({
    sessionId: 's1',
    stage: 'recall',
    message: entryPromptByLocale.en,
    complete: false,
  });

  await service.reply('s1', 'I waited beside the blue door.');
  await service.reply('s1', 'The rain began and I stayed there.');
  const choosing = await service.reply('s1', 'My hands smelled like oranges.');

  expect(choosing.stage).toBe('findLine');
  expect(choosing.candidateLines).toEqual(
    expect.arrayContaining([
      'I waited beside the blue door.',
      'The rain began and I stayed there.',
      'My hands smelled like oranges.',
    ]),
  );

  const done = service.keep('s1', choosing.candidateLines[0]);
  expect(done).toMatchObject({ complete: true, stage: 'end' });
  expect(store.get('s1')).toBeUndefined();
});

test('invalid model output falls back to an authored single question', async () => {
  const store = new SessionStore(3_600_000, () => 1000);
  const model = new FakeModelAdapter(['You are clearly an introvert. Why? What happened?']);
  const service = new AgentService(store, model);
  service.start('en', 's2');

  const reply = await service.reply('s2', 'I stayed near the market entrance.');

  expect(reply.message).toBe(fallbackByLocale.en);
});

test('safety language pauses the interview and removes the disposable session', async () => {
  const store = new SessionStore(3_600_000, () => 1000);
  const service = new AgentService(store, new FakeModelAdapter([]));
  service.start('zh', 's3');

  const reply = await service.reply('s3', 'I want to die tonight.');

  expect(reply.stage).toBe('safetyStop');
  expect(reply.complete).toBe(true);
  expect(store.get('s3')).toBeUndefined();
});

test('expired sessions are removed on read', () => {
  let now = 1000;
  const store = new SessionStore(100, () => now);
  const service = new AgentService(store, new FakeModelAdapter([]));
  service.start('en', 's4');

  now = 1101;
  expect(store.get('s4')).toBeUndefined();
});
