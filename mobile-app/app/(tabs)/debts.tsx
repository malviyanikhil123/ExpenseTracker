import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, View, Linking, Platform } from "react-native";
import { ActivityIndicator, Button, Chip, Dialog, FAB, HelperText, Portal, Surface, Text, TextInput } from "react-native-paper";
import { CustomDatePicker, useCustomAlert } from "@/components/custom-dialogs";

import { useAccounts, useDebts, useDeleteDebt, useRepayDebt, useRepayments, useMarkReminderSent } from "@/api/queries";
import { EmptyState, LoadingState, PageHeader } from "@/components/finance-ui";
import { Screen } from "@/components/screen";
import { palette } from "@/constants/app-theme";
import { currency } from "@/lib/format";
import type { Debt, DebtRepayment } from "@/types";

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

export default function DebtsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const debts = useDebts();
  const accounts = useAccounts();
  const deleteDebt = useDeleteDebt();
  const repayDebt = useRepayDebt();
  const markReminderSentMut = useMarkReminderSent();
  const { showAlert, AlertComponent } = useCustomAlert();

  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "lend" | "borrow">("all");
  const [showRepaid, setShowRepaid] = useState(false);
  
  // Selected Debt for details
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null);
  const selectedDebt = useMemo(() => {
    return (debts.data ?? []).find((d) => d.id === selectedDebtId) ?? null;
  }, [debts.data, selectedDebtId]);
  
  // Repayment form state
  const [showRepayModal, setShowRepayModal] = useState(false);
  const [repayAmount, setRepayAmount] = useState("");
  const [repayAccountId, setRepayAccountId] = useState<string>("");
  const [repayNote, setRepayNote] = useState("");
  const [repayDate, setRepayDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmittingRepay, setIsSubmittingRepay] = useState(false);

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

  // Set default account when account list loads
  useMemo(() => {
    if (!repayAccountId && accounts.data?.[0]) {
      setRepayAccountId(accounts.data[0].id);
    }
  }, [accounts.data, repayAccountId]);

  // Outstanding calculations
  const totals = useMemo(() => {
    let lent = 0;
    let borrowed = 0;
    (debts.data ?? []).forEach((d) => {
      const remaining = Number(d.remainingAmount);
      if (d.type === "lend") {
        lent += remaining;
      } else {
        borrowed += remaining;
      }
    });
    return { lent, borrowed, net: lent - borrowed };
  }, [debts.data]);

  // Filtered debts
  const filteredDebts = useMemo(() => {
    return (debts.data ?? []).filter((d) => {
      const matchesType = filterType === "all" || d.type === filterType;
      const matchesStatus = showRepaid ? true : d.status === "open";
      return matchesType && matchesStatus;
    });
  }, [debts.data, filterType, showRepaid]);

  const handleDelete = (debt: Debt) => {
    showAlert(
      "Delete Loan",
      `Are you sure you want to delete this loan of ${currency(debt.amount)} for "${debt.personName}"? This will reverse all balance adjustments.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setSelectedDebtId(null);
            await deleteDebt.mutateAsync(debt.id);
          },
        },
      ],
    );
  };

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

  const handleOpenRepay = (debt: Debt) => {
    setRepayAmount(String(debt.remainingAmount));
    if (accounts.data?.[0]) setRepayAccountId(accounts.data[0].id);
    setRepayNote("");
    setRepayDate(new Date());
    setShowRepayModal(true);
  };

  const submitRepayment = async () => {
    if (!selectedDebt || !repayAmount || Number(repayAmount) <= 0 || !repayAccountId) return;
    
    setIsSubmittingRepay(true);
    try {
      await repayDebt.mutateAsync({
        debtId: selectedDebt.id,
        amount: Number(repayAmount),
        note: repayNote.trim() || undefined,
        accountId: repayAccountId,
        transactionDate: repayDate.toISOString(),
      });
      setShowRepayModal(false);
    } catch (e) {
      showAlert("Error", "Could not record repayment");
    } finally {
      setIsSubmittingRepay(false);
    }
  };

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={onRefresh}
      fixed={
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => router.push("/add-debt")}
        />
      }
    >
      <PageHeader title="Debts & Loans" subtitle="Track lending and borrowing" />

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <Surface style={styles.summaryCard} elevation={0}>
          <MaterialCommunityIcons name="arrow-up-bold-circle-outline" color={palette.income} size={20} />
          <Text style={styles.mutedSmall}>You Lent</Text>
          <Text variant="titleMedium" style={{ color: palette.income }}>{currency(totals.lent)}</Text>
        </Surface>
        <Surface style={styles.summaryCard} elevation={0}>
          <MaterialCommunityIcons name="arrow-down-bold-circle-outline" color={palette.warning} size={20} />
          <Text style={styles.mutedSmall}>You Borrowed</Text>
          <Text variant="titleMedium" style={{ color: palette.warning }}>{currency(totals.borrowed)}</Text>
        </Surface>
        <Surface style={styles.summaryCard} elevation={0}>
          <MaterialCommunityIcons name="scale-balance" color={palette.primary} size={20} />
          <Text style={styles.mutedSmall}>Net Balance</Text>
          <Text variant="titleMedium" style={{ color: totals.net >= 0 ? palette.income : palette.expense }}>
            {totals.net >= 0 ? "+" : ""}{currency(totals.net)}
          </Text>
        </Surface>
      </View>

      {/* Filters */}
      <View style={styles.filterBar}>
        <View style={styles.tabRow}>
          {(["all", "lend", "borrow"] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setFilterType(t)}
              style={[styles.tabButton, filterType === t && styles.tabButtonActive]}
            >
              <Text style={[styles.tabLabel, filterType === t && styles.tabLabelActive]}>
                {t === "all" ? "All" : t === "lend" ? "Lent" : "Borrowed"}
              </Text>
            </Pressable>
          ))}
        </View>
        <Chip
          selected={showRepaid}
          onPress={() => setShowRepaid(!showRepaid)}
          style={styles.repaidChip}
          showSelectedOverlay
        >
          Show Repaid
        </Chip>
      </View>

      {/* List */}
      {debts.isLoading ? (
        <LoadingState />
      ) : filteredDebts.length === 0 ? (
        <EmptyState text="No debts or loans found." />
      ) : (
        <View style={styles.list}>
          {filteredDebts.map((item) => {
            const isLend = item.type === "lend";
            const isRepaid = item.status === "repaid";
            const color = isRepaid ? palette.muted : isLend ? palette.income : palette.warning;
            
            return (
              <Pressable
                key={item.id}
                onPress={() => setSelectedDebtId(item.id)}
                style={({ pressed }) => [styles.itemCard, pressed && styles.itemCardPressed]}
              >
                <View style={[styles.iconCircle, { backgroundColor: `${color}15` }]}>
                  <MaterialCommunityIcons
                    name={isRepaid ? "check-circle-outline" : isLend ? "hand-pointing-right" : "hand-pointing-left"}
                    color={color}
                    size={22}
                  />
                </View>
                <View style={styles.grow}>
                  <View style={styles.row}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                      <Text variant="titleMedium" style={[styles.bold, isRepaid && styles.strikethrough, { flexShrink: 1 }]} numberOfLines={1}>
                        {item.personName}
                      </Text>
                      {isReminderDue(item) && (
                        <View style={styles.dueBadge}>
                          <MaterialCommunityIcons name="clock-alert-outline" size={10} color={palette.warning} />
                          <Text style={styles.dueBadgeText}>Due</Text>
                        </View>
                      )}
                    </View>
                    <Text variant="titleMedium" style={{ color, fontWeight: "700" }}>
                      {isLend ? "+" : "-"}{currency(item.remainingAmount)}
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={[styles.mutedSmall, { flex: 1, marginRight: 8 }]} numberOfLines={1}>
                      {isLend ? "Lent" : "Borrowed"} • {new Date(item.transactionDate).toLocaleDateString("en-IN")}
                    </Text>
                    {isRepaid ? (
                      <Text style={styles.repaidText}>Repaid</Text>
                    ) : (
                      <Text style={[styles.mutedSmall, { textAlign: "right" }]}>
                        of {currency(item.amount)}
                      </Text>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Debt Details Modal */}
      <Portal>
        <Dialog visible={Boolean(selectedDebt)} onDismiss={() => setSelectedDebtId(null)} style={[styles.dialog, { backgroundColor: palette.surfaceElevated }]}>
          {selectedDebt && (
            <View>
              <Dialog.Title style={[styles.bold, { color: palette.text }]}>
                {selectedDebt.type === "lend" ? "Lent to" : "Borrowed from"} {selectedDebt.personName}
              </Dialog.Title>
              <Dialog.Content>
                <ScrollView style={{ maxHeight: 300 }}>
                  <View style={styles.detailRow}>
                    <Text style={styles.muted}>Original Amount</Text>
                    <Text style={[styles.bold, { color: palette.text }]}>{currency(selectedDebt.amount)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.muted}>Remaining Balance</Text>
                    <Text style={[styles.bold, { color: selectedDebt.status === "repaid" ? palette.muted : selectedDebt.type === "lend" ? palette.income : palette.warning }]}>
                      {currency(selectedDebt.remainingAmount)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.muted}>Date</Text>
                    <Text style={{ color: palette.text }}>{new Date(selectedDebt.transactionDate).toLocaleDateString("en-IN")}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.muted}>Account</Text>
                    <Text style={{ color: palette.text }}>{selectedDebt.accountName ?? "Default Account"}</Text>
                  </View>
                  {selectedDebt.note && (
                    <View style={[styles.detailRow, { flexDirection: "column", alignItems: "flex-start", gap: 4 }]}>
                      <Text style={styles.muted}>Note</Text>
                      <Text style={styles.note}>{selectedDebt.note}</Text>
                    </View>
                  )}

                  {/* Reminder settings inside modal */}
                  {selectedDebt.phoneNumber && (
                    <View style={styles.reminderCard}>
                      <View style={styles.reminderHeader}>
                        <MaterialCommunityIcons name="bell-ring-outline" size={16} color={palette.primary} />
                        <Text style={[styles.bold, { fontSize: 13, color: palette.primary }]}>Active Reminder</Text>
                      </View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={styles.mutedSmall}>Phone: {selectedDebt.phoneNumber}</Text>
                          <Text style={styles.mutedSmall}>Interval: {selectedDebt.reminderInterval?.toUpperCase() || "NONE"}</Text>
                          {selectedDebt.lastReminderSentAt && (
                            <Text style={styles.mutedSmall}>Last Sent: {new Date(selectedDebt.lastReminderSentAt).toLocaleDateString("en-IN")}</Text>
                          )}
                        </View>
                        {Number(selectedDebt.remainingAmount) > 0 && (
                          <Pressable
                            onPress={() => handleSendReminderClick(selectedDebt)}
                            style={({ pressed }) => [
                              styles.customRemindButton,
                              pressed && { opacity: 0.8 }
                            ]}
                          >
                            <MaterialCommunityIcons name="bell" size={14} color={palette.primary} />
                            <Text style={styles.customRemindButtonText}>Remind</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Repayments History */}
                  <Text style={[styles.bold, { marginTop: 18, marginBottom: 8, color: palette.text }]}>Repayment History</Text>
                  <RepaymentsList debtId={selectedDebt.id} />
                </ScrollView>
              </Dialog.Content>
              <View style={[styles.dialogActions, { flexDirection: "row", alignItems: "center" }]}>
                <Button mode="text" textColor={palette.expense} onPress={() => handleDelete(selectedDebt)}>
                  Delete
                </Button>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Button
                    mode="outlined"
                    textColor={palette.text}
                    style={{ borderColor: palette.border, borderRadius: 12 }}
                    onPress={() => setSelectedDebtId(null)}
                  >
                    Close
                  </Button>
                  {Number(selectedDebt.remainingAmount) > 0 && (
                    <Button
                      mode="contained"
                      buttonColor={palette.primary}
                      textColor={palette.textDark}
                      style={{ borderRadius: 12 }}
                      onPress={() => handleOpenRepay(selectedDebt)}
                    >
                      Repay
                    </Button>
                  )}
                </View>
              </View>
            </View>
          )}
        </Dialog>

        {/* Repayment Dialog */}
        <Dialog visible={showRepayModal} onDismiss={() => setShowRepayModal(false)} style={styles.dialog}>
          <Dialog.Title style={[styles.bold, { color: palette.text }]}>Record Repayment</Dialog.Title>
          <Dialog.Content>
            {selectedDebt && (
              <ScrollView style={{ maxHeight: 340 }}>
                <Text style={{ marginBottom: 12, color: palette.text }}>
                  Record how much is returned for the loan of {selectedDebt.personName}. (Max: {currency(selectedDebt.remainingAmount)})
                </Text>
                
                <TextInput
                  mode="outlined"
                  label="Amount"
                  value={repayAmount}
                  onChangeText={setRepayAmount}
                  keyboardType="decimal-pad"
                  left={<TextInput.Affix text="₹ " />}
                  style={{ marginBottom: 12 }}
                />

                <Text style={[styles.bold, { marginTop: 10, marginBottom: 6, color: palette.text }]}>Account</Text>
                <View style={styles.chips}>
                  {accounts.data?.map((acc) => (
                    <Chip
                      key={acc.id}
                      selected={repayAccountId === acc.id}
                      onPress={() => setRepayAccountId(acc.id)}
                    >
                      {acc.name}
                    </Chip>
                  ))}
                </View>

                <TextInput
                  mode="outlined"
                  label="Note (optional)"
                  value={repayNote}
                  onChangeText={setRepayNote}
                  style={{ marginVertical: 12 }}
                />

                <Pressable onPress={() => setShowDatePicker(true)}>
                  <TextInput
                    mode="outlined"
                    label="Repayment Date"
                    value={repayDate.toLocaleDateString("en-IN")}
                    editable={false}
                    left={<TextInput.Icon icon="calendar" />}
                    pointerEvents="none"
                  />
                </Pressable>

                <CustomDatePicker
                  visible={showDatePicker}
                  value={repayDate}
                  onDismiss={() => setShowDatePicker(false)}
                  onChange={(date) => {
                    setRepayDate(date);
                  }}
                />
              </ScrollView>
            )}
          </Dialog.Content>
          <View style={{ flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 16, paddingBottom: 16, gap: 8 }}>
            <Button onPress={() => setShowRepayModal(false)}>Cancel</Button>
            <Button
              mode="contained"
              onPress={submitRepayment}
              loading={isSubmittingRepay}
              disabled={isSubmittingRepay || !repayAmount || Number(repayAmount) <= 0}
            >
              Save
            </Button>
          </View>
        </Dialog>
      </Portal>
      <AlertComponent />
    </Screen>
  );
}

// Repayments Helper Component
function RepaymentsList({ debtId }: { debtId: string }) {
  const repayments = useRepayments(debtId);

  if (repayments.isLoading) return <ActivityIndicator style={{ marginVertical: 10 }} />;
  if (!repayments.data || repayments.data.length === 0) {
    return <Text style={styles.mutedSmall}>No repayments recorded yet.</Text>;
  }

  return (
    <View style={styles.repaymentsList}>
      {repayments.data.map((r) => (
        <View key={r.id} style={styles.repaymentRow}>
          <View>
            <Text style={[styles.bold, { color: palette.text }]}>{currency(r.amount)}</Text>
            <Text style={[styles.mutedSmall, { color: palette.muted }]}>
              {new Date(r.transactionDate).toLocaleDateString("en-IN")} via {r.accountName ?? "Account"}
            </Text>
            {r.note ? <Text style={styles.repayNote}>"{r.note}"</Text> : null}
          </View>
          <MaterialCommunityIcons name="check-circle" color={palette.income} size={16} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 22,
    bottom: 94,
    backgroundColor: palette.primary,
  },
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  summaryCard: { flex: 1, padding: 12, borderRadius: 16, backgroundColor: palette.surface, gap: 6 },
  mutedSmall: { color: palette.muted, fontSize: 11 },
  muted: { color: palette.muted },
  bold: { fontWeight: "700" },
  filterBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  tabRow: {
    flexDirection: "row",
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: 3,
    gap: 4,
    flex: 1,
    marginRight: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonActive: {
    backgroundColor: palette.primary,
  },
  tabLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  tabLabelActive: {
    color: palette.textDark, // Dark text on primary orange tab for contrast
  },
  repaidChip: {
    backgroundColor: palette.surface,
    height: 38,
  },
  list: { gap: 10, marginBottom: 30 },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.surface,
    padding: 14,
    borderRadius: 16,
    gap: 12,
  },
  itemCardPressed: {
    backgroundColor: palette.surfaceAlt,
  },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  grow: { flex: 1 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  strikethrough: { textDecorationLine: "line-through", color: palette.muted },
  repaidText: { color: palette.income, fontSize: 11, fontWeight: "600" },
  dialog: { backgroundColor: palette.surfaceElevated, borderRadius: 20 },
  dialogActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: palette.border },
  note: { color: palette.text, marginTop: 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  repaymentsList: { gap: 8, marginTop: 4 },
  repaymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: palette.surfaceAlt,
    padding: 10,
    borderRadius: 10,
  },
  repayNote: { fontStyle: "italic", fontSize: 11, color: palette.muted, marginTop: 2 },
  dueBadge: { flexDirection: "row", alignItems: "center", backgroundColor: `${palette.warning}15`, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, gap: 2 },
  dueBadgeText: { color: palette.warning, fontSize: 10, fontWeight: "600" },
  reminderCard: { marginTop: 14, backgroundColor: palette.surfaceAlt, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: palette.border },
  reminderHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  customRemindButton: {
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
    minWidth: 85,
    height: 32,
  },
  customRemindButtonText: {
    color: palette.primary,
    fontSize: 12,
    fontWeight: "700",
  },
});
