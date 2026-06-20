import { useQueryClient } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState, useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Surface, Text } from "react-native-paper";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeInDown,
} from "react-native-reanimated";

import {
  useCategoryAnalytics,
  useMonthlyAnalytics,
  useTransactions,
} from "@/api/queries";
import { EmptyState, LoadingState, PageHeader, FloatingFAB } from "@/components/finance-ui";
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
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (weekNum - 1) * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

/* ─── Micro-interaction components ─── */

function AnimatedBar({ targetHeight, color }: { targetHeight: number; color: string }) {
  const heightShared = useSharedValue(0);
  useEffect(() => {
    heightShared.value = withTiming(targetHeight, { duration: 600 });
  }, [targetHeight, heightShared]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: heightShared.value,
  }));

  return <Reanimated.View style={[styles.bar, animatedStyle, { backgroundColor: color }]} />;
}

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
      <Reanimated.View entering={FadeInDown.delay(100).duration(400)}>
        <Surface style={styles.card} elevation={0}>
          {weeklyData.map((w) => {
            const pct = totalExpense ? (w.expense / totalExpense) * 100 : 0;
            return (
              <View key={w.week} style={styles.category}>
                <View style={styles.row}>
                  <Text style={{ flex: 1, color: palette.text, fontWeight: '500' }}>
                    {weekLabel(w.week, year)}
                  </Text>
                  <Text style={{ color: palette.text, fontWeight: '700' }}>{currency(w.expense)}</Text>
                </View>
                <View style={styles.track}>
                  <AnimatedProgressBar percent={pct} color={palette.expense} />
                </View>
              </View>
            );
          })}
        </Surface>
      </Reanimated.View>

      <Text variant="titleLarge" style={styles.heading}>
        Weekly comparison
      </Text>
      <Reanimated.View entering={FadeInDown.delay(200).duration(400)}>
        <Surface style={[styles.card, styles.chart]} elevation={0}>
          {weeklyData.map((w) => (
            <View key={w.week} style={styles.barColumn}>
              <View style={styles.bars}>
                <AnimatedBar targetHeight={Math.max(4, (w.income / maxVal) * 130)} color={palette.income} />
                <AnimatedBar targetHeight={Math.max(4, (w.expense / maxVal) * 130)} color={palette.expense} />
              </View>
              <Text style={styles.month}>W{w.week}</Text>
            </View>
          ))}
        </Surface>
      </Reanimated.View>

      <View style={styles.legend}>
        <Text style={{ color: palette.income, fontWeight: '600' }}>● Income</Text>
        <Text style={{ color: palette.expense, fontWeight: '600' }}>● Expense</Text>
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
      <Reanimated.View entering={FadeInDown.delay(100).duration(400)}>
        <Surface style={styles.card} elevation={0}>
          {categories.data?.length ? (
            categories.data.map((item) => {
              const percent = total ? (Number(item.total) / total) * 100 : 0;
              return (
                <View key={item.categoryId} style={styles.category}>
                  <View style={styles.row}>
                    <Text style={{ color: palette.text, fontWeight: '500' }}>{item.name}</Text>
                    <Text style={{ color: palette.textSecondary, fontWeight: '600' }}>
                      {percent.toFixed(0)}% · {currency(item.total)}
                    </Text>
                  </View>
                  <View style={styles.track}>
                    <AnimatedProgressBar percent={percent} color={item.color || palette.primary} />
                  </View>
                </View>
              );
            })
          ) : (
            <EmptyState text="No expense data for this month." />
          )}
        </Surface>
      </Reanimated.View>

      <Text variant="titleLarge" style={styles.heading}>
        Monthly trend
      </Text>
      <Reanimated.View entering={FadeInDown.delay(200).duration(400)}>
        <Surface style={[styles.card, styles.chart]} elevation={0}>
          {(monthly.data ?? []).map((item) => (
            <View key={item.month} style={styles.barColumn}>
              <View style={styles.bars}>
                <AnimatedBar targetHeight={Math.max(4, (item.income / maxMonth) * 130)} color={palette.income} />
                <AnimatedBar targetHeight={Math.max(4, (item.expense / maxMonth) * 130)} color={palette.expense} />
              </View>
              <Text style={styles.month}>
                {new Date(2026, item.month - 1).toLocaleDateString("en", {
                  month: "narrow",
                })}
              </Text>
            </View>
          ))}
        </Surface>
      </Reanimated.View>

      <View style={styles.legend}>
        <Text style={{ color: palette.income, fontWeight: '600' }}>● Income</Text>
        <Text style={{ color: palette.expense, fontWeight: '600' }}>● Expense</Text>
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
      <Reanimated.View entering={FadeInDown.delay(100).duration(400)}>
        <View style={styles.summaryRow}>
          <Surface style={styles.summaryCard} elevation={0}>
            <Text style={styles.muted}>Income</Text>
            <Text variant="titleMedium" style={{ color: palette.income, fontWeight: '700' }}>
              {currency(totalIncome)}
            </Text>
          </Surface>
          <Surface style={styles.summaryCard} elevation={0}>
            <Text style={styles.muted}>Expense</Text>
            <Text variant="titleMedium" style={{ color: palette.expense, fontWeight: '700' }}>
              {currency(totalExpense)}
            </Text>
          </Surface>
          <Surface style={styles.summaryCard} elevation={0}>
            <Text style={styles.muted}>Balance</Text>
            <Text
              variant="titleMedium"
              style={{ color: balance >= 0 ? palette.income : palette.expense, fontWeight: '700' }}
            >
              {currency(balance)}
            </Text>
          </Surface>
        </View>
      </Reanimated.View>

      <Text variant="titleLarge" style={styles.heading}>
        Monthly breakdown
      </Text>
      <Reanimated.View entering={FadeInDown.delay(200).duration(400)}>
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
                    <Text style={{ color: palette.text, fontWeight: '500' }}>{monthName}</Text>
                    <Text style={{ color: palette.textSecondary, fontWeight: '600' }}>
                      {currency(item.expense)} / {currency(item.income)}
                    </Text>
                  </View>
                  <View style={styles.track}>
                    <AnimatedProgressBar percent={pct} color={palette.expense} />
                  </View>
                </View>
              );
            })
          ) : (
            <EmptyState text="No data for this year." />
          )}
        </Surface>
      </Reanimated.View>

      <Text variant="titleLarge" style={styles.heading}>
        Annual trend
      </Text>
      <Reanimated.View entering={FadeInDown.delay(300).duration(400)}>
        <Surface style={[styles.card, styles.chart]} elevation={0}>
          {data.map((item) => (
            <View key={item.month} style={styles.barColumn}>
              <View style={styles.bars}>
                <AnimatedBar targetHeight={Math.max(4, (item.income / maxMonth) * 130)} color={palette.income} />
                <AnimatedBar targetHeight={Math.max(4, (item.expense / maxMonth) * 130)} color={palette.expense} />
              </View>
              <Text style={styles.month}>
                {new Date(2026, item.month - 1).toLocaleDateString("en", {
                  month: "narrow",
                })}
              </Text>
            </View>
          ))}
        </Surface>
      </Reanimated.View>

      <View style={styles.legend}>
        <Text style={{ color: palette.income, fontWeight: '600' }}>● Income</Text>
        <Text style={{ color: palette.expense, fontWeight: '600' }}>● Expense</Text>
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
      fixed={<FloatingFAB onPress={() => router.push("/add-transaction")} />}
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
              pressed && { opacity: 0.8 }
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
  heading: { fontWeight: "700", marginTop: 26, marginBottom: 12, color: palette.text },
  tabRow: {
    flexDirection: "row",
    backgroundColor: palette.card,
    borderRadius: 16,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonActive: {
    backgroundColor: palette.primary,
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  tabLabel: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: "700",
  },
  tabLabelActive: {
    color: palette.textDark,
  },
  card: {
    backgroundColor: palette.card,
    padding: 18,
    borderRadius: 18,
    gap: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  category: { gap: 8 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  track: {
    height: 8,
    backgroundColor: palette.surface,
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
  bar: { width: 6, borderRadius: 3 },
  month: { color: palette.muted, fontSize: 10, marginTop: 4, fontWeight: '500' },
  muted: { color: palette.muted, fontSize: 12, fontWeight: '500' },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    marginTop: 18,
  },
  summaryRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  summaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    backgroundColor: palette.card,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
});
