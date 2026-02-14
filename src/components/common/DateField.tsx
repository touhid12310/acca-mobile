import React, { useMemo, useState } from 'react';
import { Platform, TouchableOpacity, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { TextInput } from 'react-native-paper';

type DateFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  mode?: 'flat' | 'outlined';
  style?: React.ComponentProps<typeof TextInput>['style'];
  dense?: boolean;
  disabled?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
};

const parseDateValue = (value: string): Date => {
  const normalized = (value || '').trim().slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const formatAsIsoDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function DateField({
  label,
  value,
  onChange,
  placeholder = 'YYYY-MM-DD',
  mode = 'outlined',
  style,
  dense,
  disabled,
  minimumDate,
  maximumDate,
}: DateFieldProps) {
  const [showPicker, setShowPicker] = useState(false);

  const pickerValue = useMemo(() => parseDateValue(value), [value]);

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (event.type === 'dismissed' || !selectedDate) {
      return;
    }

    onChange(formatAsIsoDate(selectedDate));

    if (Platform.OS === 'ios') {
      setShowPicker(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => !disabled && setShowPicker(true)}
        activeOpacity={0.8}
        disabled={disabled}
      >
        <View pointerEvents="none">
          <TextInput
            label={label}
            value={value}
            mode={mode}
            placeholder={placeholder}
            style={style}
            dense={dense}
            editable={false}
            disabled={disabled}
            right={<TextInput.Icon icon="calendar" />}
          />
        </View>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={pickerValue}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}
    </>
  );
}
