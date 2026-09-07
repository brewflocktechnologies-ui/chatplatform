import { describe, it, expect } from 'vitest';
import { initialConversations } from '@/features/chat/utils/data';

describe('chat data', () => {
  it('exports an empty initial conversations list', () => {
    expect(Array.isArray(initialConversations)).toBe(true);
    expect(initialConversations).toHaveLength(0);
  });
});
