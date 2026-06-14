import React from 'react';
import { View, StyleSheet, Pressable, Text, type ViewProps, type PressableProps } from 'react-native';
import { Dialog, Portal, TextInput as PaperInput } from 'react-native-paper';
import { palette } from '@/constants/app-theme';

// 1. Themed Card Component
export function ThemedCard({ style, children, ...props }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
}

// 2. Themed Button Component
export type ThemedButtonProps = PressableProps & {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  loading?: boolean;
  style?: any;
};

export function ThemedButton({ title, variant = 'primary', loading, style, ...props }: ThemedButtonProps) {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isOutline = variant === 'outline';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        isPrimary && styles.btnPrimary,
        isSecondary && styles.btnSecondary,
        isOutline && styles.btnOutline,
        variant === 'text' && styles.btnText,
        isPrimary && styles.shadowPrimary,
        pressed && { opacity: 0.8 },
        style,
      ]}
      disabled={loading}
      {...props}
    >
      <Text
        style={[
          styles.btnLabel,
          isPrimary && styles.labelPrimary,
          isSecondary && styles.labelSecondary,
          isOutline && styles.labelOutline,
          variant === 'text' && styles.labelTxt,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

// 3. Themed Text Input Component
export type ThemedInputProps = React.ComponentProps<typeof PaperInput>;

export function ThemedInput(props: ThemedInputProps) {
  return (
    <PaperInput
      mode="outlined"
      outlineColor={palette.border}
      activeOutlineColor={palette.primary}
      textColor={palette.text}
      placeholderTextColor={palette.muted}
      theme={{
        colors: {
          onSurfaceVariant: palette.muted,
          background: palette.surface,
        },
      }}
      {...props}
    />
  );
}

// 4. Themed Header Component
export function ThemedHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

// 5. Themed Badge Component
export function ThemedBadge({ text, type = 'primary' }: { text: string; type?: 'primary' | 'secondary' | 'muted' }) {
  return (
    <View
      style={[
        styles.badge,
        type === 'primary' && { backgroundColor: `${palette.primary}22`, borderColor: palette.primary },
        type === 'secondary' && { backgroundColor: `${palette.warning}22`, borderColor: palette.warning },
        type === 'muted' && { backgroundColor: palette.surfaceAlt, borderColor: palette.border },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          type === 'primary' && { color: palette.primary },
          type === 'secondary' && { color: palette.warning },
          type === 'muted' && { color: palette.muted },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

// 6. Themed Chip Component
export function ThemedChip({
  text,
  selected,
  onPress,
  style,
}: {
  text: string;
  selected: boolean;
  onPress: () => void;
  style?: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        selected ? styles.chipSelected : styles.chipDefault,
        selected && styles.shadowPrimary,
        style,
      ]}
    >
      <Text style={[styles.chipText, selected ? styles.chipTextSelected : styles.chipTextDefault]}>
        {text}
      </Text>
    </Pressable>
  );
}

// 7. Themed Modal Component
export function ThemedModal({
  visible,
  title,
  children,
  onDismiss,
}: {
  visible: boolean;
  title: string;
  children: React.ReactNode;
  onDismiss: () => void;
}) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.modal}>
        <Dialog.Title style={styles.modalTitle}>{title}</Dialog.Title>
        <Dialog.Content>{children}</Dialog.Content>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  button: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  btnPrimary: {
    backgroundColor: palette.primary,
  },
  btnSecondary: {
    backgroundColor: palette.secondary,
  },
  btnOutline: {
    borderColor: palette.border,
    backgroundColor: 'transparent',
  },
  btnText: {
    backgroundColor: 'transparent',
  },
  btnLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  labelPrimary: {
    color: palette.textDark, // Dark text on orange for contrast
  },
  labelSecondary: {
    color: palette.textDark, // Dark text on gold for contrast
  },
  labelOutline: {
    color: palette.text,
  },
  labelTxt: {
    color: palette.primary,
  },
  shadowPrimary: {
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    marginTop: 12,
    marginBottom: 22,
    gap: 4,
  },
  title: {
    fontSize: 24,
    color: palette.text,
    fontWeight: '700',
  },
  subtitle: {
    color: palette.muted,
    fontSize: 14,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    gap: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipDefault: {
    backgroundColor: palette.surface,
    borderColor: palette.border,
  },
  chipSelected: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextDefault: {
    color: palette.text,
  },
  chipTextSelected: {
    color: palette.textDark, // Dark text on primary orange chip for contrast
  },
  modal: {
    backgroundColor: palette.surfaceElevated,
    borderRadius: 20,
  },
  modalTitle: {
    fontWeight: '700',
    color: palette.text,
  },
});
