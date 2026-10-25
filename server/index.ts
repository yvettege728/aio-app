import { AgentService } from './AgentService';
import { createHttpServer } from './http';
import { FakeModelAdapter } from './model/FakeModelAdapter';
import type { ModelAdapter } from './model/ModelAdapter';
import { OpenAIModelAdapter } from './model/OpenAIModelAdapter';
import { SessionStore } from './SessionStore';
import { TelegramAdapter, TelegramBotApiTransport } from './telegram';

const ttlMs = Number(process.env.AIO_SESSION_TTL_MS ?? 3_600_000);
const store = new SessionStore(ttlMs);
const model: ModelAdapter = process.env.AIO_FAKE_MODEL === '1'
  ? new FakeModelAdapter([
      'What could you see there?',
      'What did your hands do next?',
    ])
  : createOpenAIAdapter();
const service = new AgentService(store, model);
const port = Number(process.env.AIO_AGENT_PORT ?? 8787);
const server = createHttpServer(service);

const sweepTimer = setInterval(() => store.sweep(), Math.min(ttlMs, 60_000));
sweepTimer.unref();

server.listen(port, '0.0.0.0', () => {
  console.info(`aio agent listening on port ${port}`);
});

const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
if (telegramToken) {
  const telegram = new TelegramAdapter(
    service,
    new TelegramBotApiTransport(telegramToken),
    (category) => console.error(category),
  );
  void telegram.startPolling();
}

function createOpenAIAdapter(): ModelAdapter {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required unless AIO_FAKE_MODEL=1.');
  }
  return new OpenAIModelAdapter();
}
