import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Dialog, Portal, Button, Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { palette } from '@/constants/app-theme';

export interface DialogButton {
  text: string;
  onPress?: () => void | Promise<void>;
  style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertDialogProps {
  visible: boolean;
  title: string;
  message: string;
  buttons?: DialogButton[];
  onDismiss: () => void;
}

export function CustomAlertDialog({
  visible,
  title,
  message,
  buttons = [{ text: 'OK' }],
  onDismiss,
}: CustomAlertDialogProps) {
  const cancelButton = buttons.find((btn) => btn.style === 'cancel');
  const otherButtons = buttons.filter((btn) => btn.style !== 'cancel');

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title style={styles.title}>{title}</Dialog.Title>
        <Dialog.Content>
          <Text style={styles.message}>{message}</Text>
        </Dialog.Content>
        <View style={styles.actionsContainer}>
          {cancelButton ? (
            <Button
              textColor={palette.muted}
              labelStyle={styles.btnLabel}
              onPress={async () => {
                if (cancelButton.onPress) {
                  try {
                    await cancelButton.onPress();
                  } catch (err) {
                    console.error('Error in cancel action:', err);
                  }
                }
                onDismiss();
              }}
            >
              {cancelButton.text}
            </Button>
          ) : (
            <View />
          )}
          <View style={styles.rightActions}>
            {otherButtons.map((btn, index) => {
              const isDestructive = btn.style === 'destructive';
              let textColor = palette.primary;
              if (isDestructive) textColor = palette.expense;

              return (
                <Button
                  key={index}
                  textColor={textColor}
                  labelStyle={styles.btnLabel}
                  onPress={async () => {
                    if (btn.onPress) {
                      try {
                        await btn.onPress();
                      } catch (err) {
                        console.error('Error in alert action:', err);
                      }
                    }
                    onDismiss();
                  }}
                >
                  {btn.text}
                </Button>
              );
            })}
          </View>
        </View>
      </Dialog>
    </Portal>
  );
}

export function useCustomAlert() {
  const [state, setState] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons?: DialogButton[];
  }>({ visible: false, title: '', message: '' });

  const showAlert = useCallback((title: string, message: string, buttons?: DialogButton[]) => {
    setState({ visible: true, title, message, buttons });
  }, []);

  const hideAlert = useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  const AlertComponent = useCallback(() => (
    <CustomAlertDialog
      visible={state.visible}
      title={state.title}
      message={state.message}
      buttons={state.buttons}
      onDismiss={hideAlert}
    />
  ), [state, hideAlert]);

  return { showAlert, AlertComponent };
}

interface CustomDatePickerProps {
  visible: boolean;
  value: Date;
  onDismiss: () => void;
  onChange: (date: Date) => void;
}

export function CustomDatePicker({
  visible,
  value,
  onDismiss,
  onChange,
}: CustomDatePickerProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date(value));
  const [selectedDate, setSelectedDate] = useState(() => new Date(value));

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    if (month === 0) {
      setCurrentDate(new Date(year - 1, 11, 1));
    } else {
      setCurrentDate(new Date(year, month - 1, 1));
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      setCurrentDate(new Date(year + 1, 0, 1));
    } else {
      setCurrentDate(new Date(year, month + 1, 1));
    }
  };

  const handleSelectDay = (day: number) => {
    setSelectedDate(new Date(year, month, day));
  };

  const handleConfirm = () => {
    onChange(selectedDate);
    onDismiss();
  };

  const gridItems = [];
  for (let i = 0; i < firstDayIndex; i++) {
    gridItems.push(<View key={`pad-${i}`} style={styles.dayCellEmpty} />);
  }

  const today = new Date();
  for (let day = 1; day <= daysInMonth; day++) {
    const isSelected =
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === month &&
      selectedDate.getFullYear() === year;
    const isToday =
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year;

    gridItems.push(
      <Pressable
        key={`day-${day}`}
        style={[
          styles.dayCell,
          isSelected && styles.dayCellSelected,
          isToday && !isSelected && styles.dayCellToday,
        ]}
        onPress={() => handleSelectDay(day)}
      >
        <Text
          style={[
            styles.dayText,
            isSelected && styles.dayTextSelected,
            isToday && !isSelected && styles.dayTextToday,
          ]}
        >
          {day}
        </Text>
      </Pressable>
    );
  }

  const rows = [];
  let row: React.ReactNode[] = [];
  for (let i = 0; i < gridItems.length; i++) {
    row.push(gridItems[i]);
    if (row.length === 7 || i === gridItems.length - 1) {
      while (row.length < 7) {
        row.push(<View key={`pad-end-${row.length}`} style={styles.dayCellEmpty} />);
      }
      rows.push(
        <View key={`row-${rows.length}`} style={styles.gridRow}>
          {row}
        </View>
      );
      row = [];
    }
  }

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title style={styles.title}>Select Date</Dialog.Title>
        <Dialog.Content style={styles.content}>
          {/* Month navigation */}
          <View style={styles.navHeader}>
            <Pressable onPress={handlePrevMonth} style={styles.navButton}>
              <MaterialCommunityIcons name="chevron-left" size={24} color={palette.text} />
            </Pressable>
            <Text style={styles.monthYearText}>
              {monthNames[month]} {year}
            </Text>
            <Pressable onPress={handleNextMonth} style={styles.navButton}>
              <MaterialCommunityIcons name="chevron-right" size={24} color={palette.text} />
            </Pressable>
          </View>

          {/* Weekday headers */}
          <View style={styles.weekDaysRow}>
            {weekDays.map((wd, index) => (
              <View key={wd + index} style={styles.weekDayCell}>
                <Text style={styles.weekDayText}>{wd}</Text>
              </View>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.calendarGrid}>
            {rows}
          </View>
        </Dialog.Content>

        {/* Actions */}
        <View style={styles.actions}>
          <Button onPress={onDismiss} textColor={palette.muted} labelStyle={styles.btnLabel}>
            Cancel
          </Button>
          <Button onPress={handleConfirm} textColor={palette.primary} labelStyle={styles.btnLabel}>
            OK
          </Button>
        </View>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    backgroundColor: palette.surfaceElevated,
    borderRadius: 20,
    maxHeight: '90%',
  },
  title: {
    fontWeight: '700',
    color: palette.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  message: {
    color: palette.text,
    fontSize: 15,
    lineHeight: 22,
  },
  content: {
    paddingHorizontal: 8,
    paddingBottom: 0,
  },
  navHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: palette.surfaceAlt,
  },
  monthYearText: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.text,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.muted,
  },
  calendarGrid: {
    gap: 4,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    margin: 2,
  },
  dayCellEmpty: {
    flex: 1,
    aspectRatio: 1,
    margin: 2,
  },
  dayCellSelected: {
    backgroundColor: palette.primary,
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: palette.primary,
  },
  dayText: {
    fontSize: 14,
    color: palette.text,
    fontWeight: '500',
  },
  dayTextSelected: {
    color: palette.textDark,
    fontWeight: '700',
  },
  dayTextToday: {
    color: palette.primary,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});
