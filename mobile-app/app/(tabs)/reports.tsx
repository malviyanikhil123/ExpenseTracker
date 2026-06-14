import { useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Button,
  Dialog,
  FAB,
  Portal,
  ProgressBar,
  Surface,
  Text,
  TextInput,
} from "react-native-paper";

import {
  useAccounts,
  useBudget,
  useCreateAccount,
  useSetBudget,
  useSummary,
  useTransactions,
} from "@/api/queries";
import { PageHeader, SummaryCards } from "@/components/finance-ui";
import { Screen } from "@/components/screen";
import { palette } from "@/constants/app-theme";
import { currency } from "@/lib/format";

export default function ReportsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const summary = useSummary();
  const budget = useBudget();
  const accounts = useAccounts();
  const transactions = useTransactions();
  const createAccount = useCreateAccount();
  const setBudget = useSetBudget();
  const [dialog, setDialog] = useState<"account" | "budget">();

  useFocusEffect(
    useCallback(() => {
      void queryClient.invalidateQueries();
    }, [queryClient])
  );
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries();
    setRefreshing(false);
  }, [queryClient]);
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
      <PageHeader
        title="Reports"
        subtitle="Monthly statistics and account health"
      />
      <SummaryCards data={summary.data} />
      <View style={styles.headingRow}>
        <Text variant="titleLarge" style={styles.heading}>
          Budget status
        </Text>
        <Button
          onPress={() => {
            setValue(String(budget.data?.budget || ""));
            setDialog("budget");
          }}
        >
          Edit
        </Button>
      </View>
      <Surface style={styles.card} elevation={0}>
        <View style={styles.row}>
          <Text style={{ color: palette.text }}>Spent</Text>
          <Text style={{ color: palette.text }}>
            {currency(budget.data?.spent ?? 0)} /{" "}
            {currency(budget.data?.budget ?? 0)}
          </Text>
        </View>
        <ProgressBar
          progress={
            budget.data?.budget
              ? Math.min(budget.data.spent / budget.data.budget, 1)
              : 0
          }
          color={palette.warning}
        />
        <Text style={styles.muted}>
          {currency(budget.data?.remaining ?? 0)} remaining
        </Text>
      </Surface>
      <View style={styles.headingRow}>
        <Text variant="titleLarge" style={styles.heading}>
          Accounts
        </Text>
        <Button
          icon="plus"
          onPress={() => {
            setName("");
            setValue("0");
            setDialog("account");
          }}
        >
          Add
        </Button>
      </View>
      {(accounts.data ?? []).map((account) => {
        const count =
          transactions.data?.items.filter((item) =>
            [item.accountId, item.fromAccountId, item.toAccountId].includes(
              account.id,
            ),
          ).length ?? 0;
        return (
          <Surface
            key={account.id}
            style={[styles.card, styles.account]}
            elevation={0}
          >
            <View>
              <Text variant="titleMedium" style={{ color: palette.text }}>{account.name}</Text>
              <Text style={styles.muted}>{count} transactions this month</Text>
            </View>
            <Text variant="titleMedium" style={{ color: palette.primary }}>
              {currency(account.balance)}
            </Text>
          </Surface>
        );
      })}
      <Portal>
        <Dialog visible={!!dialog} onDismiss={() => setDialog(undefined)} style={styles.dialogContainer}>
          {dialog && (
            <View>
              <Dialog.Title style={styles.bold}>
                {dialog === "account" ? "Add account" : "Set monthly budget"}
              </Dialog.Title>
              <Dialog.Content style={styles.dialogContent}>
                {dialog === "account" ? (
                  <View style={{ gap: 12 }}>
                    <TextInput
                      mode="outlined"
                      label="Account name"
                      value={name}
                      onChangeText={setName}
                    />
                    <TextInput
                      mode="outlined"
                      label="Opening balance"
                      keyboardType="decimal-pad"
                      value={value}
                      onChangeText={setValue}
                    />
                  </View>
                ) : (
                  <TextInput
                    mode="outlined"
                    label="Budget amount"
                    keyboardType="decimal-pad"
                    value={value}
                    onChangeText={setValue}
                  />
                )}
              </Dialog.Content>
              <View style={styles.dialogActions}>
                <Button onPress={() => setDialog(undefined)}>Cancel</Button>
                <Button
                  mode="contained"
                  disabled={
                    Number(value) < 0 || (dialog === "account" && !name.trim())
                  }
                  loading={createAccount.isPending || setBudget.isPending}
                  onPress={async () => {
                    if (dialog === "account")
                      await createAccount.mutateAsync({
                        name: name.trim(),
                        balance: Number(value),
                        icon: "wallet",
                      });
                    else await setBudget.mutateAsync(Number(value));
                    setDialog(undefined);
                  }}
                >
                  Save
                </Button>
              </View>
            </View>
          )}
        </Dialog>
      </Portal>
    </Screen>
  );
}
const styles = StyleSheet.create({
  heading: { fontWeight: "700", marginTop: 24, marginBottom: 12 },
  headingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 18,
    padding: 18,
    gap: 14,
    marginBottom: 10,
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  account: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  muted: { color: palette.muted },
  dialog: { gap: 12 },
  fab: {
    position: "absolute",
    right: 22,
    bottom: 94,
    backgroundColor: palette.primary,
  },
  dialogContainer: { backgroundColor: palette.surfaceElevated, borderRadius: 20 },
  dialogActions: { flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  dialogContent: { gap: 12 },
  bold: { fontWeight: "700" },
});
