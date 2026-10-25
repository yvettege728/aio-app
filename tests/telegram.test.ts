import { AgentService } from '../server/AgentService';
import { FakeModelAdapter } from '../server/model/FakeModelAdapter';
import { SessionStore } from '../server/SessionStore';
import { TelegramAdapter, type TelegramTransport } from '../server/telegram';

class FakeTelegramTransport implements TelegramTransport {
  sent: Array<{ chatId: string; text: string; options?: unknown }> = [];
  answered: string[] = [];

  async getUpdates() {
    return [];
  }

  async sendMessage(chatId: string, text: string, options?: unknown) {
    this.sent.push({ chatId, text, options });
  }

  async answerCallbackQuery(id: string) {
    this.answered.push(id);
  }
}

test('Telegram maps start, text, opaque line selection, and stop', async () => {
  const store = new SessionStore(3_600_000);
  const service = new AgentService(
    store,
    new FakeModelAdapter(['What color was it?', 'What was moving?']),
  );
  const transport = new FakeTelegramTransport();
  const adapter = new TelegramAdapter(service, transport);

  await adapter.handleUpdate({ update_id: 1, message: { chat: { id: 42 }, text: '/start' } });
  expect(adapter.hasChat('42')).toBe(true);
  expect(transport.sent.at(-1)?.text).toContain('?');

  await adapter.handleUpdate({ update_id: 2, message: { chat: { id: 42 }, text: 'Blue door.' } });
  await adapter.handleUpdate({ update_id: 3, message: { chat: { id: 42 }, text: 'Soft rain.' } });
  await adapter.handleUpdate({ update_id: 4, message: { chat: { id: 42 }, text: 'Oranges in my hands.' } });

  const options = transport.sent.at(-1)?.options as {
    reply_markup: { inline_keyboard: Array<Array<{ text: string; callback_data: string }>> };
  };
  const buttons = options.reply_markup.inline_keyboard.flat();
  expect(buttons.length).toBeGreaterThan(0);
  expect(buttons.every((button) => /^keep:\d+$/.test(button.callback_data))).toBe(true);
  expect(buttons.some((button) => button.callback_data.includes('Blue door'))).toBe(false);

  await adapter.handleUpdate({
    update_id: 5,
    callback_query: {
      id: 'callback-1',
      data: buttons[0].callback_data,
      message: { chat: { id: 42 } },
    },
  });
  expect(adapter.hasChat('42')).toBe(false);
  expect(transport.answered).toContain('callback-1');

  await adapter.handleUpdate({ update_id: 6, message: { chat: { id: 42 }, text: '/start' } });
  await adapter.handleUpdate({ update_id: 7, message: { chat: { id: 42 }, text: '/stop' } });
  expect(adapter.hasChat('42')).toBe(false);
});
