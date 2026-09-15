import React, { useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useWallet } from '../context/WalletContext';

type Props = NativeStackScreenProps<RootStackParamList, 'SetPin'>;

export default function SetPinScreen({ route, navigation }: Props) {
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
        placeholderTextColor="#5A6172"
        secureTextEntry
        keyboardType="number-pad"
      />
      <TextInput
        style={styles.input}
        value={confirmPin}
        onChangeText={setConfirmPin}
        placeholder="Confirm PIN"
        placeholderTextColor="#5A6172"
        secureTextEntry
        keyboardType="number-pad"
      />

      <TouchableOpacity style={styles.button} disabled={submitting} onPress={handleSubmit}>
        <Text style={styles.buttonText}>{submitting ? 'Creating...' : 'Create wallet'}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E17', padding: 24 },
  title: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#9AA3B2', marginBottom: 24, lineHeight: 20 },
  input: {
    backgroundColor: '#151A26',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2F3D',
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 18,
    marginBottom: 14,
    letterSpacing: 4,
  },
  button: {
    backgroundColor: '#627EEA',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
