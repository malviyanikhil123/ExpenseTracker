import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useCustomAlert } from "@/components/custom-dialogs";
import {
  Button,
  Dialog,
  List,
  Portal,
  Surface,
  Text,
  TextInput,
} from "react-native-paper";

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
      <Surface style={styles.identity} elevation={0}>
        <View style={styles.avatar}>
          <MaterialCommunityIcons
            name="account"
            size={40}
            color={palette.primary}
          />
        </View>
        <View>
          <Text variant="titleLarge">{profile.data?.fullName ?? "User"}</Text>
          <Text style={styles.muted}>{profile.data?.email}</Text>
        </View>
      </Surface>
      <Surface style={styles.menu} elevation={0}>
        <List.Item
          title="Update profile"
          description="Change your display name"
          titleStyle={{ color: palette.text }}
          descriptionStyle={{ color: palette.muted }}
          onPress={() => {
            setFullName(profile.data?.fullName ?? "");
            setDialog("profile");
          }}
          left={(props) => <List.Icon {...props} icon="account-edit" color={palette.muted} />}
        />
        <List.Item
          title="Change password"
          description="Keep your account secure"
          titleStyle={{ color: palette.text }}
          descriptionStyle={{ color: palette.muted }}
          onPress={() => {
            setCurrentPassword("");
            setNewPassword("");
            setDialog("password");
          }}
          left={(props) => <List.Icon {...props} icon="lock-reset" color={palette.muted} />}
        />
        <List.Item
          title="Export data"
          description="Share transactions as JSON"
          titleStyle={{ color: palette.text }}
          descriptionStyle={{ color: palette.muted }}
          onPress={exportData}
          left={(props) => <List.Icon {...props} icon="export" color={palette.muted} />}
        />
        <List.Item
          title="Dark theme"
          description="Enabled by default"
          titleStyle={{ color: palette.text }}
          descriptionStyle={{ color: palette.muted }}
          left={(props) => <List.Icon {...props} icon="theme-light-dark" color={palette.muted} />}
        />
      </Surface>
      <Button
        mode="outlined"
        textColor={palette.expense}
        style={styles.logout}
        onPress={logout}
      >
        Log out
      </Button>
      <Portal>
        <Dialog visible={!!dialog} onDismiss={() => setDialog(undefined)} style={styles.dialogContainer}>
          {dialog && (
            <View>
              <Dialog.Title style={[styles.bold, { color: palette.text }]}>
                {dialog === "profile" ? "Update profile" : "Change password"}
              </Dialog.Title>
              <Dialog.Content style={styles.dialogContent}>
                {dialog === "profile" ? (
                  <TextInput
                    mode="outlined"
                    label="Full name"
                    value={fullName}
                    onChangeText={setFullName}
                  />
                ) : (
                  <View style={{ gap: 12 }}>
                    <TextInput
                      mode="outlined"
                      label="Current password"
                      secureTextEntry
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                    />
                    <TextInput
                      mode="outlined"
                      label="New password"
                      secureTextEntry
                      value={newPassword}
                      onChangeText={setNewPassword}
                    />
                  </View>
                )}
              </Dialog.Content>
              <View style={styles.dialogActions}>
                <Button onPress={() => setDialog(undefined)}>Cancel</Button>
                <Button
                  mode="contained"
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
    backgroundColor: palette.surface,
    padding: 20,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: palette.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  muted: { color: palette.muted },
  menu: {
    backgroundColor: palette.surface,
    borderRadius: 18,
    marginTop: 22,
    overflow: "hidden",
  },
  logout: { marginTop: 24, borderColor: palette.expense },
  dialog: { gap: 12 },
  dialogContainer: { backgroundColor: palette.surfaceElevated, borderRadius: 20 },
  dialogActions: { flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  dialogContent: { gap: 12 },
  bold: { fontWeight: "700" },
});
