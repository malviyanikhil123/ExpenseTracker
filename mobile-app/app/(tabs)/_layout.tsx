import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Tabs } from "expo-router";

import { palette } from "@/constants/app-theme";

const icons = {
  index: "home-variant",
  charts: "chart-donut",
  reports: "file-chart",
  debts: "hand-coin",
  profile: "account-circle",
} as const;

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.muted,
        tabBarStyle: {
          position: "absolute",
          height: 76,
          paddingTop: 12,
          backgroundColor: palette.surfaceElevated,
          borderTopColor: palette.border,
          borderTopWidth: 1,
        },
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons
            name={icons[route.name as keyof typeof icons] ?? "circle"}
            color={color}
            size={size + 2}
          />
        ),
      })}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="charts" />
      <Tabs.Screen name="reports" />
      <Tabs.Screen name="debts" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}


