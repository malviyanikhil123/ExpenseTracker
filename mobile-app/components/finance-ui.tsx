import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRef, useEffect } from 'react';
import { Pressable, StyleSheet, View, Platform } from 'react-native';
import { Surface, Text } from 'react-native-paper';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  FadeInDown,
} from 'react-native-reanimated';

import { palette } from '@/constants/app-theme';
import { getCategoryColor } from '@/src/theme/colors';
import { currency } from '@/lib/format';
import type { Transaction, Summary } from '@/types';

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Reanimated.View entering={FadeInDown.duration(400).springify()} style={styles.header}>
      <Text variant="headlineMedium" style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </Reanimated.View>
  );
}

export function SummaryCards({ data, totalBalance }: { data?: Summary; totalBalance?: number }) {
  const balanceValue = totalBalance !== undefined ? totalBalance : (data?.balance ?? 0);
  const balanceLabel = totalBalance !== undefined ? 'Total Balance' : 'Balance';
  return (
    <View style={styles.summaryRow}>
      <SummaryCard label="Expenses" value={data?.expense ?? 0} color={palette.expense} icon="arrow-up-circle-outline" index={0} />
      <SummaryCard label="Income" value={data?.income ?? 0} color={palette.income} icon="arrow-down-circle-outline" index={1} />
      <SummaryCard label={balanceLabel} value={balanceValue} color={palette.primary} icon="scale-balance" index={2} />
    </View>
  );
}

function SummaryCard({ label, value, color, icon, index }: { label: string; value: number; color: string; icon: string; index: number }) {
  return (
    <Reanimated.View
      entering={FadeInDown.delay(100 * index).duration(400).springify()}
      style={[styles.summaryCard, { backgroundColor: palette.card }]}
    >
      <View style={[styles.summaryIconCircle, { backgroundColor: `${color}15` }]}>
        <MaterialCommunityIcons name={icon as never} color={color} size={20} />
      </View>
      <View style={{ gap: 2 }}>
        <Text style={styles.mutedSmall}>{label}</Text>
        <Text variant="titleSmall" style={{ color: palette.text, fontWeight: '700' }}>{currency(value)}</Text>
      </View>
    </Reanimated.View>
  );
}

export function TransactionRow({ item, onPress }: { item: Transaction; onPress?: () => void }) {
  const income = item.type === 'income';
  const categoryColor = getCategoryColor(item.categoryId || item.category?.name);
  const amountColor = income ? palette.income : palette.expense;
  const iconName = item.category?.icon || (income ? 'arrow-down' : 'arrow-up');

  const isRepaid = item.isDebt && item.status === 'repaid';
  const displayColor = isRepaid ? palette.muted : amountColor;

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const content = (
    <>
      <View style={[styles.iconCircle, { backgroundColor: `${categoryColor}15` }]}>
        <MaterialCommunityIcons name={iconName as never} color={categoryColor} size={22} />
      </View>
      <View style={styles.grow}>
        <Text variant="titleMedium" style={[styles.bold, isRepaid && styles.strikethrough, { color: palette.text }]}>
          {item.title}
        </Text>
        <Text style={styles.mutedSmall}>
          {new Date(item.transactionDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          {item.isDebt ? (
            isRepaid ? ' • Repaid' : ` • ${currency(Number(item.remainingAmount))} remaining of ${currency(Number(item.amount))}`
          ) : null}
        </Text>
      </View>
      <Text variant="titleMedium" style={{ color: displayColor, fontWeight: '700' }}>
        {income ? '+' : '-'}{currency(item.isDebt ? Number(item.remainingAmount ?? item.amount) : Number(item.amount))}
      </Text>
    </>
  );

  if (!onPress) {
    return (
      <View style={[styles.transaction, { marginBottom: 8 }]}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={{ marginBottom: 8 }}
    >
      <Reanimated.View style={[styles.transaction, animatedStyle]}>
        {content}
      </Reanimated.View>
    </Pressable>
  );
}

type SwipeableTransactionRowProps = {
  item: Transaction;
  onEdit?: (item: Transaction) => void;
  onDelete?: (item: Transaction) => void;
};

function RightAction({
  drag,
  onEdit,
  onDelete,
}: {
  drag: SharedValue<number>;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const animStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: drag.value + 140 }],
    };
  });

  return (
    <Reanimated.View style={[swipeStyles.actionsContainer, animStyle]}>
      <Pressable
        onPress={onEdit}
        style={[swipeStyles.actionPressable, swipeStyles.editButton]}
      >
        <MaterialCommunityIcons name="pencil-outline" color={palette.text} size={20} />
        <Text style={swipeStyles.actionText}>Edit</Text>
      </Pressable>

      <Pressable
        onPress={onDelete}
        style={[swipeStyles.actionPressable, swipeStyles.deleteButton]}
      >
        <MaterialCommunityIcons name="trash-can-outline" color={palette.text} size={20} />
        <Text style={swipeStyles.actionText}>Delete</Text>
      </Pressable>
    </Reanimated.View>
  );
}

export function SwipeableTransactionRow({ item, onEdit, onDelete }: SwipeableTransactionRowProps) {
  const swipeableRef = useRef<any>(null);

  if (item.isDebt || item.isRepayment) {
    return (
      <View style={swipeStyles.foreground}>
        <TransactionRow item={item} />
      </View>
    );
  }

  const handleEdit = () => {
    swipeableRef.current?.close();
    onEdit?.(item);
  };

  const handleDelete = () => {
    swipeableRef.current?.close();
    onDelete?.(item);
  };

  const renderRightActions = (
    _progress: SharedValue<number>,
    drag: SharedValue<number>,
  ) => {
    return (
      <RightAction drag={drag} onEdit={handleEdit} onDelete={handleDelete} />
    );
  };

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}
      friction={2}
    >
      <View style={swipeStyles.foreground}>
        <TransactionRow item={item} />
      </View>
    </ReanimatedSwipeable>
  );
}

export function LoadingState() {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800 }),
        withTiming(0.3, { duration: 800 })
      ),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={{ gap: 12, marginTop: 12 }}>
      {[1, 2, 3].map((i) => (
        <Reanimated.View key={i} style={[styles.skeletonRow, animatedStyle]}>
          <View style={styles.skeletonCircle} />
          <View style={{ flex: 1, gap: 8 }}>
            <View style={styles.skeletonLineLong} />
            <View style={styles.skeletonLineShort} />
          </View>
          <View style={styles.skeletonAmount} />
        </Reanimated.View>
      ))}
    </View>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <Reanimated.View entering={FadeInDown.duration(500)} style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <MaterialCommunityIcons name="wallet-outline" size={44} color={palette.muted} />
      </View>
      <Text variant="bodyLarge" style={styles.emptyText}>{text}</Text>
    </Reanimated.View>
  );
}

export function FloatingFAB({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.fabContainer}
    >
      <Reanimated.View style={[styles.fab, animatedStyle]}>
        <MaterialCommunityIcons name="plus" size={30} color="#FFF" />
      </Reanimated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: 12, marginBottom: 22, gap: 4 },
  title: { color: palette.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: palette.muted, fontSize: 14 },
  mutedSmall: { color: palette.muted, fontSize: 12 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  summaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  summaryIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transaction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    backgroundColor: palette.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1 },
  strikethrough: { textDecorationLine: 'line-through', color: palette.muted },
  bold: { fontWeight: '700' },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: palette.card,
    borderRadius: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  skeletonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  skeletonLineLong: {
    width: '60%',
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  skeletonLineShort: {
    width: '35%',
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  skeletonAmount: {
    width: 50,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  emptyText: {
    color: palette.muted,
    textAlign: 'center',
    maxWidth: '80%',
    lineHeight: 20,
    fontSize: 14,
  },
  fabContainer: {
    position: "absolute",
    right: 20,
    bottom: Platform.OS === "ios" ? 136 : 116,
    zIndex: 99,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});

const swipeStyles = StyleSheet.create({
  foreground: {
    backgroundColor: palette.background,
  },
  actionsContainer: {
    width: 140,
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 8,
  },
  actionPressable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  editButton: {
    backgroundColor: palette.primary,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  deleteButton: {
    backgroundColor: palette.expense,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
  },
  actionText: {
    color: palette.text,
    fontSize: 11,
    fontWeight: '600',
  },
});
