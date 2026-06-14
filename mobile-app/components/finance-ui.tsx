import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Surface, Text } from 'react-native-paper';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import { palette } from '@/constants/app-theme';
import { getCategoryColor } from '@/src/theme/colors';
import { currency } from '@/lib/format';
import type { Summary, Transaction } from '@/types';

// ... (skipping PageHeader and SummaryCards since they are not modified here) ...

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.header}>
      <Text variant="headlineMedium" style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.muted}>{subtitle}</Text> : null}
    </View>
  );
}

export function SummaryCards({ data, totalBalance }: { data?: Summary; totalBalance?: number }) {
  const balanceValue = totalBalance !== undefined ? totalBalance : (data?.balance ?? 0);
  const balanceLabel = totalBalance !== undefined ? "Total Balance" : "Balance";
  return (
    <View style={styles.summaryRow}>
      <SummaryCard label="Expenses" value={data?.expense ?? 0} color={palette.expense} icon="arrow-up" />
      <SummaryCard label="Income" value={data?.income ?? 0} color={palette.income} icon="arrow-down" />
      <SummaryCard label={balanceLabel} value={balanceValue} color={palette.primary} icon="scale-balance" />
    </View>
  );
}

function SummaryCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <Surface style={styles.summaryCard} elevation={0}>
      <MaterialCommunityIcons name={icon as never} color={color} size={20} />
      <Text style={[styles.mutedSmall, { color: palette.muted }]}>{label}</Text>
      <Text variant="titleSmall" style={{ color }}>{currency(value)}</Text>
    </Surface>
  );
}

export function TransactionRow({ item }: { item: Transaction }) {
  const income = item.type === 'income';
  const categoryColor = getCategoryColor(item.categoryId || item.category?.name);
  const amountColor = income ? palette.income : palette.expense;
  const iconName = item.category?.icon || (income ? 'arrow-down' : 'arrow-up');
  
  return (
    <View style={styles.transaction}>
      <View style={[styles.iconCircle, { backgroundColor: `${categoryColor}15` }]}>
        <MaterialCommunityIcons name={iconName as never} color={categoryColor} size={22} />
      </View>
      <View style={styles.grow}>
        <Text variant="titleMedium" style={{ color: palette.text }}>{item.title}</Text>
        <Text style={[styles.mutedSmall, { color: palette.muted }]}>
          {new Date(item.transactionDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      <Text variant="titleMedium" style={{ color: amountColor, fontWeight: '700' }}>
        {income ? '+' : '-'}{currency(item.amount)}
      </Text>
    </View>
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
  return <ActivityIndicator style={{ marginTop: 40 }} />;
}

export function EmptyState({ text }: { text: string }) {
  return <Text style={[styles.muted, { textAlign: 'center', marginTop: 40 }]}>{text}</Text>;
}

const styles = StyleSheet.create({
  header: { marginTop: 12, marginBottom: 22, gap: 4 },
  title: { color: palette.text, fontWeight: '700' },
  muted: { color: palette.muted },
  mutedSmall: { color: palette.muted, fontSize: 12 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  summaryCard: { flex: 1, padding: 12, borderRadius: 16, backgroundColor: palette.surface, gap: 7 },
  transaction: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1 },
});

const swipeStyles = StyleSheet.create({
  foreground: {
    backgroundColor: palette.background,
  },
  actionsContainer: {
    width: 140,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  actionPressable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  editButton: {
    backgroundColor: palette.primary,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  deleteButton: {
    backgroundColor: palette.expense,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  actionText: {
    color: palette.text,
    fontSize: 11,
    fontWeight: '600',
  },
});
