import { useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { FAB, Surface, Text } from "react-native-paper";

import {
  useCategoryAnalytics,
  useMonthlyAnalytics,
  useTransactions,
} from "@/api/queries";
import { EmptyState, LoadingState, PageHeader } from "@/components/finance-ui";
import { Screen } from "@/components/screen";
import { palette } from "@/constants/app-theme";
import { currency } from "@/lib/format";

type Period = "weekly" | "monthly" | "yearly";

/* ─── helpers ─── */

/** Get ISO week number (1-based) for a date */
function getWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7,
    )
  );
}

/** Get human-friendly week label like "Jun 2 – Jun 8" */
function weekLabel(weekNum: number, year: number): string {
  // Find the Monday of this ISO week
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7; // Mon=1 ... Sun=7
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (weekNum - 1) * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

/* ─── Weekly view ─── */

function WeeklyView() {
  const transactions = useTransactions();
  const items = transactions.data?.items ?? [];

  const weeklyData = useMemo(() => {
    const weeks: Record<
      number,
      { week: number; income: number; expense: number }
    > = {};
    for (const item of items) {
      const date = new Date(item.transactionDate);
      const wk = getWeekNumber(date);
      if (!weeks[wk]) weeks[wk] = { week: wk, income: 0, expense: 0 };
      const amount = Number(item.amount);
      if (item.type === "income") weeks[wk].income += amount;
      else if (item.type === "expense") weeks[wk].expense += amount;
    }
    return Object.values(weeks).sort((a, b) => a.week - b.week);
  }, [items]);

  const totalExpense = weeklyData.reduce((sum, w) => sum + w.expense, 0);

  if (transactions.isLoading) return <LoadingState />;
  if (weeklyData.length === 0)
    return <EmptyState text="No transactions this month." />;

  const maxVal = Math.max(
    ...weeklyData.map((w) => Math.max(w.income, w.expense)),
    1,
  );
  const year = new Date().getFullYear();

  return (
    <>
      <Text variant="titleLarge" style={styles.heading}>
        Weekly spending
      </Text>
      <Surface style={styles.card} elevation={0}>
        {weeklyData.map((w) => {
          const pct = totalExpense ? (w.expense / totalExpense) * 100 : 0;
          return (
            <View key={w.week} style={styles.category}>
              <View style={styles.row}>
                <Text style={{ flex: 1, color: palette.text }}>
                  {weekLabel(w.week, year)}
                </Text>
                <Text style={{ color: palette.text }}>{currency(w.expense)}</Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${pct}%`,
                      backgroundColor: palette.expense,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </Surface>
      <Text variant="titleLarge" style={styles.heading}>
        Weekly comparison
      </Text>
      <Surface style={[styles.card, styles.chart]} elevation={0}>
        {weeklyData.map((w) => (
          <View key={w.week} style={styles.barColumn}>
            <View style={styles.bars}>
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max(4, (w.income / maxVal) * 130),
                    backgroundColor: palette.income,
                  },
                ]}
              />
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max(4, (w.expense / maxVal) * 130),
                    backgroundColor: palette.expense,
                  },
                ]}
              />
            </View>
            <Text style={styles.month}>W{w.week}</Text>
          </View>
        ))}
      </Surface>
      <View style={styles.legend}>
        <Text style={{ color: palette.income }}>● Income</Text>
        <Text style={{ color: palette.expense }}>● Expense</Text>
      </View>
    </>
  );
}

/* ─── Monthly view (existing) ─── */

function MonthlyView() {
  const categories = useCategoryAnalytics();
  const monthly = useMonthlyAnalytics();
  const total =
    categories.data?.reduce((sum, item) => sum + Number(item.total), 0) ?? 0;
  const maxMonth = Math.max(
    ...(monthly.data?.map((item) => Math.max(item.income, item.expense)) ?? [
      1,
    ]),
    1,
  );

  return (
    <>
      <Text variant="titleLarge" style={styles.heading}>
        Expense breakdown
      </Text>
      <Surface style={styles.card} elevation={0}>
        {categories.data?.length ? (
          categories.data.map((item) => {
            const percent = total ? (Number(item.total) / total) * 100 : 0;
            return (
              <View key={item.categoryId} style={styles.category}>
                <View style={styles.row}>
                  <Text style={{ color: palette.text }}>{item.name}</Text>
                  <Text style={{ color: palette.textSecondary }}>
                    {percent.toFixed(0)}% · {currency(item.total)}
                  </Text>
                </View>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      { width: `${percent}%`, backgroundColor: item.color },
                    ]}
                  />
                </View>
              </View>
            );
          })
        ) : (
          <EmptyState text="No expense data for this month." />
        )}
      </Surface>
      <Text variant="titleLarge" style={styles.heading}>
        Monthly trend
      </Text>
      <Surface style={[styles.card, styles.chart]} elevation={0}>
        {(monthly.data ?? []).map((item) => (
          <View key={item.month} style={styles.barColumn}>
            <View style={styles.bars}>
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max(4, (item.income / maxMonth) * 130),
                    backgroundColor: palette.income,
                  },
                ]}
              />
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max(4, (item.expense / maxMonth) * 130),
                    backgroundColor: palette.expense,
                  },
                ]}
              />
            </View>
            <Text style={styles.month}>
              {new Date(2026, item.month - 1).toLocaleDateString("en", {
                month: "narrow",
              })}
            </Text>
          </View>
        ))}
      </Surface>
      <View style={styles.legend}>
        <Text style={{ color: palette.income }}>● Income</Text>
        <Text style={{ color: palette.expense }}>● Expense</Text>
      </View>
    </>
  );
}

/* ─── Yearly view ─── */

function YearlyView() {
  const monthly = useMonthlyAnalytics();
  const data = monthly.data ?? [];

  const totalIncome = data.reduce((sum, m) => sum + m.income, 0);
  const totalExpense = data.reduce((sum, m) => sum + m.expense, 0);
  const balance = totalIncome - totalExpense;
  const maxMonth = Math.max(
    ...data.map((item) => Math.max(item.income, item.expense)),
    1,
  );

  if (monthly.isLoading) return <LoadingState />;

  return (
    <>
      <Text variant="titleLarge" style={styles.heading}>
        Year at a glance
      </Text>
      <View style={styles.summaryRow}>
        <Surface style={styles.summaryCard} elevation={0}>
          <Text style={styles.muted}>Income</Text>
          <Text variant="titleMedium" style={{ color: palette.income }}>
            {currency(totalIncome)}
          </Text>
        </Surface>
        <Surface style={styles.summaryCard} elevation={0}>
          <Text style={styles.muted}>Expense</Text>
          <Text variant="titleMedium" style={{ color: palette.expense }}>
            {currency(totalExpense)}
          </Text>
        </Surface>
        <Surface style={styles.summaryCard} elevation={0}>
          <Text style={styles.muted}>Balance</Text>
          <Text
            variant="titleMedium"
            style={{ color: balance >= 0 ? palette.income : palette.expense }}
          >
            {currency(balance)}
          </Text>
        </Surface>
      </View>
      <Text variant="titleLarge" style={styles.heading}>
        Monthly breakdown
      </Text>
      <Surface style={styles.card} elevation={0}>
        {data.length ? (
          data.map((item) => {
            const pct = totalExpense
              ? (item.expense / totalExpense) * 100
              : 0;
            const monthName = new Date(2026, item.month - 1).toLocaleDateString(
              "en-IN",
              { month: "long" },
            );
            return (
              <View key={item.month} style={styles.category}>
                <View style={styles.row}>
                  <Text style={{ color: palette.text }}>{monthName}</Text>
                  <Text style={{ color: palette.textSecondary }}>
                    {currency(item.expense)} / {currency(item.income)}
                  </Text>
                </View>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      {
                        width: `${pct}%`,
                        backgroundColor: palette.expense,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })
        ) : (
          <EmptyState text="No data for this year." />
        )}
      </Surface>
      <Text variant="titleLarge" style={styles.heading}>
        Annual trend
      </Text>
      <Surface style={[styles.card, styles.chart]} elevation={0}>
        {data.map((item) => (
          <View key={item.month} style={styles.barColumn}>
            <View style={styles.bars}>
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max(4, (item.income / maxMonth) * 130),
                    backgroundColor: palette.income,
                  },
                ]}
              />
              <View
                style={[
                  styles.bar,
                  {
                    height: Math.max(4, (item.expense / maxMonth) * 130),
                    backgroundColor: palette.expense,
                  },
                ]}
              />
            </View>
            <Text style={styles.month}>
              {new Date(2026, item.month - 1).toLocaleDateString("en", {
                month: "narrow",
              })}
            </Text>
          </View>
        ))}
      </Surface>
      <View style={styles.legend}>
        <Text style={{ color: palette.income }}>● Income</Text>
        <Text style={{ color: palette.expense }}>● Expense</Text>
      </View>
    </>
  );
}

/* ─── Main screen ─── */

export default function ChartsScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("monthly");
  const queryClient = useQueryClient();
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
      <PageHeader title="Analytics" subtitle="See where your money goes" />
      <View style={styles.tabRow}>
        {(["weekly", "monthly", "yearly"] as Period[]).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setPeriod(tab)}
            style={({ pressed }) => [
              styles.tabButton,
              period === tab && styles.tabButtonActive,
              pressed && { opacity: 0.7 }
            ]}
          >
            <Text
              style={[
                styles.tabLabel,
                period === tab && styles.tabLabelActive,
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>
      {period === "weekly" && <WeeklyView />}
      {period === "monthly" && <MonthlyView />}
      {period === "yearly" && <YearlyView />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { fontWeight: "700", marginTop: 26, marginBottom: 12 },
  tabRow: {
    flexDirection: "row",
    backgroundColor: palette.surface,
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonActive: {
    backgroundColor: palette.primary,
  },
  tabLabel: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: "600",
  },
  tabLabelActive: {
    color: palette.textDark, // Dark text on primary orange tab for contrast
  },
  card: {
    backgroundColor: palette.surface,
    padding: 18,
    borderRadius: 18,
    gap: 16,
  },
  category: { gap: 8 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  track: {
    height: 8,
    backgroundColor: palette.surfaceAlt,
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: { height: 8, borderRadius: 4 },
  chart: {
    height: 210,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 4,
  },
  barColumn: { flex: 1, alignItems: "center", gap: 6 },
  bars: { height: 140, flexDirection: "row", alignItems: "flex-end", gap: 2 },
  bar: { width: 5, borderRadius: 3 },
  month: { color: palette.muted, fontSize: 10 },
  muted: { color: palette.muted, fontSize: 12 },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    marginTop: 12,
  },
  summaryRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  summaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    backgroundColor: palette.surface,
    gap: 6,
  },
  fab: {
    position: "absolute",
    right: 22,
    bottom: 94,
    backgroundColor: palette.primary,
  },
});
