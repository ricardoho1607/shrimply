import React from 'react';
import {
  Text, TextInput,
  View
} from 'react-native';
import { styles } from './pondManagementStyles';

export const InputField = React.memo(function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  hint,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad';
  hint?: string;
  maxLength?: number;
}) {
  return (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        maxLength={maxLength}
        style={styles.input}
        placeholderTextColor="#6b8aa0"
      />
      {hint && <Text style={styles.inputHint}>{hint}</Text>}
    </View>
  );
});
