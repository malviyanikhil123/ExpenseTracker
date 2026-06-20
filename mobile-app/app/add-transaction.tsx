import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CustomDatePicker } from '@/components/custom-dialogs';
import { getCategoryColor } from '@/src/theme/colors';
import { isAxiosError } from 'axios';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useCallback, useState } from 'react';
import {
  Pressable, StyleSheet, View, ScrollView, KeyboardAvoidingView,
  Platform, useWindowDimensions, TextInput as RNTextInput,
} from 'react-native';
import { Button, Chip, HelperText, Text, TextInput, Portal, Dialog } from 'react-native-paper';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withSpring,
  interpolateColor, FadeIn, FadeOut,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { useAccounts, useCategories, useCreateTransaction, useUpdateTransaction, useCreateCategory } from '@/api/queries';
import { palette } from '@/constants/app-theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Type = 'expense' | 'income';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const AVAILABLE_ICONS = [
  'food', 'cart', 'bus', 'home', 'flash', 'heart',
  'film', 'gift', 'book', 'dumbbell', 'car', 'cash',
  'briefcase', 'account-group', 'piggy-bank', 'wifi',
  'coffee', 'dog', 'gamepad-variant', 'hanger',
  'medical-bag', 'gas-station', 'school', 'run',
];

const AVAILABLE_COLORS = [
  '#F6A242', '#F1C183', '#6BCB77', '#FF6B6B', '#BAC0BE',
];

// Grid constants
const INITIAL_VISIBLE = 12;
const NUM_COLS = 5;
const ICON_SIZE = 44;
const CARD_GAP_H = 8;
const CARD_GAP_V = 6;

/* ================================================================
   CATEGORY CARD
   ================================================================ */
function CategoryCard({
  item,
  isSelected,
  onPress,
  cardWidth,
}: {
  item: { id: string; name: string; icon: string; color?: string };
  isSelected: boolean;
  onPress: () => void;
  cardWidth: number;
}) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    glow.value = withTiming(isSelected ? 1 : 0, { duration: 200 });
  }, [isSelected, glow]);

  const cardAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconAnim = useAnimatedStyle(() => ({
    borderWidth: 2,
    borderColor: interpolateColor(glow.value, [0, 1], ['transparent', '#F6A242']),
    shadowColor: '#F6A242',
    shadowOpacity: glow.value * 0.6,
    shadowRadius: glow.value * 12,
    shadowOffset: { width: 0, height: glow.value * 2 },
    elevation: glow.value * 8,
  }));

  const labelAnim = useAnimatedStyle(() => ({
    opacity: 0.55 + glow.value * 0.45,
  }));

  const isNew = item.id === '__new__';
  const catColor = isNew ? palette.muted : getCategoryColor(item.id);

  return (
    <AnimatedPressable
      onPressIn={() => { scale.value = withSpring(0.92); }}
      onPressOut={() => { scale.value = withSpring(isSelected ? 1.05 : 1, { damping: 12, stiffness: 180 }); }}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      style={[styles.catCard, { width: cardWidth }, cardAnim]}
    >
      <Animated.View
        style={[
          styles.catIcon,
          isNew
            ? styles.catIconNew
            : { backgroundColor: isSelected ? palette.primary : `${catColor}15` },
          !isNew && iconAnim,
        ]}
      >
        <MaterialCommunityIcons
          name={(isNew ? 'plus' : item.icon) as never}
          color={isNew ? palette.muted : isSelected ? palette.textDark : catColor}
          size={20}
        />
      </Animated.View>
      <Animated.Text
        numberOfLines={1}
        style={[
          styles.catLabel,
          {
            color: isSelected ? palette.text : palette.muted,
            fontWeight: isSelected ? '700' : '500',
          },
          !isNew && labelAnim,
        ]}
      >
        {item.name}
      </Animated.Text>
    </AnimatedPressable>
  );
}

/* ================================================================
   SEGMENT CONTROL
   ================================================================ */
function SegmentControl({ type, onChange }: { type: Type; onChange: (t: Type) => void }) {
  const pos = useSharedValue(type === 'expense' ? 0 : 1);
  useEffect(() => { pos.value = withSpring(type === 'expense' ? 0 : 1, { damping: 18, stiffness: 200 }); }, [type, pos]);
  const pill = useAnimatedStyle(() => ({ left: `${pos.value * 50}%` as unknown as number }));

  return (
    <View style={styles.seg}>
      <Animated.View style={[styles.segPill, pill]} />
      {(['expense', 'income'] as Type[]).map((t) => (
        <Pressable key={t} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(t); }} style={styles.segBtn}>
          <Text style={[styles.segTxt, type === t && styles.segTxtOn]}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/* ================================================================
   MAIN SCREEN
   ================================================================ */
export default function AddTransactionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    editId?: string; editType?: string; editAmount?: string; editTitle?: string;
    editNote?: string; editAccountId?: string; editToAccountId?: string;
    editCategoryId?: string; editDate?: string;
  }>();

  const isEditing = Boolean(params.editId);
  const insets = useSafeAreaInsets();
  const { width: SCREEN_W } = useWindowDimensions();

  // Card width calculation: 4 columns with gaps and padding
  const GRID_PAD = 20;
  const totalGap = CARD_GAP_H * (NUM_COLS - 1);
  const cardWidth = (SCREEN_W - GRID_PAD * 2 - totalGap) / NUM_COLS;

  /* ── state ── */
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [type, setType] = useState<Type>((params.editType as Type) || 'expense');
  const [amount, setAmount] = useState(params.editAmount || '');
  const [note, setNote] = useState(params.editNote || '');
  const [accountId, setAccountId] = useState<string | undefined>(params.editAccountId || undefined);
  const [categoryId, setCategoryId] = useState<string | undefined>(params.editCategoryId || undefined);
  const [transactionDate, setTransactionDate] = useState(params.editDate ? new Date(params.editDate) : new Date());
  const [showNewCatDlg, setShowNewCatDlg] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('food');
  const [newCatColor, setNewCatColor] = useState('#F6A242');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // View mode: 'grid' = picking category, 'form' = entering details
  const [mode, setMode] = useState<'grid' | 'form'>(
    isEditing && params.editCategoryId ? 'form' : 'grid',
  );

  /* ── queries ── */
  const accounts = useAccounts();
  const categories = useCategories(type);
  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const createCategory = useCreateCategory();
  const mutation = isEditing ? update : create;

  const catList = useMemo(() => categories.data?.filter((c) => c.type === type) ?? [], [categories.data, type]);
  const selectedCat = useMemo(() => catList.find((c) => c.id === categoryId), [catList, categoryId]);

  const validAmount = Number.isFinite(Number(amount)) && Number(amount) > 0;
  const valid = validAmount && Boolean(accountId) && Boolean(categoryId);

  /* ── category items with +New appended ── */
  type CatItem = typeof catList[number] | { id: '__new__'; name: string; icon: string; type: string; color: string };
  const allCats = useMemo<CatItem[]>(
    () => [...catList, { id: '__new__', name: 'New', icon: 'plus', type, color: '' }],
    [catList, type],
  );

  // Visible categories: show INITIAL_VISIBLE unless expanded or total fits
  const needsExpand = allCats.length > INITIAL_VISIBLE;
  const visibleCats = expanded || !needsExpand ? allCats : allCats.slice(0, INITIAL_VISIBLE);

  /* ── refs ── */
  const amountRef = useRef<RNTextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  /* ── auto-select first account ── */
  useEffect(() => { if (!accountId && accounts.data?.[0]) setAccountId(accounts.data[0].id); }, [accountId, accounts.data]);
  useEffect(() => {
    if (isEditing && !categoryId && catList[0]) setCategoryId(catList[0].id);
  }, [categoryId, catList, type, isEditing]);

  /* ── reanimated for form reveal ── */
  const formOpacity = useSharedValue(mode === 'form' ? 1 : 0);
  const formSlide = useSharedValue(mode === 'form' ? 0 : 40);
  const formAnim = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateY: formSlide.value }],
  }));

  /* ── category picked → switch to form ── */
  const onCategoryPicked = useCallback((id: string) => {
    setCategoryId(id);
    setMode('form');
    formOpacity.value = withTiming(1, { duration: 260 });
    formSlide.value = withSpring(0, { damping: 22, stiffness: 200 });
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      setTimeout(() => amountRef.current?.focus(), 280);
    }, 80);
  }, [formOpacity, formSlide]);

  /* ── go back to grid ── */
  const onChangeCategory = useCallback(() => {
    formOpacity.value = withTiming(0, { duration: 150 });
    formSlide.value = withTiming(40, { duration: 150 });
    setTimeout(() => setMode('grid'), 170);
  }, [formOpacity, formSlide]);

  /* ── switch tabs ── */
  const onTabChange = useCallback((tab: Type) => {
    setType(tab);
    setCategoryId(undefined);
    setExpanded(false);
    setMode('grid');
    formOpacity.value = 0;
    formSlide.value = 40;
  }, [formOpacity, formSlide]);

  /* ── validation ── */
  const valMsg = !validAmount
    ? 'Enter an amount greater than zero.'
    : !categoryId ? 'Select a category.'
    : !accountId ? 'Select an account.' : null;

  const reqErr = mutation.error
    ? isAxiosError(mutation.error)
      ? mutation.error.response?.data?.message ?? mutation.error.message
      : 'Could not save this transaction.'
    : null;

  /* ── save ── */
  const save = async () => {
    if (!valid || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const title = catList.find((c) => c.id === categoryId)?.name || (type === 'expense' ? 'Expense' : 'Income');
      const body = {
        type, amount: Number(amount), title,
        note: note.trim() || undefined,
        transactionDate: transactionDate.toISOString(),
        accountId, categoryId,
      };
      if (isEditing) await update.mutateAsync({ id: params.editId!, ...body });
      else await create.mutateAsync(body);
      router.back();
    } catch { setIsSubmitting(false); }
  };

  /* ── create category ── */
  const handleCreateCat = async () => {
    if (!newCatName.trim()) return;
    try {
      const cat = await createCategory.mutateAsync({ name: newCatName.trim(), icon: newCatIcon, color: newCatColor, type });
      setNewCatName('');
      setShowNewCatDlg(false);
      onCategoryPicked(cat.id);
    } catch (e) { console.error(e); }
  };

  const selColor = selectedCat ? getCategoryColor(selectedCat.id) : palette.primary;

  /* ── edit mode: start in form ── */
  useEffect(() => {
    if (isEditing && params.editCategoryId) {
      setMode('form');
      formOpacity.value = 1;
      formSlide.value = 0;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollInner, { paddingBottom: Math.max(28, insets.bottom + 16) }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ═══ HEADER ═══ */}
        <View style={styles.hdr}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <MaterialCommunityIcons name="close" size={20} color={palette.text} />
          </Pressable>
          <Text style={styles.hdrTitle}>{isEditing ? 'Edit Transaction' : 'Add Transaction'}</Text>
          <View style={{ width: 36 }} />
        </View>

        {accounts.isError && <HelperText type="error">Failed to load accounts</HelperText>}
        {categories.isError && <HelperText type="error">Failed to load categories</HelperText>}

        {/* ═══ SEGMENT ═══ */}
        <SegmentControl type={type} onChange={onTabChange} />

        {/* ═══ MODE: GRID ═══ */}
        {mode === 'grid' && (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(120)} style={styles.gridSection}>
            <Text style={styles.secTitle}>Select Category</Text>

            <View style={styles.gridWrap}>
              {visibleCats.map((item) => (
                <CategoryCard
                  key={item.id}
                  item={item}
                  isSelected={categoryId === item.id}
                  cardWidth={cardWidth}
                  onPress={() => {
                    if (item.id === '__new__') setShowNewCatDlg(true);
                    else onCategoryPicked(item.id);
                  }}
                />
              ))}
            </View>

            {/* View More / View Less */}
            {needsExpand && (
              <Pressable
                onPress={() => setExpanded((v) => !v)}
                style={styles.expandBtn}
              >
                <Text style={styles.expandTxt}>
                  {expanded ? 'Show Less' : `View All (${allCats.length})`}
                </Text>
                <MaterialCommunityIcons
                  name={expanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={palette.primary}
                />
              </Pressable>
            )}
          </Animated.View>
        )}

        {/* ═══ MODE: FORM ═══ */}
        {mode === 'form' && (
          <Animated.View style={[styles.formWrap, formAnim]}>

            {/* Selected Category Card */}
            {selectedCat && (
              <View style={styles.selCard}>
                <View style={styles.selCardLeft}>
                  <View style={[styles.selCardIcon, { backgroundColor: `${selColor}20` }]}>
                    <MaterialCommunityIcons name={selectedCat.icon as never} color={selColor} size={20} />
                  </View>
                  <View>
                    <Text style={styles.selCardName} numberOfLines={1}>{selectedCat.name}</Text>
                    <Text style={styles.selCardType}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
                  </View>
                </View>
                <Pressable onPress={onChangeCategory} style={styles.changeBtn} hitSlop={8}>
                  <MaterialCommunityIcons name="swap-horizontal" size={14} color={palette.primary} />
                  <Text style={styles.changeTxt}>Change</Text>
                </Pressable>
              </View>
            )}

            {/* Amount — hero input */}
            <Text style={styles.fieldLbl}>AMOUNT</Text>
            <View style={styles.amtRow}>
              <Text style={styles.amtCur}>₹</Text>
              <RNTextInput
                ref={amountRef}
                style={styles.amtInput}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={`${palette.muted}40`}
                selectionColor={palette.primary}
                cursorColor={palette.primary}
              />
            </View>
            <View style={styles.amtLine} />

            {/* Account */}
            <Text style={[styles.fieldLbl, { marginTop: 20 }]}>ACCOUNT</Text>
            <View style={styles.chips}>
              {accounts.data?.map((acc) => (
                <Chip
                  key={acc.id}
                  selected={accountId === acc.id}
                  onPress={() => setAccountId(acc.id)}
                  style={[styles.chip, accountId === acc.id && styles.chipOn]}
                  textStyle={[styles.chipTxt, accountId === acc.id && styles.chipTxtOn]}
                  selectedColor={palette.textDark}
                >
                  {acc.name}
                </Chip>
              ))}
            </View>

            {/* Note */}
            <TextInput
              mode="outlined"
              label="Note (optional)"
              value={note}
              onChangeText={setNote}
              multiline
              style={styles.formInput}
              outlineColor={palette.border}
              activeOutlineColor={palette.primary}
              textColor={palette.text}
              theme={{ colors: { onSurfaceVariant: palette.muted, surfaceVariant: 'transparent' } }}
            />

            {/* Date */}
            <Pressable onPress={() => setShowDatePicker(true)}>
              <TextInput
                mode="outlined"
                label="Date"
                value={transactionDate.toLocaleDateString('en-IN')}
                editable={false}
                left={<TextInput.Icon icon="calendar" color={palette.primary} />}
                style={styles.formInput}
                pointerEvents="none"
                outlineColor={palette.border}
                activeOutlineColor={palette.primary}
                textColor={palette.text}
                theme={{ colors: { onSurfaceVariant: palette.muted, surfaceVariant: 'transparent' } }}
              />
            </Pressable>
            <CustomDatePicker
              visible={showDatePicker}
              value={transactionDate}
              onDismiss={() => setShowDatePicker(false)}
              onChange={(d) => setTransactionDate(d)}
            />

            {/* Validation */}
            {!valid && valMsg ? <HelperText type="info">{valMsg}</HelperText> : null}
            {reqErr ? <HelperText type="error">{reqErr}</HelperText> : null}

            {/* Save */}
            <Button
              mode="contained"
              style={styles.saveBtn}
              contentStyle={styles.saveBtnInner}
              labelStyle={styles.saveBtnTxt}
              buttonColor={palette.primary}
              textColor={palette.textDark}
              disabled={!valid || mutation.isPending || isSubmitting}
              loading={mutation.isPending}
              onPress={save}
            >
              {isEditing ? 'Update Transaction' : 'Save Transaction'}
            </Button>
          </Animated.View>
        )}
      </ScrollView>

      {/* ═══ NEW CATEGORY DIALOG ═══ */}
      <Portal>
        <Dialog visible={showNewCatDlg} onDismiss={() => setShowNewCatDlg(false)} style={styles.dlg}>
          <Dialog.Title style={styles.dlgTitle}>New Category</Dialog.Title>
          <Dialog.Content style={styles.dlgBody}>
            <TextInput
              label="Category Name" mode="outlined" value={newCatName} onChangeText={setNewCatName}
              style={styles.dlgInput} outlineColor={palette.border} activeOutlineColor={palette.primary}
              textColor={palette.text} theme={{ colors: { onSurfaceVariant: palette.muted, surfaceVariant: 'transparent' } }}
            />
            <Text style={styles.dlgSub}>Icon</Text>
            <ScrollView style={styles.iconScroll} contentContainerStyle={styles.iconWrap} showsVerticalScrollIndicator={false} nestedScrollEnabled>
              {AVAILABLE_ICONS.map((ic) => {
                const on = newCatIcon === ic;
                return (
                  <Pressable key={ic} onPress={() => setNewCatIcon(ic)}
                    style={[styles.dlgIconBtn, on && { backgroundColor: palette.primary, borderColor: palette.primary }]}>
                    <MaterialCommunityIcons name={ic as never} size={18} color={on ? palette.textDark : palette.text} />
                  </Pressable>
                );
              })}
            </ScrollView>
            <Text style={[styles.dlgSub, { marginTop: 12 }]}>Color</Text>
            <View style={styles.colorRow}>
              {AVAILABLE_COLORS.map((c) => (
                <Pressable key={c} onPress={() => setNewCatColor(c)}
                  style={[styles.dlgClr, { backgroundColor: c }, newCatColor === c && styles.dlgClrOn]} />
              ))}
            </View>
          </Dialog.Content>
          <View style={styles.dlgActs}>
            <Button textColor={palette.muted} onPress={() => setShowNewCatDlg(false)} labelStyle={styles.dlgActTxt}>Cancel</Button>
            <Button mode="contained" buttonColor={palette.primary} textColor={palette.textDark}
              onPress={handleCreateCat} disabled={!newCatName.trim() || createCategory.isPending}
              loading={createCategory.isPending} labelStyle={styles.dlgActTxt}>
              Create
            </Button>
          </View>
        </Dialog>
      </Portal>
    </KeyboardAvoidingView>
  );
}

/* ================================================================
   STYLES
   ================================================================ */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.background },
  scroll: { flex: 1 },
  scrollInner: { flexGrow: 1 },

  // Header
  hdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.surface, justifyContent: 'center', alignItems: 'center' },
  hdrTitle: { fontSize: 18, fontWeight: '700', color: palette.text, letterSpacing: 0.2 },

  // Segment
  seg: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 14, backgroundColor: palette.surface, borderRadius: 12, padding: 3, position: 'relative', height: 42 },
  segPill: { position: 'absolute', top: 3, width: '50%', height: 36, borderRadius: 10, backgroundColor: palette.primary },
  segBtn: { flex: 1, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  segTxt: { fontSize: 14, fontWeight: '600', color: palette.muted },
  segTxtOn: { color: palette.textDark, fontWeight: '700' },

  // Grid section
  gridSection: { flex: 1 },
  secTitle: { fontSize: 15, fontWeight: '700', color: palette.text, paddingHorizontal: 20, marginBottom: 8 },

  // Category grid — 4 columns with controlled gaps
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    columnGap: CARD_GAP_H,
    rowGap: CARD_GAP_V,
  },

  // Category card
  catCard: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  catIcon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catIconNew: {
    backgroundColor: 'transparent',
    borderColor: palette.border,
    borderStyle: 'dashed' as const,
    borderWidth: 1.5,
  },
  catLabel: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    width: '100%',
    paddingHorizontal: 1,
  },

  // Expand button
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    marginTop: 4,
  },
  expandTxt: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.primary,
  },

  // Form wrapper
  formWrap: { paddingHorizontal: 20, paddingTop: 2 },

  // Selected category card
  selCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.surface,
    borderRadius: 14,
    padding: 10,
    paddingHorizontal: 12,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: palette.border,
  },
  selCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  selCardIcon: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  selCardName: { fontSize: 15, fontWeight: '700', color: palette.text },
  selCardType: { fontSize: 11, color: palette.muted, marginTop: 1 },
  changeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${palette.primary}15`, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  changeTxt: { fontSize: 12, fontWeight: '600', color: palette.primary },

  // Amount hero
  fieldLbl: { fontSize: 11, fontWeight: '700', color: palette.muted, letterSpacing: 1, marginBottom: 4 },
  amtRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  amtCur: { fontSize: 32, fontWeight: '700', color: palette.primary },
  amtInput: { flex: 1, fontSize: 36, fontWeight: '700', color: palette.text, paddingVertical: 2 },
  amtLine: { height: 2, backgroundColor: palette.primary, borderRadius: 1, marginBottom: 2, opacity: 0.35 },

  // Chips
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1 },
  chipOn: { backgroundColor: palette.primary, borderColor: palette.primary },
  chipTxt: { color: palette.muted, fontSize: 13, fontWeight: '500' },
  chipTxtOn: { color: palette.textDark, fontWeight: '600' },

  // Form inputs
  formInput: { marginBottom: 8, backgroundColor: 'transparent' },

  // Save
  saveBtn: { marginTop: 14, borderRadius: 14, elevation: 4, shadowColor: palette.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  saveBtnInner: { height: 48 },
  saveBtnTxt: { fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },

  // Dialog
  dlg: { backgroundColor: palette.surfaceElevated, borderRadius: 20, maxHeight: '72%' },
  dlgTitle: { color: palette.text, fontWeight: '700', fontSize: 18 },
  dlgBody: { paddingBottom: 0 },
  dlgInput: { marginBottom: 12, backgroundColor: 'transparent' },
  dlgSub: { color: palette.text, fontWeight: '600', fontSize: 13, marginBottom: 8 },
  iconScroll: { maxHeight: 125 },
  iconWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 4 },
  dlgIconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.surface, borderWidth: 1.5, borderColor: palette.border, justifyContent: 'center', alignItems: 'center' },
  colorRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 8 },
  dlgClr: { width: 28, height: 28, borderRadius: 14, borderWidth: 2.5, borderColor: 'transparent' },
  dlgClrOn: { borderColor: palette.text },
  dlgActs: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 14, paddingTop: 6, gap: 8 },
  dlgActTxt: { fontSize: 14, fontWeight: '600' },
});
