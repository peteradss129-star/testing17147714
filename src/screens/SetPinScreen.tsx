import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useWallet } from '../context/WalletContext';
import { useTheme, ThemeColors } from '../context/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'SetPin'>;

export default function SetPinScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { mnemonic } = route.params;
  const { createWallet } = useWallet();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (pin.length < 6) {
      Alert.alert('PIN too short', 'Choose a PIN with at least 6 digits.');
      return;
    }
    if (pin !== confirmPin) {
      Alert.alert('Mismatch', 'PINs do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await createWallet(mnemonic, pin);
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to create wallet');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Set a PIN</Text>
      <Text style={styles.subtitle}>
        This PIN unlocks the app and authorizes transactions. It is not recoverable, only your
        recovery phrase can restore your wallet.
      </Text>

      <TextInput
        style={styles.input}
        value={pin}
        onChangeText={setPin}
        placeholder="Enter PIN"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        keyboardType="number-pad"
      />
      <TextInput
        style={styles.input}
        value={confirmPin}
        onChangeText={setConfirmPin}
        placeholder="Confirm PIN"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        keyboardType="number-pad"
      />

      <TouchableOpacity style={styles.button} disabled={submitting} onPress={handleSubmit}>
        <Text style={styles.buttonText}>{submitting ? 'Creating...' : 'Create wallet'}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: 24 },
    title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
    subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: 24, lineHeight: 20 },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 14,
      color: colors.textPrimary,
      fontSize: 18,
      marginBottom: 14,
      letterSpacing: 4,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 12,
    },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  });
}
