import { describe, expect, it, beforeEach } from 'vitest';
import { useUserStatus } from '@/features/auth/user-status';

describe('useUserStatus', () => {
  beforeEach(() => {
    useUserStatus.setState({ acceptChats: true });
  });

  it('accepts chats by default', () => {
    expect(useUserStatus.getState().acceptChats).toBe(true);
  });

  it('toggleAcceptChats flips the value', () => {
    useUserStatus.getState().toggleAcceptChats();
    expect(useUserStatus.getState().acceptChats).toBe(false);

    useUserStatus.getState().toggleAcceptChats();
    expect(useUserStatus.getState().acceptChats).toBe(true);
  });

  it('setAcceptChats sets an explicit value', () => {
    useUserStatus.getState().setAcceptChats(false);
    expect(useUserStatus.getState().acceptChats).toBe(false);

    useUserStatus.getState().setAcceptChats(true);
    expect(useUserStatus.getState().acceptChats).toBe(true);
  });
});