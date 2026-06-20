import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState, useEffect } from "react";
import { Pressable, StyleSheet, View, Linking, Platform, ScrollView } from "react-native";
import { useCustomAlert } from "@/components/custom-dialogs";
import { Surface, Text } from "react-native-paper";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeInDown,
} from "react-native-reanimated";

import { useAccounts, useBudget, useDeleteTransaction, useSummary, useTransactions, useDebts, useMarkReminderSent } from "@/api/queries";
import {
  EmptyState,
  LoadingState,
  PageHeader,
  SummaryCards,
  SwipeableTransactionRow,
  FloatingFAB,
} from "@/components/finance-ui";
import { Screen } from "@/components/screen";
import { palette } from "@/constants/app-theme";
import { currency, dayKey, monthLabel } from "@/lib/format";
import type { Transaction, Debt } from "@/types";

function isReminderDue(debt: Debt): boolean {
  if (debt.status === "repaid" || !debt.reminderInterval || debt.reminderInterval === "none" || !debt.phoneNumber) {
    return false;
  }
  if (!debt.lastReminderSentAt) {
    return true;
  }
  const lastSent = new Date(debt.lastReminderSentAt).getTime();
  const now = Date.now();
  const diffMs = now - lastSent;
  
  if (debt.reminderInterval === "daily") {
    return diffMs >= 24 * 60 * 60 * 1000;
  }
  if (debt.reminderInterval === "weekly") {
    return diffMs >= 7 * 24 * 60 * 60 * 1000;
  }
  if (debt.reminderInterval === "monthly") {
    return diffMs >= 30 * 24 * 60 * 60 * 1000;
  }
  return false;
}

export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const summary = useSummary();
  const budget = useBudget();
  const transactions = useTransactions();
  const deleteTransaction = useDeleteTransaction();
  const accounts = useAccounts();
  const debts = useDebts();
  const markReminderSentMut = useMarkReminderSent();
  const { showAlert, AlertComponent } = useCustomAlert();

  // Progress Bar Animation
  const progressShared = useSharedValue(0);

  // Find due reminders
  const dueDebts = useMemo(() => {
    return (debts.data ?? []).filter(isReminderDue);
  }, [debts.data]);

  const sendReminder = async (debt: Debt, method: "whatsapp" | "sms", text: string) => {
    let url = "";
    const phoneClean = debt.phoneNumber?.replace(/[^0-9+]/g, "") || "";
    
    if (method === "whatsapp") {
      url = `whatsapp://send?phone=${phoneClean}&text=${encodeURIComponent(text)}`;
    } else {
      url = `sms:${phoneClean}${Platform.OS === "ios" ? "&" : "?"}body=${encodeURIComponent(text)}`;
    }
    
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        await markReminderSentMut.mutateAsync(debt.id);
      } else {
        if (method === "whatsapp") {
          const webUrl = `https://wa.me/${phoneClean}?text=${encodeURIComponent(text)}`;
          await Linking.openURL(webUrl);
          await markReminderSentMut.mutateAsync(debt.id);
        } else {
          showAlert("Error", "Could not open messaging app");
        }
      }
    } catch (err) {
      showAlert("Error", "Could not send reminder");
    }
  };

  const handleSendReminderClick = (debt: Debt) => {
    const formattedDate = new Date(debt.transactionDate).toLocaleDateString("en-IN");
    let text = debt.customMessage || "";
    if (!text) {
      if (debt.type === "lend") {
        text = `Hi {Name}, just a reminder about the outstanding payment of ₹{Remaining} lent to you on {Date}.`;
      } else {
        text = `Hi {Name}, regarding the ₹{Remaining} I borrowed from you on {Date}, I will repay it soon.`;
      }
    }
    
    text = text
      .replace(/{Name}/g, debt.personName)
      .replace(/{Total}/g, String(debt.amount))
      .replace(/{Remaining}/g, String(debt.remainingAmount))
      .replace(/{Date}/g, formattedDate);

    showAlert(
      "Send Reminder",
      `Send reminder message to ${debt.personName} (${debt.phoneNumber})?\n\n"${text}"`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "WhatsApp", onPress: () => sendReminder(debt, "whatsapp", text) },
        { text: "SMS", onPress: () => sendReminder(debt, "sms", text) }
      ]
    );
  };

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  }, [queryClient]);

  useFocusEffect(
    useCallback(() => {
      void queryClient.invalidateQueries();
    }, [queryClient])
  );

  const [activeFilter, setActiveFilter] = useState<"all" | "expense" | "income" | "lent" | "borrowed">("expense");

  const items = transactions.data?.items;
  const filteredItems = useMemo(() => {
    return (items ?? []).filter((item) => {
      if (activeFilter === "all") return true;
      if (activeFilter === "expense") {
        return item.type === "expense" && !item.isDebt && !item.isRepayment;
      }
      if (activeFilter === "income") {
        return item.type === "income" && !item.isDebt && !item.isRepayment;
      }
      if (activeFilter === "lent") {
        return (
          (item.isDebt && item.category?.name === "Lend") ||
          (item.isRepayment && item.category?.name === "Lend Repayment")
        );
      }
      if (activeFilter === "borrowed") {
        return (
          (item.isDebt && item.category?.name === "Borrow") ||
          (item.isRepayment && item.category?.name === "Borrow Repayment")
        );
      }
      return true;
    });
  }, [items, activeFilter]);

  const grouped = useMemo(() => {
    return filteredItems.reduce<Record<string, Transaction[]>>(
      (result, item) => {
        const key = dayKey(item.transactionDate);
        (result[key] ??= []).push(item);
        return result;
      },
      {},
    );
  }, [filteredItems]);

  const totalBalance = useMemo(() => {
    return (accounts.data ?? []).reduce((sum, acc) => sum + Number(acc.balance), 0);
  }, [accounts.data]);

  const budgetProgress = useMemo(() => {
    return budget.data?.budget
      ? Math.min(budget.data.spent / budget.data.budget, 1)
      : 0;
  }, [budget.data]);

  useEffect(() => {
    progressShared.value = withTiming(budgetProgress, { duration: 800 });
  }, [budgetProgress, progressShared]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressShared.value * 100}%`,
  }));

  const handleEdit = (item: Transaction) => {
    router.push({
      pathname: "/add-transaction",
      params: {
        editId: item.id,
        editType: item.type,
        editAmount: String(item.amount),
        editTitle: item.title,
        editNote: item.note ?? "",
        editAccountId: item.accountId ?? item.fromAccountId ?? "",
        editToAccountId: item.toAccountId ?? "",
        editCategoryId: item.categoryId ?? "",
        editDate: item.transactionDate,
      },
    });
  };

  const handleDelete = (item: Transaction) => {
    showAlert(
      "Delete Transaction",
      `Are you sure you want to delete "${item.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteTransaction.mutate(item.id),
        },
      ],
    );
  };

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={onRefresh}
      fixed={<FloatingFAB onPress={() => router.push("/add-transaction")} />}
    >
      <View style={styles.top}>
        <PageHeader
          title={monthLabel()}
          subtitle="Your monthly money overview"
        />
        <Pressable
          onPress={() => router.push("/(tabs)/profile")}
          style={({ pressed }) => [
            styles.profileButton,
            pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] }
          ]}
        >
          <MaterialCommunityIcons
            name="account-circle"
            size={38}
            color={palette.primary}
          />
        </Pressable>
      </View>
      <SummaryCards data={summary.data} totalBalance={totalBalance} />

      {/* Due Reminders Widget */}
      {dueDebts.length > 0 && (
        <Reanimated.View entering={FadeInDown.delay(100).duration(400)}>
          <Surface style={styles.remindersCard} elevation={0}>
            <View style={styles.remindersHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <MaterialCommunityIcons name="clock-alert-outline" size={20} color={palette.warning} />
                <Text variant="titleMedium" style={styles.bold}>Due Reminders</Text>
              </View>
              <Text style={styles.reminderCount}>{dueDebts.length} pending</Text>
            </View>
            <View style={styles.remindersList}>
              {dueDebts.map((debt) => (
                <View key={debt.id} style={styles.reminderItem}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.bold, { color: palette.text, fontSize: 14 }]}>{debt.personName}</Text>
                    <Text style={styles.mutedSmall}>
                      {debt.type === "lend" ? "You Lent" : "You Borrowed"} • {currency(debt.remainingAmount)} remaining
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleSendReminderClick(debt)}
                    style={({ pressed }) => [
                      styles.customSendButton,
                      pressed && { opacity: 0.8 }
                    ]}
                  >
                    <MaterialCommunityIcons name="send" size={12} color={palette.primary} />
                    <Text style={styles.customSendButtonText}>Send</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </Surface>
        </Reanimated.View>
      )}

      {/* Monthly Budget Widget */}
      <Reanimated.View entering={FadeInDown.delay(200).duration(400)}>
        <Pressable
          onPress={() => router.push("/reports")}
          style={({ pressed }) => pressed && { opacity: 0.95, transform: [{ scale: 0.99 }] }}
        >
          <Surface style={styles.budget} elevation={0}>
            <View style={styles.row}>
              <View>
                <Text variant="titleMedium" style={[styles.bold, { color: palette.text }]}>Monthly budget</Text>
                <Text style={styles.muted}>
                  {currency(budget.data?.spent ?? 0)} of{" "}
                  {currency(budget.data?.budget ?? 0)}
                </Text>
              </View>
              <Text style={{ color: palette.warning, fontWeight: '700' }}>
                {currency(budget.data?.remaining ?? 0)} left
              </Text>
            </View>
            <View style={styles.track}>
              <Reanimated.View style={[styles.fill, progressStyle]} />
            </View>
          </Surface>
        </Pressable>
      </Reanimated.View>

      {/* Transaction Filters */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {([
            { id: "all", label: "All" },
            { id: "expense", label: "Expenses" },
            { id: "income", label: "Income" },
            { id: "lent", label: "Lent" },
            { id: "borrowed", label: "Borrowed" },
          ] as const).map((filter) => {
            const isActive = activeFilter === filter.id;
            return (
              <Pressable
                key={filter.id}
                onPress={() => setActiveFilter(filter.id)}
                style={({ pressed }) => [
                  styles.filterButton,
                  isActive && styles.filterButtonActive,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Text
                  style={[
                    styles.filterLabel,
                    isActive && styles.filterLabelActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.sectionTitle}>
        <Text variant="titleLarge" style={[styles.bold, { color: palette.text }]}>
          Transactions
        </Text>
        <Text style={styles.muted}>
          {filteredItems.length} found
        </Text>
      </View>
      {transactions.isLoading ? (
        <LoadingState />
      ) : Object.keys(grouped).length === 0 ? (
        <EmptyState text="No transactions yet. Add your first one." />
      ) : (
        Object.entries(grouped).map(([date, items], idx) => (
          <Reanimated.View
            key={date}
            entering={FadeInDown.delay(300 + idx * 50).duration(400)}
            style={styles.group}
          >
            <Text style={styles.date}>
              {new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                weekday: "short",
              })}
            </Text>
            {items.map((item) => (
              <SwipeableTransactionRow
                key={item.id}
                item={item}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </Reanimated.View>
        ))
      )}
      <AlertComponent />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  profileButton: {
    padding: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  budget: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: palette.card,
    gap: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  muted: { color: palette.muted },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.surface,
    overflow: "hidden",
  },
  fill: { height: 8, borderRadius: 4, backgroundColor: palette.primary },
  sectionTitle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 28,
    marginBottom: 8,
  },
  bold: { fontWeight: "700" },
  group: { marginBottom: 12 },
  date: {
    color: palette.muted,
    marginTop: 12,
    marginBottom: 8,
    fontWeight: "600",
    fontSize: 13,
  },
  remindersCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: palette.card,
    gap: 10,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  remindersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reminderCount: {
    fontSize: 12,
    color: palette.warning,
    fontWeight: "600",
  },
  remindersList: {
    gap: 8,
  },
  reminderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: palette.surface,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
  },
  mutedSmall: {
    color: palette.muted,
    fontSize: 11,
  },
  customSendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: palette.primary,
    minWidth: 75,
    height: 32,
  },
  customSendButtonText: {
    color: palette.primary,
    fontSize: 12,
    fontWeight: "700",
  },
  filterContainer: {
    marginTop: 20,
    marginBottom: 8,
  },
  filterScroll: {
    gap: 8,
    paddingRight: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: palette.card,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    minWidth: 70,
    alignItems: "center",
  },
  filterButtonActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  filterLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  filterLabelActive: {
    color: palette.textDark,
  },
});
