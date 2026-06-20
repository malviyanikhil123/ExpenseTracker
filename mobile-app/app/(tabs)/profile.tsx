import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useCustomAlert } from "@/components/custom-dialogs";
import { useRouter } from "expo-router";
import {
  Button,
  Dialog,
  List,
  Portal,
  Surface,
  Text,
  TextInput,
} from "react-native-paper";
import Reanimated, {
  FadeInDown,
} from "react-native-reanimated";

import { api } from "@/api/client";
import {
  useChangePassword,
  useProfile,
  useTransactions,
  useUpdateProfile,
} from "@/api/queries";
import { PageHeader } from "@/components/finance-ui";
import { Screen } from "@/components/screen";
import { palette } from "@/constants/app-theme";
import { useAuthStore } from "@/stores/auth-store";

export default function ProfileScreen() {
  const router = useRouter();
  const profile = useProfile();
  const transactions = useTransactions();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const clearSession = useAuthStore((state) => state.clearSession);
  const { showAlert, AlertComponent } = useCustomAlert();
  const [dialog, setDialog] = useState<"profile" | "password">();
  const [fullName, setFullName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const exportData = async () => {
    try {
      const uri = `${FileSystem.cacheDirectory}expense-transactions.json`;
      await FileSystem.writeAsStringAsync(
        uri,
        JSON.stringify(transactions.data?.items ?? [], null, 2),
      );
      await Sharing.shareAsync(uri, { mimeType: "application/json" });
    } catch {
      showAlert(
        "Export failed",
        "Unable to export transactions on this device.",
      );
    }
  };

  const logout = async () => {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (refreshToken)
      await api.post("/auth/logout", { refreshToken }).catch(() => undefined);
    await clearSession();
  };

  return (
    <Screen>
      <PageHeader title="Profile" subtitle="Account and app preferences" />

      {/* Identity Card */}
      <Reanimated.View entering={FadeInDown.delay(50).duration(400)}>
        <Surface style={styles.identity} elevation={0}>
          <View style={styles.avatar}>
            <MaterialCommunityIcons
              name="account"
              size={40}
              color={palette.primary}
            />
          </View>
          <View>
            <Text variant="titleLarge" style={[styles.bold, { color: palette.text }]}>
              {profile.data?.fullName ?? "User"}
            </Text>
            <Text style={styles.muted}>{profile.data?.email}</Text>
          </View>
        </Surface>
      </Reanimated.View>

      {/* Menu Options */}
      <Reanimated.View entering={FadeInDown.delay(150).duration(400)}>
        <Surface style={styles.menu} elevation={0}>
          <List.Item
            title="Update profile"
            description="Change your display name"
            titleStyle={{ color: palette.text, fontWeight: '600', fontSize: 15 }}
            descriptionStyle={{ color: palette.muted, fontSize: 12 }}
            onPress={() => {
              setFullName(profile.data?.fullName ?? "");
              setDialog("profile");
            }}
            left={(props) => <List.Icon {...props} icon="account-edit" color={palette.primary} />}
            style={styles.menuItem}
          />
          <View style={styles.divider} />
          <List.Item
            title="Change password"
            description="Keep your account secure"
            titleStyle={{ color: palette.text, fontWeight: '600', fontSize: 15 }}
            descriptionStyle={{ color: palette.muted, fontSize: 12 }}
            onPress={() => {
              setCurrentPassword("");
              setNewPassword("");
              setDialog("password");
            }}
            left={(props) => <List.Icon {...props} icon="lock-reset" color={palette.primary} />}
            style={styles.menuItem}
          />
          <View style={styles.divider} />
          <List.Item
            title="Export data"
            description="Share transactions as JSON"
            titleStyle={{ color: palette.text, fontWeight: '600', fontSize: 15 }}
            descriptionStyle={{ color: palette.muted, fontSize: 12 }}
            onPress={exportData}
            left={(props) => <List.Icon {...props} icon="export" color={palette.primary} />}
            style={styles.menuItem}
          />
          <View style={styles.divider} />
          <List.Item
            title="Reports & Budgets"
            description="Manage monthly budgets and accounts"
            titleStyle={{ color: palette.text, fontWeight: '600', fontSize: 15 }}
            descriptionStyle={{ color: palette.muted, fontSize: 12 }}
            onPress={() => router.push("/reports")}
            left={(props) => <List.Icon {...props} icon="file-chart" color={palette.primary} />}
            style={styles.menuItem}
          />
          <View style={styles.divider} />
          <List.Item
            title="Dark theme"
            description="Enabled by default"
            titleStyle={{ color: palette.text, fontWeight: '600', fontSize: 15 }}
            descriptionStyle={{ color: palette.muted, fontSize: 12 }}
            left={(props) => <List.Icon {...props} icon="theme-light-dark" color={palette.primary} />}
            style={styles.menuItem}
          />
        </Surface>
      </Reanimated.View>

      <Reanimated.View entering={FadeInDown.delay(250).duration(400)}>
        <Button
          mode="outlined"
          textColor={palette.expense}
          style={styles.logout}
          labelStyle={{ fontWeight: '700', fontSize: 14 }}
          onPress={logout}
        >
          Log out
        </Button>
      </Reanimated.View>

      <Portal>
        <Dialog visible={!!dialog} onDismiss={() => setDialog(undefined)} style={styles.dialogContainer}>
          {dialog && (
            <View>
              <Dialog.Title style={styles.dialogTitle}>
                {dialog === "profile" ? "Update Profile" : "Change Password"}
              </Dialog.Title>
              <Dialog.Content style={styles.dialogContent}>
                {dialog === "profile" ? (
                  <TextInput
                    mode="outlined"
                    label="Full Name"
                    textColor={palette.text}
                    activeOutlineColor={palette.primary}
                    outlineColor={palette.border}
                    placeholderTextColor={palette.muted}
                    value={fullName}
                    onChangeText={setFullName}
                    style={styles.textInput}
                  />
                ) : (
                  <View style={{ gap: 12 }}>
                    <TextInput
                      mode="outlined"
                      label="Current Password"
                      secureTextEntry
                      textColor={palette.text}
                      activeOutlineColor={palette.primary}
                      outlineColor={palette.border}
                      placeholderTextColor={palette.muted}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      style={styles.textInput}
                    />
                    <TextInput
                      mode="outlined"
                      label="New Password"
                      secureTextEntry
                      textColor={palette.text}
                      activeOutlineColor={palette.primary}
                      outlineColor={palette.border}
                      placeholderTextColor={palette.muted}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      style={styles.textInput}
                    />
                  </View>
                )}
              </Dialog.Content>
              <View style={styles.dialogActions}>
                <Button textColor={palette.muted} onPress={() => setDialog(undefined)}>Cancel</Button>
                <Button
                  mode="contained"
                  buttonColor={palette.primary}
                  textColor={palette.textDark}
                  loading={updateProfile.isPending || changePassword.isPending}
                  disabled={
                    dialog === "profile"
                      ? fullName.trim().length < 2
                      : !currentPassword || newPassword.length < 8
                  }
                  onPress={async () => {
                    try {
                      if (dialog === "profile")
                        await updateProfile.mutateAsync(fullName.trim());
                      else
                        await changePassword.mutateAsync({
                          currentPassword,
                          newPassword,
                        });
                      setDialog(undefined);
                    } catch {
                      showAlert(
                        "Update failed",
                        "Please check the values and try again.",
                      );
                    }
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
      <AlertComponent />
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: {
    backgroundColor: palette.card,
    padding: 20,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: palette.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: palette.primary,
  },
  muted: { color: palette.muted, fontSize: 13, marginTop: 2 },
  menu: {
    backgroundColor: palette.card,
    borderRadius: 18,
    marginTop: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  menuItem: {
    paddingVertical: 10,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    marginHorizontal: 16,
  },
  logout: {
    marginTop: 24,
    borderColor: palette.expense,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 4,
  },
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
