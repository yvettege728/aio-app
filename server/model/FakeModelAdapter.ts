import type { ModelAdapter, FollowUpRequest, FollowUpResult } from './ModelAdapter';

export class FakeModelAdapter implements ModelAdapter {
  readonly requests: FollowUpRequest[] = [];
  private index = 0;

  constructor(private readonly messages: string[]) {}

  async generateFollowUp(request: FollowUpRequest): Promise<FollowUpResult> {
    this.requests.push(request);
    const message = this.messages[this.index] ?? '';
    this.index += 1;
    return { message };
  }
}
