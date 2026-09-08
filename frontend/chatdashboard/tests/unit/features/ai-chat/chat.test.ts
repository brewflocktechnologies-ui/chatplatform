import { describe, it, expect, vi } from 'vitest';

type AssistantFn = (ctx: { writer: MockWriter }) => void;

type MockToolChain = {
  sleep: ReturnType<typeof vi.fn>;
  output: ReturnType<typeof vi.fn>;
};

type MockWriter = {
  reasoning: ReturnType<typeof vi.fn>;
  tool: ReturnType<typeof vi.fn>;
  text: ReturnType<typeof vi.fn>;
};

const mocks = vi.hoisted(() => {
  const assistantFns: Array<(ctx: { writer: unknown }) => void> = [];
  const builder = {
    user: vi.fn(),
    sleep: vi.fn(),
    assistant: vi.fn(),
    get: vi.fn(() => ['initial-message']),
    transport: vi.fn(() => ({ kind: 'mock-transport' }))
  };
  builder.user.mockReturnValue(builder);
  builder.sleep.mockReturnValue(builder);
  builder.assistant.mockImplementation((fn: (ctx: { writer: unknown }) => void) => {
    assistantFns.push(fn);
    return builder;
  });
  const createChat = vi.fn(() => builder);
  return { assistantFns, builder, createChat };
});

vi.mock('@shadcn/helpers/ai-sdk', () => ({
  createChat: mocks.createChat
}));

import { demoChat, initialMessages, chatTransport } from '@/features/ai-chat/chat';

function makeWriter(): { writer: MockWriter; toolChain: MockToolChain } {
  const toolChain: MockToolChain = {
    sleep: vi.fn(),
    output: vi.fn()
  };
  toolChain.sleep.mockReturnValue(toolChain);
  toolChain.output.mockReturnValue(toolChain);
  const writer: MockWriter = {
    reasoning: vi.fn(),
    tool: vi.fn(() => toolChain),
    text: vi.fn()
  };
  return { writer, toolChain };
}

describe('demoChat script', () => {
  it('builds the scripted conversation through createChat', () => {
    expect(mocks.createChat).toHaveBeenCalledTimes(1);
    expect(demoChat).toBe(mocks.builder);
    expect(mocks.builder.user).toHaveBeenCalledTimes(2);
    expect(mocks.builder.user).toHaveBeenNthCalledWith(
      1,
      'How did revenue do last month, and what should I focus on next?'
    );
    expect(mocks.builder.user).toHaveBeenNthCalledWith(
      2,
      'Great. Where should I put my energy next?'
    );
    expect(mocks.builder.sleep).toHaveBeenCalledTimes(2);
    expect(mocks.builder.sleep).toHaveBeenCalledWith(500);
    expect(mocks.builder.assistant).toHaveBeenCalledTimes(2);
  });

  it('exposes the empty initial transcript from get(0)', () => {
    expect(mocks.builder.get).toHaveBeenCalledWith(0);
    expect(initialMessages).toEqual(['initial-message']);
  });

  it('creates the local transport with a 30ms delay', () => {
    expect(mocks.builder.transport).toHaveBeenCalledWith({ delayMs: 30 });
    expect(chatTransport).toEqual({ kind: 'mock-transport' });
  });

  it('first assistant turn streams reasoning, a revenue tool call and text', () => {
    const { writer, toolChain } = makeWriter();
    const firstTurn = mocks.assistantFns[0] as AssistantFn;
    firstTurn({ writer });

    expect(writer.reasoning).toHaveBeenCalledTimes(1);
    expect(writer.reasoning.mock.calls[0][0]).toContain('metrics tool');

    expect(writer.tool).toHaveBeenCalledWith('getRevenue', {
      title: 'Fetching revenue metrics',
      input: { period: 'last-month' }
    });
    expect(toolChain.sleep).toHaveBeenCalledWith(900);
    expect(toolChain.output).toHaveBeenCalledWith({
      period: 'last-month',
      revenue: 1250,
      changePct: 12.5,
      topDriver: 'returning customers'
    });

    expect(writer.text).toHaveBeenCalledTimes(2);
    expect(writer.text.mock.calls[0][0]).toContain('$1,250');
    expect(writer.text.mock.calls[1][0]).toContain('returning customers');
  });

  it('second assistant turn streams reasoning and a recommendation', () => {
    const { writer } = makeWriter();
    const secondTurn = mocks.assistantFns[1] as AssistantFn;
    secondTurn({ writer });

    expect(writer.reasoning).toHaveBeenCalledTimes(1);
    expect(writer.reasoning.mock.calls[0][0]).toContain('acquisition');
    expect(writer.tool).not.toHaveBeenCalled();
    expect(writer.text).toHaveBeenCalledTimes(1);
    expect(writer.text.mock.calls[0][0]).toContain('new-customer acquisition');
  });
});
