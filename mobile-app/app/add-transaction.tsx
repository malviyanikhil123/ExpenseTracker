import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CustomDatePicker } from '@/components/custom-dialogs';
import { getCategoryColor } from '@/src/theme/colors';
import { isAxiosError } from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useCallback, useState } from 'react';
import { Pressable, StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { Button, Chip, HelperText, Text, TextInput, Portal, Dialog } from 'react-native-paper';

import { useAccounts, useCategories, useCreateTransaction, useUpdateTransaction, useCreateCategory } from '@/api/queries';
import { palette } from '@/constants/app-theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Type = 'expense' | 'income';

const AVAILABLE_ICONS = [
  'food', 'cart', 'bus', 'home', 'flash', 'heart',
  'film', 'gift', 'book', 'dumbbell', 'car', 'cash',
  'briefcase', 'account-group', 'piggy-bank', 'wifi',
  'coffee', 'dog', 'gamepad-variant', 'hanger',
  'medical-bag', 'gas-station', 'school', 'run'
];

const AVAILABLE_COLORS = [
  '#F6A242', // Orange
  '#F1C183', // Gold
  '#6BCB77', // Green
  '#FF6B6B', // Red
  '#BAC0BE', // Muted
];

export default function AddTransactionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    editId?: string;
    editType?: string;
    editAmount?: string;
    editTitle?: string;
    editNote?: string;
    editAccountId?: string;
    editToAccountId?: string;
    editCategoryId?: string;
    editDate?: string;
  }>();

  const isEditing = Boolean(params.editId);
  const insets = useSafeAreaInsets();
  const { height: SCREEN_H } = useWindowDimensions();

  // Each category item height: icon(44) + gap(4) + text(12) + vertical padding(8) ≈ 72
  const ITEM_H = 72;
  // How many rows fit in full-screen mode (exactly 4 rows)
  const FULL_ROWS = 4;
  // Collapsed (selected) always shows 3 rows
  const COLLAPSED_ROWS = 3;

  const formSectionY = useRef(0);


  const [isSubmitting, setIsSubmitting] = useState(false);
  const [type, setType] = useState<Type>((params.editType as Type) || 'expense');
  const [amount, setAmount] = useState(params.editAmount || '');
  const [note, setNote] = useState(params.editNote || '');
  const [accountId, setAccountId] = useState<string | undefined>(params.editAccountId || undefined);
  const [toAccountId, setToAccountId] = useState<string | undefined>(params.editToAccountId || undefined);
  const [categoryId, setCategoryId] = useState<string | undefined>(params.editCategoryId || undefined);
  const [transactionDate, setTransactionDate] = useState(params.editDate ? new Date(params.editDate) : new Date());
  const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('food');
  const [newCategoryColor, setNewCategoryColor] = useState('#F6A242');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const accounts = useAccounts();
  const categories = useCategories(type);
  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const createCategory = useCreateCategory();
  const mutation = isEditing ? update : create;

  const selectedCategories = useMemo(() => categories.data?.filter((item) => item.type === type) ?? [], [categories.data, type]);
  const validAmount = Number.isFinite(Number(amount)) && Number(amount) > 0;
  const valid = validAmount && Boolean(accountId) && Boolean(categoryId);

  useEffect(() => {
    if (!accountId && accounts.data?.[0]) setAccountId(accounts.data[0].id);
  }, [accountId, accounts.data]);

  useEffect(() => {
    if (isEditing && !categoryId && selectedCategories[0]) {
      setCategoryId(selectedCategories[0].id);
    }
  }, [categoryId, selectedCategories, type, isEditing]);

  const validationMessage = !validAmount
    ? 'Enter an amount greater than zero.'
    : !categoryId
      ? 'Select a category.'
      : !accountId
        ? 'Select an account.'
        : null;

  const requestError = mutation.error
    ? isAxiosError(mutation.error)
      ? mutation.error.response?.data?.message ?? mutation.error.message
      : 'Could not save this transaction.'
    : null;

  const save = async () => {
    // Prevent multiple submissions
    if (!valid || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const transactionTitle = selectedCategories.find(c => c.id === categoryId)?.name || (type === 'expense' ? 'Expense' : 'Income');

      if (isEditing) {
        await update.mutateAsync({
          id: params.editId!,
          type,
          amount: Number(amount),
          title: transactionTitle,
          note: note.trim() || undefined,
          transactionDate: transactionDate.toISOString(),
          accountId,
          categoryId,
        });
      } else {
        await create.mutateAsync({
          type,
          amount: Number(amount),
          title: transactionTitle,
          note: note.trim() || undefined,
          transactionDate: transactionDate.toISOString(),
          accountId,
          categoryId,
        });
      }
      // Navigate back after success
      router.back();
    } catch {
      // The mutation error is rendered below the form.
      setIsSubmitting(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const newCat = await createCategory.mutateAsync({
        name: newCategoryName.trim(),
        icon: newCategoryIcon,
        color: newCategoryColor,
        type,
      });
      setCategoryId(newCat.id);
      setNewCategoryName('');
      setShowNewCategoryDialog(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectCategory = useCallback((id: string, isSelected: boolean) => {
    if (isSelected) {
      setCategoryId(undefined);
    } else {
      setCategoryId(id);
    }
  }, []);

  // Helper: split flat list into N rows for horizontal-scroll grid
  const splitIntoRows = useCallback(<T,>(items: T[], numRows: number): T[][] => {
    const rows: T[][] = Array.from({ length: numRows }, () => []);
    items.forEach((item, i) => rows[i % numRows].push(item));
    return rows;
  }, []);

  type CatItem = typeof selectedCategories[number] | { id: '__new__'; name: string; icon: string; type: string; color: string };
  const allCategoryItems = useMemo<CatItem[]>(
    () => [...selectedCategories, { id: '__new__' as const, name: 'New', icon: 'plus', type, color: '' }],
    [selectedCategories, type]
  );

  return (
    <KeyboardAvoidingView
      style={[styles.kvContainer, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={categoryId !== undefined ? styles.topHalf : undefined}>
        {/* ─── TOP FIXED SECTION ─── */}
        <View style={styles.topSection}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()}>
              <MaterialCommunityIcons name="close" size={28} color={palette.text} />
            </Pressable>
            <Text variant="titleLarge" style={styles.bold}>
              {isEditing ? 'Edit transaction' : 'Add transaction'}
            </Text>
            <View style={{ width: 28 }} />
          </View>

          {accounts.isError && <HelperText type="error">Failed to load accounts</HelperText>}
          {categories.isError && <HelperText type="error">Failed to load categories</HelperText>}

          {/* Expense / Income tabs */}
          <View style={styles.tabRow}>
            {(['expense', 'income'] as Type[]).map((tab) => (
              <Pressable
                key={tab}
                onPress={() => { setType(tab); setCategoryId(undefined); }}
                style={[styles.tabButton, type === tab && styles.tabButtonActive]}
              >
                <Text style={[styles.tabLabel, type === tab && styles.tabLabelActive]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Category label */}
          <Text variant="titleMedium" style={styles.label}>Category</Text>
        </View>

        {/* ─── CATEGORY GRID (state-driven) ─── */}
        {(() => {
          const numRows = categoryId !== undefined ? COLLAPSED_ROWS : FULL_ROWS;
          const rows = splitIntoRows(allCategoryItems, numRows);
          const gridH = numRows * ITEM_H;

          const renderItem = (item: CatItem, rowIdx: number) => {
            if (item.id === '__new__') {
              return (
                <Pressable
                  key={`new-r${rowIdx}`}
                  onPress={() => setShowNewCategoryDialog(true)}
                  style={styles.category}
                >
                  <View style={[styles.categoryIcon, { backgroundColor: 'transparent', borderColor: palette.border, borderStyle: 'dashed' }]}>
                    <MaterialCommunityIcons name="plus" color={palette.muted} size={20} />
                  </View>
                  <Text numberOfLines={1} style={[styles.categoryText, { color: palette.muted }]}>New</Text>
                </Pressable>
              );
            }
            const isSelected = categoryId === item.id;
            const catColor = getCategoryColor(item.id);
            return (
              <Pressable
                key={item.id}
                onPress={() => handleSelectCategory(item.id, isSelected)}
                style={styles.category}
              >
                <View style={[styles.categoryIcon, {
                  backgroundColor: isSelected ? palette.primary : `${catColor}15`,
                  borderColor: isSelected ? palette.primary : 'transparent',
                }]}>
                  <MaterialCommunityIcons name={item.icon as never} color={isSelected ? palette.textDark : catColor} size={20} />
                </View>
                <Text numberOfLines={1} style={[styles.categoryText, { color: isSelected ? palette.text : palette.muted }]}>
                  {item.name}
                </Text>
              </Pressable>
            );
          };

          return (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={[styles.categoryScrollArea, { height: gridH }]}
              contentContainerStyle={styles.categoryGrid}
            >
              <View style={{ height: gridH }}>
                {rows.map((row, rowIdx) => (
                  <View key={rowIdx} style={styles.categoryGridRow}>
                    {row.map((item) => renderItem(item, rowIdx))}
                  </View>
                ))}
              </View>
            </ScrollView>
          );
        })()}
      </View>

      {/* ─── BOTTOM FORM SECTION ─── */}
      {categoryId !== undefined ? (
        <View style={styles.formSheet}>
          {/* Drag handle visual */}
          <View style={styles.formSheetHandle} />
          <View style={[styles.formContent, { paddingBottom: Math.max(16, insets.bottom + 10) }]}>
            <Text variant="titleMedium" style={styles.formLabel}>Account</Text>
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
            <TextInput
              style={[styles.input, { fontSize: 18 }]}
              mode="outlined"
              dense={true}
              label="Amount"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              left={<TextInput.Affix text="₹ " />}
            />
            <TextInput
              mode="outlined"
              dense={true}
              label="Note (optional)"
              value={note}
              onChangeText={setNote}
              multiline
              style={styles.input}
            />
            <Pressable onPress={() => setShowDatePicker(true)}>
              <TextInput
                mode="outlined"
                dense={true}
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
              onChange={(date) => { setTransactionDate(date); }}
            />
            {!valid && validationMessage ? <HelperText type="info">{validationMessage}</HelperText> : null}
            {requestError ? <HelperText type="error">{requestError}</HelperText> : null}
            <Button
              mode="contained"
              style={styles.saveButton}
              contentStyle={styles.save}
              disabled={!valid || mutation.isPending || isSubmitting}
              loading={mutation.isPending}
              onPress={save}
            >
              {isEditing ? 'Update transaction' : 'Save transaction'}
            </Button>
          </View>
        </View>
      ) : (
        <View style={styles.emptyForm}>
          <MaterialCommunityIcons name="hand-pointing-up" size={36} color={palette.muted} />
          <Text style={styles.emptyFormText}>Select a category above to continue</Text>
        </View>
      )}

      {/* Dialog for Custom Category Builder */}
      <Portal>
        <Dialog
          visible={showNewCategoryDialog}
          onDismiss={() => setShowNewCategoryDialog(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>New Category</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            <TextInput
              label="Category Name"
              mode="outlined"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              style={{ marginBottom: 16 }}
            />
            <Text variant="titleMedium" style={styles.dialogSublabel}>Select Icon</Text>
            <ScrollView style={{ maxHeight: 150 }} contentContainerStyle={styles.iconGrid}>
              {AVAILABLE_ICONS.map((icon) => {
                const isSel = newCategoryIcon === icon;
                return (
                  <Pressable
                    key={icon}
                    onPress={() => setNewCategoryIcon(icon)}
                    style={[
                      styles.dialogIconBtn,
                      isSel && { backgroundColor: palette.primary, borderColor: palette.primary }
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={icon as never}
                      size={20}
                      color={isSel ? palette.textDark : palette.text}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>
            <Text variant="titleMedium" style={[styles.dialogSublabel, { marginTop: 16 }]}>Select Color</Text>
            <View style={styles.colorRow}>
              {AVAILABLE_COLORS.map((col) => {
                const isSel = newCategoryColor === col;
                return (
                  <Pressable
                    key={col}
                    onPress={() => setNewCategoryColor(col)}
                    style={[
                      styles.dialogColorBtn,
                      { backgroundColor: col },
                      isSel && styles.dialogColorBtnSelected
                    ]}
                  />
                );
              })}
            </View>
          </Dialog.Content>
          <View style={styles.dialogActions}>
            <Button textColor={palette.text} onPress={() => setShowNewCategoryDialog(false)}>
              Cancel
            </Button>
            <Button
              mode="contained"
              buttonColor={palette.primary}
              textColor={palette.textDark}
              onPress={handleCreateCategory}
              disabled={!newCategoryName.trim() || createCategory.isPending}
              loading={createCategory.isPending}
            >
              Create
            </Button>
          </View>
        </Dialog>
      </Portal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kvContainer: { flex: 1, backgroundColor: palette.background },
  topHalf: { flex: 1.1 },
  // ── Top Section ──────────────────────────────────────────────
  topSection: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  bold: { fontWeight: '700' },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: palette.surface,
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: { backgroundColor: palette.primary },
  tabLabel: { color: palette.muted, fontSize: 14, fontWeight: '600' },
  tabLabelActive: { color: palette.textDark },
  label: { fontWeight: '700', marginTop: 8, marginBottom: 4 },
  // ── Multi-Row Horizontal Category Grid ───────────────────────
  categoryScrollArea: { paddingLeft: 20 },
  categoryGrid: { flexDirection: 'row', alignItems: 'flex-start', paddingRight: 20, paddingBottom: 8 },
  categoryGridRow: { flexDirection: 'row' },
  category: { width: 64, height: 72, alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 2 },
  categoryIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5 },
  categoryText: { fontSize: 10, fontWeight: '500', textAlign: 'center' },
  // ── Bottom Form Sheet (overlaps icon grid) ───────────────────
  formSheet: {
    flex: 1,
    minHeight: 280,
    backgroundColor: palette.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    paddingTop: 10,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  formSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.border,
    alignSelf: 'center',
    marginBottom: 6,
  },
  formContent: { paddingHorizontal: 20, paddingBottom: 16 },
  emptyForm: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    opacity: 0.5,
    marginTop: -28,
  },
  emptyFormText: { color: palette.muted, fontSize: 14, fontWeight: '500' },
  // ── Form Fields ───────────────────────────────────────────────
  formLabel: { fontWeight: '700', marginTop: 10, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { marginTop: 8 },
  saveButton: { marginTop: 16, marginBottom: 8 },
  save: { height: 44 },
  // ── Dialog ────────────────────────────────────────────────────
  dialog: { backgroundColor: palette.surfaceElevated, borderRadius: 20 },
  dialogTitle: { color: palette.text, fontWeight: '700' },
  dialogContent: { gap: 8 },
  dialogSublabel: { color: palette.text, fontWeight: '600', marginBottom: 8 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 10 },
  dialogIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.surface,
    borderWidth: 1.5,
    borderColor: palette.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  dialogColorBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: 'transparent' },
  dialogColorBtnSelected: { borderColor: palette.text },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
});
