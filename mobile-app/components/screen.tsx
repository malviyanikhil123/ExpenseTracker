import type { PropsWithChildren } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette } from '@/constants/app-theme';

export function Screen({
  children,
  scroll = true,
  style,
  refreshing,
  onRefresh,
  fixed,
}: PropsWithChildren<{
  scroll?: boolean;
  style?: ViewStyle;
  refreshing?: boolean;
  onRefresh?: () => void;
  fixed?: React.ReactNode;
}>) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.scroll, styles.contentScroll, style]}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing ?? false}
                onRefresh={onRefresh}
                tintColor={palette.primary}
                colors={[palette.primary]}
                progressBackgroundColor={palette.surface}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.contentFixed, style]}>{children}</View>
      )}
      {fixed}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  scroll: { flexGrow: 1 },
  contentScroll: { paddingHorizontal: 20, paddingBottom: 130 },
  contentFixed: { flex: 1, paddingHorizontal: 20, paddingBottom: 20 },
});