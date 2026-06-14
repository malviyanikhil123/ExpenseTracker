import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import 'react-native-reanimated';

import { appTheme } from '@/constants/app-theme';
import { useAuthStore } from '@/stores/auth-store';

export default function RootLayout() {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 0, gcTime: 0, retry: 1, refetchOnWindowFocus: true, refetchOnMount: 'always' } } }));
  const { accessToken, hydrated, hydrate } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => { void hydrate(); }, [hydrate]);
  useEffect(() => {
    if (!hydrated) return;
    const inAuth = segments[0] === '(auth)';
    if (!accessToken && !inAuth) router.replace('/(auth)/login');
    if (accessToken && inAuth) router.replace('/(tabs)');
  }, [accessToken, hydrated, router, segments]);

  if (!hydrated) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={client}>
        <PaperProvider theme={appTheme}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: appTheme.colors.background } }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="add-transaction" options={{ presentation: 'modal' }} />
          </Stack>
          <StatusBar style="light" />
        </PaperProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

