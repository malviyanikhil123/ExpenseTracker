import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, View, Linking, Platform } from "react-native";
import { useCustomAlert } from "@/components/custom-dialogs";
import { Button, FAB, Surface, Text } from "react-native-paper";

import { useAccounts, useBudget, useDeleteTransaction, useSummary, useTransactions, useDebts, useMarkReminderSent } from "@/api/queries";
import {
  EmptyState,
  LoadingState,
  PageHeader,
  SummaryCards,
  SwipeableTransactionRow,
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
  const items = transactions.data?.items;
  const grouped = useMemo(() => {
    return (items ?? []).reduce<Record<string, Transaction[]>>(
      (result, item) => {
        const key = dayKey(item.transactionDate);
        (result[key] ??= []).push(item);
        return result;
      },
      {},
    );
  }, [items]);
  const totalBalance = useMemo(() => {
    return (accounts.data ?? []).reduce((sum, acc) => sum + Number(acc.balance), 0);
  }, [accounts.data]);

  const budgetProgress = budget.data?.budget
    ? Math.min(budget.data.spent / budget.data.budget, 1)
    : 0;

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
      fixed={
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => router.push("/add-transaction")}
        />
      }
    >
      <View style={styles.top}>
        <PageHeader
          title={monthLabel()}
          subtitle="Your monthly money overview"
        />
        <Pressable onPress={() => router.push("/(tabs)/profile")}>
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
      )}

      <Surface style={styles.budget} elevation={0}>
        <View style={styles.row}>
          <View>
            <Text variant="titleMedium" style={{ color: palette.text }}>Monthly budget</Text>
            <Text style={styles.muted}>
              {currency(budget.data?.spent ?? 0)} of{" "}
              {currency(budget.data?.budget ?? 0)}
            </Text>
          </View>
          <Text style={{ color: palette.warning }}>
            {currency(budget.data?.remaining ?? 0)} left
          </Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${budgetProgress * 100}%` }]} />
        </View>
      </Surface>
      <View style={styles.sectionTitle}>
        <Text variant="titleLarge" style={[styles.bold, { color: palette.text }]}>
          Transactions
        </Text>
        <Text style={styles.muted}>
          {transactions.data?.total ?? 0} this month
        </Text>
      </View>
      {transactions.isLoading ? (
        <LoadingState />
      ) : Object.keys(grouped).length === 0 ? (
        <EmptyState text="No transactions yet. Add your first one." />
      ) : (
        Object.entries(grouped).map(([date, items]) => (
          <View key={date} style={styles.group}>
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
          </View>
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  budget: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: palette.surface,
    gap: 14,
  },
  muted: { color: palette.muted },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.surfaceAlt,
    overflow: "hidden",
  },
  fill: { height: 8, borderRadius: 4, backgroundColor: palette.warning },
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
    marginBottom: 4,
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    right: 22,
    bottom: 94,
    backgroundColor: palette.primary,
  },
  remindersCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: palette.surface,
    gap: 10,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: palette.border,
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
    backgroundColor: palette.surfaceAlt,
    padding: 10,
    borderRadius: 12,
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
});
