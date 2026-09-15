import React, { useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { isValidMnemonic } from '../lib/wallet';
import { useTheme, ThemeColors } from '../context/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'ImportWallet'>;

export default function ImportWalletScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [input, setInput] = useState('');

  const handleContinue = () => {
    const trimmed = input.trim().replace(/\s+/g, ' ');
    if (!isValidMnemonic(trimmed)) {
      Alert.alert('Invalid recovery phrase', 'Please check your 12 or 24 word phrase and try again.');
      return;
    }
    navigation.navigate('SetPin', { mnemonic: trimmed });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Import wallet</Text>
      <Text style={styles.subtitle}>Enter your 12 or 24 word recovery phrase, separated by spaces.</Text>

      <TextInput
        style={styles.input}
        value={input}
        onChangeText={setInput}
        placeholder="word1 word2 word3 ..."
        placeholderTextColor={colors.textMuted}
        multiline
        numberOfLines={4}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <TouchableOpacity style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: 24 },
    title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
    subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 24 },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 14,
      color: colors.textPrimary,
      fontSize: 16,
      minHeight: 120,
      textAlignVertical: 'top',
      marginBottom: 24,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
    },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  });
}
