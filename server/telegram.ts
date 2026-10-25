import type { AgentService } from './AgentService';

type TelegramChat = { id: number | string };
type TelegramMessage = { chat: TelegramChat; text?: string };
type TelegramCallbackQuery = {
  id: string;
  data?: string;
  message?: { chat: TelegramChat };
};

export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
};

export interface TelegramTransport {
  getUpdates(offset: number, timeoutSeconds: number): Promise<TelegramUpdate[]>;
  sendMessage(chatId: string, text: string, options?: unknown): Promise<void>;
  answerCallbackQuery(id: string): Promise<void>;
}

export class TelegramBotApiTransport implements TelegramTransport {
  private readonly baseUrl: string;

  constructor(private readonly token: string) {
    this.baseUrl = `https://api.telegram.org/bot${token}`;
  }

  async getUpdates(offset: number, timeoutSeconds: number): Promise<TelegramUpdate[]> {
    const response = await fetch(`${this.baseUrl}/getUpdates`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ offset, timeout: timeoutSeconds, allowed_updates: ['message', 'callback_query'] }),
    });
    const body = await response.json() as { ok: boolean; result?: TelegramUpdate[] };
    if (!response.ok || !body.ok) throw new Error('telegram_get_updates_failed');
    return body.result ?? [];
  }

  async sendMessage(chatId: string, text: string, options?: unknown): Promise<void> {
    const response = await fetch(`${this.baseUrl}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, ...(options as object | undefined) }),
    });
    if (!response.ok) throw new Error('telegram_send_failed');
  }

  async answerCallbackQuery(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ callback_query_id: id }),
    });
    if (!response.ok) throw new Error('telegram_callback_failed');
  }
}

export class TelegramAdapter {
  private readonly sessionsByChat = new Map<string, string>();
  private offset = 0;

  constructor(
    private readonly service: AgentService,
    private readonly transport: TelegramTransport,
    private readonly onError: (category: string) => void = () => undefined,
  ) {}

  hasChat(chatId: string): boolean {
    return this.sessionsByChat.has(chatId);
  }

  async handleUpdate(update: TelegramUpdate): Promise<void> {
    const callback = update.callback_query;
    if (callback?.message) {
      await this.handleCallback(String(callback.message.chat.id), callback);
      return;
    }

    const message = update.message;
    if (!message?.text) return;
    const chatId = String(message.chat.id);
    if (message.text === '/start') {
      this.clearChat(chatId);
      const started = this.service.start('en');
      this.sessionsByChat.set(chatId, started.sessionId);
      await this.transport.sendMessage(chatId, started.message);
      return;
    }
    if (message.text === '/stop') {
      this.clearChat(chatId);
      await this.transport.sendMessage(chatId, 'The conversation has been set aside.');
      return;
    }

    const sessionId = this.sessionsByChat.get(chatId);
    if (!sessionId) {
      await this.transport.sendMessage(chatId, 'Send /start when you are ready.');
      return;
    }
    const reply = await this.service.reply(sessionId, message.text);
    if (reply.complete) this.sessionsByChat.delete(chatId);
    const options = reply.stage === 'findLine'
      ? {
          reply_markup: {
            inline_keyboard: reply.candidateLines.map((line, index) => [
              { text: line, callback_data: `keep:${index}` },
            ]),
          },
        }
      : undefined;
    await this.transport.sendMessage(chatId, reply.message, options);
  }

  async startPolling(signal?: AbortSignal): Promise<void> {
    while (!signal?.aborted) {
      try {
        const updates = await this.transport.getUpdates(this.offset, 30);
        for (const update of updates) {
          this.offset = Math.max(this.offset, update.update_id + 1);
          try {
            await this.handleUpdate(update);
          } catch {
            this.onError('telegram_update_failed');
          }
        }
      } catch {
        this.onError('telegram_poll_failed');
      }
    }
  }

  private async handleCallback(chatId: string, callback: TelegramCallbackQuery) {
    await this.transport.answerCallbackQuery(callback.id);
    const sessionId = this.sessionsByChat.get(chatId);
    const match = callback.data?.match(/^keep:(\d+)$/);
    if (!sessionId || !match) return;
    const candidates = this.service.candidateLines(sessionId);
    const line = candidates[Number(match[1])];
    if (!line) return;
    const reply = this.service.keep(sessionId, line);
    this.sessionsByChat.delete(chatId);
    await this.transport.sendMessage(chatId, `${reply.message}\n\n${line}`);
  }

  private clearChat(chatId: string) {
    const sessionId = this.sessionsByChat.get(chatId);
    if (sessionId) this.service.stop(sessionId);
    this.sessionsByChat.delete(chatId);
  }
}
