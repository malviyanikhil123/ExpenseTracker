import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { webStorage } from '@/lib/web-storage';
import type { AuthResponse, User } from '@/types';

const ACCESS_TOKEN = 'expense_access_token';
const REFRESH_TOKEN = 'expense_refresh_token';
const USER = 'expense_user';

// Use localStorage on web, SecureStore on mobile
const storage = typeof window !== 'undefined' ? webStorage : SecureStore;

type AuthState = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setSession: (session: AuthResponse) => Promise<void>;
  clearSession: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  hydrated: false,
  hydrate: async () => {
    const [accessToken, refreshToken, rawUser] = await Promise.all([
      storage.getItemAsync(ACCESS_TOKEN),
      storage.getItemAsync(REFRESH_TOKEN),
      storage.getItemAsync(USER),
    ]);
    set({ accessToken, refreshToken, user: rawUser ? JSON.parse(rawUser) : null, hydrated: true });
  },
  setSession: async (session) => {
    await Promise.all([
      storage.setItemAsync(ACCESS_TOKEN, session.accessToken),
      storage.setItemAsync(REFRESH_TOKEN, session.refreshToken),
      storage.setItemAsync(USER, JSON.stringify(session.user)),
    ]);
    set({ user: session.user, accessToken: session.accessToken, refreshToken: session.refreshToken });
  },
  clearSession: async () => {
    await Promise.all([
      storage.deleteItemAsync(ACCESS_TOKEN),
      storage.deleteItemAsync(REFRESH_TOKEN),
      storage.deleteItemAsync(USER),
    ]);
    set({ user: null, accessToken: null, refreshToken: null });
  },
}));

