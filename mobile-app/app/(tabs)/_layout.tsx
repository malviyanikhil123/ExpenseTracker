import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Tabs, useRouter } from "expo-router";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { Text } from "react-native-paper";
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";

import { palette } from "@/constants/app-theme";

const icons = {
  index: "home-variant",
  charts: "chart-donut",
  reports: "file-chart",
  debts: "hand-coin",
  profile: "account-circle",
} as const;

const labels = {
  index: "Home",
  charts: "Charts",
  reports: "Reports",
  debts: "Debts",
  profile: "Profile",
} as const;

function TabItem({ route, isFocused, onPress }: { route: any; isFocused: boolean; onPress: () => void }) {
  const scale = useSharedValue(isFocused ? 1.15 : 1);
  const opacity = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    scale.value = withSpring(isFocused ? 1.15 : 1, { damping: 15 });
    opacity.value = withTiming(isFocused ? 1 : 0, { duration: 200 });
  }, [isFocused, scale, opacity]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const iconName = icons[route.name as keyof typeof icons] ?? "circle";
  const label = labels[route.name as keyof typeof labels] ?? route.name;

  return (
    <Pressable onPress={onPress} style={styles.tabItem}>
      <Reanimated.View style={iconStyle}>
        <MaterialCommunityIcons
          name={iconName as any}
          color={isFocused ? palette.primary : palette.muted}
          size={24}
        />
      </Reanimated.View>
      <Reanimated.View style={[styles.labelContainer, labelStyle]}>
        <Text style={[styles.tabLabel, { color: palette.primary }]}>{label}</Text>
      </Reanimated.View>
      {isFocused && <View style={styles.activeDot} />}
    </Pressable>
  );
}

function CustomTabBar({ state, descriptors, navigation }: any) {
  const renderTabButton = (route: any, index: number) => {
    const isFocused = state.index === index;

    const onPress = () => {
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name, route.params);
      }
    };

    return (
      <TabItem
        key={route.key}
        route={route}
        isFocused={isFocused}
        onPress={onPress}
      />
    );
  };

  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.floatingTabBar}>
        {state.routes.map((route: any, idx: number) => renderTabButton(route, idx))}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="charts" />
      <Tabs.Screen name="reports" />
      <Tabs.Screen name="debts" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 28 : 16,
    left: 16,
    right: 16,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  floatingTabBar: {
    flexDirection: "row",
    backgroundColor: "rgba(74, 75, 87, 0.92)",
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  labelContainer: {
    height: 14,
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: "700",
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.primary,
    marginTop: 2,
  },
});
