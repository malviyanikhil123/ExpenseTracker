import axios from 'axios';
import Constants from 'expo-constants';

import { useAuthStore } from '@/stores/auth-store';
import type { AuthResponse } from '@/types';
import { webStorage } from '@/lib/web-storage';
import * as SecureStore from 'expo-secure-store';

export const API_BASE_URL =
  Constants.expoConfig?.extra?.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL ??
  'http://10.0.2.2:15000/api';

export const api = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });

const storage = typeof window !== 'undefined' ? webStorage : SecureStore;

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string> | null = null;
api.interceptors.response.use(undefined, async (error) => {
  const original = error.config;
  if (error.response?.status !== 401 || original?._retry || original?.url?.includes('/auth/')) {
    throw error;
  }
  original._retry = true;
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) {
    await useAuthStore.getState().clearSession();
    throw error;
  }
  refreshing ??= axios
    .post<AuthResponse>(`${API_BASE_URL}/auth/refresh`, { refreshToken })
    .then(async ({ data }) => {
      const user = useAuthStore.getState().user;
      await useAuthStore.getState().setSession({ ...data, user: user! });
      return data.accessToken;
    })
    .finally(() => {
      refreshing = null;
    });
  original.headers.Authorization = `Bearer ${await refreshing}`;
  return api(original);
});
