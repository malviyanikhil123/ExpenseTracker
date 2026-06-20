import { useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState, useEffect } from "react";
import { StyleSheet, View, Pressable } from "react-native";
import {
  Button,
  Dialog,
  Portal,
  Surface,
  Text,
  TextInput,
} from "react-native-paper";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeInDown,
} from "react-native-reanimated";

import {
  useAccounts,
  useBudget,
  useCreateAccount,
  useSetBudget,
  useSummary,
  useTransactions,
} from "@/api/queries";
import { PageHeader, SummaryCards, FloatingFAB } from "@/components/finance-ui";
import { Screen } from "@/components/screen";
import { palette } from "@/constants/app-theme";
import { currency } from "@/lib/format";

function AnimatedProgressBar({ percent, color }: { percent: number; color: string }) {
  const widthShared = useSharedValue(0);
  useEffect(() => {
    widthShared.value = withTiming(percent, { duration: 600 });
  }, [percent, widthShared]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${widthShared.value}%`,
  }));

  return <Reanimated.View style={[styles.fill, animatedStyle, { backgroundColor: color }]} />;
}

function AccountCard({ account, count, index }: { account: any; count: number; index: number }) {
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

  return (
    <Reanimated.View
      entering={FadeInDown.delay(100 * index).duration(400)}
      style={{ marginBottom: 10 }}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Reanimated.View style={[styles.card, styles.account, animatedStyle, { marginBottom: 0 }]}>
          <View>
            <Text variant="titleMedium" style={[styles.bold, { color: palette.text }]}>{account.name}</Text>
            <Text style={styles.muted}>{count} transactions this month</Text>
          </View>
          <Text variant="titleMedium" style={{ color: palette.primary, fontWeight: '700' }}>
            {currency(account.balance)}
          </Text>
        </Reanimated.View>
      </Pressable>
    </Reanimated.View>
  );
}

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

  const budgetPercent = budget.data?.budget
    ? Math.min((budget.data.spent / budget.data.budget) * 100, 100)
    : 0;

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={onRefresh}
      fixed={<FloatingFAB onPress={() => router.push("/add-transaction")} />}
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
          textColor={palette.primary}
          labelStyle={{ fontWeight: '700' }}
          onPress={() => {
            setValue(String(budget.data?.budget || ""));
            setDialog("budget");
          }}
        >
          Edit
        </Button>
      </View>
      
      <Reanimated.View entering={FadeInDown.delay(100).duration(400)}>
        <Surface style={styles.card} elevation={0}>
          <View style={styles.row}>
            <Text style={{ color: palette.text, fontWeight: '500' }}>Spent</Text>
            <Text style={{ color: palette.text, fontWeight: '700' }}>
              {currency(budget.data?.spent ?? 0)} /{" "}
              {currency(budget.data?.budget ?? 0)}
            </Text>
          </View>
          <View style={styles.track}>
            <AnimatedProgressBar percent={budgetPercent} color={palette.warning} />
          </View>
          <Text style={styles.muted}>
            {currency(budget.data?.remaining ?? 0)} remaining
          </Text>
        </Surface>
      </Reanimated.View>

      <View style={styles.headingRow}>
        <Text variant="titleLarge" style={styles.heading}>
          Accounts
        </Text>
        <Button
          icon="plus"
          textColor={palette.primary}
          labelStyle={{ fontWeight: '700' }}
          onPress={() => {
            setName("");
            setValue("0");
            setDialog("account");
          }}
        >
          Add
        </Button>
      </View>

      {(accounts.data ?? []).map((account, index) => {
        const count =
          transactions.data?.items.filter((item) =>
            [item.accountId, item.fromAccountId, item.toAccountId].includes(
              account.id,
            ),
          ).length ?? 0;
        return (
          <AccountCard
            key={account.id}
            account={account}
            count={count}
            index={index}
          />
        );
      })}

      <Portal>
        <Dialog visible={!!dialog} onDismiss={() => setDialog(undefined)} style={styles.dialogContainer}>
          {dialog && (
            <View>
              <Dialog.Title style={styles.dialogTitle}>
                {dialog === "account" ? "Add Account" : "Set Monthly Budget"}
              </Dialog.Title>
              <Dialog.Content style={styles.dialogContent}>
                {dialog === "account" ? (
                  <View style={{ gap: 12 }}>
                    <TextInput
                      mode="outlined"
                      label="Account Name"
                      textColor={palette.text}
                      activeOutlineColor={palette.primary}
                      outlineColor={palette.border}
                      placeholderTextColor={palette.muted}
                      value={name}
                      onChangeText={setName}
                      style={styles.textInput}
                    />
                    <TextInput
                      mode="outlined"
                      label="Opening Balance"
                      keyboardType="decimal-pad"
                      textColor={palette.text}
                      activeOutlineColor={palette.primary}
                      outlineColor={palette.border}
                      placeholderTextColor={palette.muted}
                      value={value}
                      onChangeText={setValue}
                      style={styles.textInput}
                    />
                  </View>
                ) : (
                  <TextInput
                    mode="outlined"
                    label="Budget Amount"
                    keyboardType="decimal-pad"
                    textColor={palette.text}
                    activeOutlineColor={palette.primary}
                    outlineColor={palette.border}
                    placeholderTextColor={palette.muted}
                    value={value}
                    onChangeText={setValue}
                    style={styles.textInput}
                  />
                )}
              </Dialog.Content>
              <View style={styles.dialogActions}>
                <Button textColor={palette.muted} onPress={() => setDialog(undefined)}>Cancel</Button>
                <Button
                  mode="contained"
                  buttonColor={palette.primary}
                  textColor={palette.textDark}
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
                  style={{ borderRadius: 12 }}
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
  heading: { fontWeight: "700", marginTop: 24, marginBottom: 12, color: palette.text },
  headingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: 18,
    padding: 18,
    gap: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  account: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  muted: { color: palette.muted, fontSize: 12 },
  track: {
    height: 8,
    backgroundColor: palette.surface,
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: { height: 8, borderRadius: 4 },
  dialogContainer: {
    backgroundColor: palette.surfaceElevated,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  dialogTitle: {
    fontWeight: "800",
    color: palette.text,
    fontSize: 20,
  },
  dialogActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 12,
  },
  dialogContent: { gap: 12, paddingHorizontal: 24 },
  bold: { fontWeight: "700" },
  textInput: {
    backgroundColor: palette.surface,
  },
});
