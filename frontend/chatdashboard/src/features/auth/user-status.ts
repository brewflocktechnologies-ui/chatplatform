import { create } from 'zustand';

interface UserStatusState {
  acceptChats: boolean;
  toggleAcceptChats: () => void;
  setAcceptChats: (acceptChats: boolean) => void;
}

export const useUserStatus = create<UserStatusState>()((set) => ({
  acceptChats: true,
  toggleAcceptChats: () => set((state) => ({ acceptChats: !state.acceptChats })),
  setAcceptChats: (acceptChats) => set({ acceptChats })
}));
