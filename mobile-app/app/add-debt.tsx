import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CustomDatePicker, useCustomAlert } from '@/components/custom-dialogs';
import { isAxiosError } from 'axios';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, Linking, Platform } from 'react-native';
import { Button, Chip, HelperText, Text, TextInput } from 'react-native-paper';

import { useAccounts, useCreateDebt } from '@/api/queries';
import { Screen } from '@/components/screen';
import { palette } from '@/constants/app-theme';

type DebtType = 'lend' | 'borrow';

export default function AddDebtScreen() {
  const router = useRouter();
  const accounts = useAccounts();
  const createDebt = useCreateDebt();
  const { showAlert, AlertComponent } = useCustomAlert();

  const [type, setType] = useState<DebtType>('lend');
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [accountId, setAccountId] = useState<string | undefined>(undefined);
  const [transactionDate, setTransactionDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New fields for reminder messaging
  const [phoneNumber, setPhoneNumber] = useState('');
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [reminderInterval, setReminderInterval] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [customMessage, setCustomMessage] = useState('');
  const [isMessageEdited, setIsMessageEdited] = useState(false);

  // Auto-fill template when inputs change, if user hasn't manually edited the message
  useEffect(() => {
    if (!isMessageEdited) {
      const formattedDate = transactionDate.toLocaleDateString('en-IN');
      const amtStr = amount || '0';
      if (type === 'lend') {
        setCustomMessage(`Hi ${personName || '{Name}'}, just a reminder about the outstanding payment of ₹${amtStr} lent to you on ${formattedDate}.`);
      } else {
        setCustomMessage(`Hi ${personName || '{Name}'}, regarding the ₹${amtStr} I borrowed from you on ${formattedDate}, I will repay it soon.`);
      }
    }
  }, [type, personName, amount, transactionDate, isMessageEdited]);

  // Automatically select 'monthly' schedule when phone number is entered
  useEffect(() => {
    if (phoneNumber.trim().length > 0) {
      if (reminderInterval === 'none') {
        setReminderInterval('monthly');
      }
    } else {
      setReminderInterval('none');
    }
  }, [phoneNumber]);

  const handleMessageChange = (text: string) => {
    setCustomMessage(text);
    setIsMessageEdited(text.trim().length > 0);
  };

  useEffect(() => {
    if (!accountId && accounts.data?.[0]) {
      setAccountId(accounts.data[0].id);
    }
  }, [accountId, accounts.data]);

  const validAmount = Number.isFinite(Number(amount)) && Number(amount) > 0;
  const valid = personName.trim().length > 0 && validAmount && Boolean(accountId);

  const validationMessage = !personName.trim()
    ? 'Enter a person\'s name.'
    : !validAmount
      ? 'Enter an amount greater than zero.'
      : !accountId
        ? 'Select an account.'
        : null;

  const requestError = createDebt.error
    ? isAxiosError(createDebt.error)
      ? createDebt.error.response?.data?.message ?? createDebt.error.message
      : 'Could not save this loan.'
    : null;

  const save = async () => {
    if (!valid || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createDebt.mutateAsync({
        type,
        personName: personName.trim(),
        amount: Number(amount),
        note: note.trim() || undefined,
        accountId: accountId!,
        transactionDate: transactionDate.toISOString(),
        phoneNumber: phoneNumber.trim() || undefined,
        reminderInterval: phoneNumber.trim() ? reminderInterval : 'none',
        customMessage: phoneNumber.trim() ? (customMessage.trim() || undefined) : undefined,
      });

      if (phoneNumber.trim()) {
        const formattedDate = transactionDate.toLocaleDateString('en-IN');
        let text = customMessage.trim();
        if (!text) {
          if (type === 'lend') {
            text = `Hi {Name}, just a reminder about the outstanding payment of ₹{Remaining} lent to you on {Date}.`;
          } else {
            text = `Hi {Name}, regarding the ₹{Remaining} I borrowed from you on {Date}, I will repay it soon.`;
          }
        }
        
        text = text
          .replace(/{Name}/g, personName.trim())
          .replace(/{Total}/g, amount)
          .replace(/{Remaining}/g, amount)
          .replace(/{Date}/g, formattedDate);

        const phoneClean = phoneNumber.trim().replace(/[^0-9+]/g, '');

        const triggerSend = async (method: 'whatsapp' | 'sms') => {
          let url = '';
          if (method === 'whatsapp') {
            url = `whatsapp://send?phone=${phoneClean}&text=${encodeURIComponent(text)}`;
          } else {
            url = `sms:${phoneClean}${Platform.OS === 'ios' ? '&' : '?'}body=${encodeURIComponent(text)}`;
          }

          try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
              await Linking.openURL(url);
            } else {
              if (method === 'whatsapp') {
                const webUrl = `https://wa.me/${phoneClean}?text=${encodeURIComponent(text)}`;
                await Linking.openURL(webUrl);
              } else {
                showAlert("Error", "Could not open messaging app");
              }
            }
          } catch {
            showAlert("Error", "Could not send message");
          }
        };

        showAlert(
          "Send Message Now?",
          `Would you like to send this reminder to ${personName.trim()} via WhatsApp or SMS now?`,
          [
            {
              text: "Later",
              onPress: () => router.back(),
              style: "cancel"
            },
            {
              text: "WhatsApp",
              onPress: async () => {
                await triggerSend('whatsapp');
                router.back();
              }
            },
            {
              text: "SMS",
              onPress: async () => {
                await triggerSend('sms');
                router.back();
              }
            }
          ]
        );
      } else {
        router.back();
      }
    } catch {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <MaterialCommunityIcons name="close" size={28} color={palette.text} />
        </Pressable>
        <Text variant="titleLarge" style={styles.bold}>Add Debt / Loan</Text>
        <View style={{ width: 28 }} />
      </View>

      {accounts.isError && <HelperText type="error">Failed to load accounts</HelperText>}

      {/* Lend vs Borrow selector */}
      <View style={styles.tabRow}>
        {(['lend', 'borrow'] as DebtType[]).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setType(tab)}
            style={[styles.tabButton, type === tab && styles.tabButtonActive]}
          >
            <Text style={[styles.tabLabel, type === tab && styles.tabLabelActive]}>
              {tab === 'lend' ? 'Lend (Give Money)' : 'Borrow (Get Money)'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Person Name */}
      <TextInput
        mode="outlined"
        label="Person Name"
        value={personName}
        onChangeText={setPersonName}
        placeholder="Enter name (e.g. John)"
        style={styles.input}
      />

      {/* Account selection */}
      <Text variant="titleMedium" style={styles.label}>Account</Text>
      <View style={styles.chips}>
        {accounts.data?.map((account) => (
          <Chip
            key={account.id}
            selected={accountId === account.id}
            onPress={() => setAccountId(account.id)}
          >
            {account.name}
          </Chip>
        ))}
      </View>

      {/* Amount input */}
      <TextInput
        style={[styles.input, { fontSize: 20 }]}
        mode="outlined"
        label="Amount"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        left={<TextInput.Affix text="₹ " />}
      />

      {/* Note input */}
      <TextInput
        mode="outlined"
        label="Note (optional)"
        value={note}
        onChangeText={setNote}
        multiline
        style={styles.input}
      />

      {/* Phone Number input */}
      <TextInput
        mode="outlined"
        label="Phone Number (optional)"
        value={phoneNumber}
        onChangeText={(val) => {
          setPhoneNumber(val);
          if (!val.trim()) {
            setCustomizeOpen(false);
          }
        }}
        keyboardType="phone-pad"
        left={<TextInput.Icon icon="phone" />}
        placeholder="e.g. +919999999999"
        style={styles.input}
      />

      {/* Customize Reminder Toggle & Options */}
      {phoneNumber.trim().length > 0 && (
        <View style={styles.reminderContainer}>
          <Button
            mode="outlined"
            onPress={() => setCustomizeOpen(!customizeOpen)}
            icon={customizeOpen ? "chevron-up" : "chevron-down"}
            style={styles.customizeButton}
          >
            {customizeOpen ? "Hide Reminder Options" : "Customize Reminder & Message"}
          </Button>

          {customizeOpen && (
            <View style={styles.customizeSection}>
              <Text variant="titleMedium" style={styles.subLabel}>Reminder Schedule</Text>
              <View style={styles.chips}>
                {(['none', 'daily', 'weekly', 'monthly'] as const).map((interval) => (
                  <Chip
                    key={interval}
                    selected={reminderInterval === interval}
                    onPress={() => setReminderInterval(interval)}
                    style={styles.chip}
                  >
                    {interval.charAt(0).toUpperCase() + interval.slice(1)}
                  </Chip>
                ))}
              </View>

              <TextInput
                mode="outlined"
                label="Reminder Message Template"
                value={customMessage}
                onChangeText={handleMessageChange}
                multiline
                numberOfLines={3}
                style={styles.input}
                placeholder="Type a custom message template..."
              />
              <Text style={styles.infoText}>
                Note: You can use dynamic variables like {"{Name}"}, {"{Total}"}, {"{Remaining}"}, and {"{Date}"}.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Date Picker */}
      <Pressable onPress={() => setShowDatePicker(true)}>
        <TextInput
          mode="outlined"
          label="Date"
          value={transactionDate.toLocaleDateString('en-IN')}
          editable={false}
          left={<TextInput.Icon icon="calendar" />}
          style={styles.input}
          pointerEvents="none"
        />
      </Pressable>

      <CustomDatePicker
        visible={showDatePicker}
        value={transactionDate}
        onDismiss={() => setShowDatePicker(false)}
        onChange={(date) => {
          setTransactionDate(date);
        }}
      />

      {/* Info and error messages */}
      {!valid && validationMessage ? <HelperText type="info">{validationMessage}</HelperText> : null}
      {requestError ? <HelperText type="error">{requestError}</HelperText> : null}

      {/* Save Button */}
      <Button
        mode="contained"
        style={styles.saveButton}
        contentStyle={styles.save}
        disabled={!valid || createDebt.isPending || isSubmitting}
        loading={createDebt.isPending}
        onPress={save}
      >
        Save Loan
      </Button>
      <AlertComponent />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 18 },
  bold: { fontWeight: '700' },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: palette.surface,
    borderRadius: 14,
    padding: 4,
    gap: 4,
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: palette.primary,
  },
  tabLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: palette.textDark,
  },
  label: { fontWeight: '700', marginTop: 20, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { marginTop: 14 },
  saveButton: { marginTop: 24, marginBottom: 20 },
  save: { height: 52 },
  reminderContainer: { marginTop: 16, backgroundColor: palette.surfaceAlt, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: palette.border },
  customizeButton: { marginVertical: 4 },
  customizeSection: { marginTop: 12, gap: 8 },
  subLabel: { fontWeight: '600', color: palette.text, fontSize: 14, marginBottom: 4 },
  chip: { marginRight: 4 },
  infoText: { fontSize: 11, color: palette.muted, marginTop: 4, fontStyle: 'italic' },
});
