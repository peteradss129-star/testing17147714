import React, { useEffect, useRef, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { useWallet } from '../context/WalletContext';
import { isBiometricAvailable } from '../lib/biometrics';

export default function UnlockScreen() {
  const { unlock, unlockWithBiometrics } = useWallet();
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const triedBiometricOnMount = useRef(false);

  useEffect(() => {
    (async () => {
      const available = await isBiometricAvailable();
      setBiometricAvailable(available);
      if (available && !triedBiometricOnMount.current) {
        triedBiometricOnMount.current = true;
        await unlockWithBiometrics();
      }
    })();
  }, [unlockWithBiometrics]);

  const handleUnlock = async () => {
    setSubmitting(true);
    try {
      const result = await unlock(pin);
      if (!result.ok) {
        Alert.alert('Incorrect PIN', result.message ?? 'Please try again.');
        setPin('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBiometricRetry = async () => {
    await unlockWithBiometrics();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.logo}>◎</Text>
      <Text style={styles.title}>Enter your PIN</Text>

      <TextInput
        style={styles.input}
        value={pin}
        onChangeText={setPin}
        placeholder="PIN"
        placeholderTextColor="#5A6172"
        secureTextEntry
        keyboardType="number-pad"
        autoFocus
      />

      <TouchableOpacity style={styles.button} disabled={submitting} onPress={handleUnlock}>
        <Text style={styles.buttonText}>{submitting ? 'Checking...' : 'Unlock'}</Text>
      </TouchableOpacity>

      {biometricAvailable && (
        <TouchableOpacity style={styles.biometricButton} onPress={handleBiometricRetry}>
          <Text style={styles.biometricButtonText}>Use Face ID / Fingerprint</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E17', padding: 24, justifyContent: 'center' },
  logo: { fontSize: 48, color: '#627EEA', textAlign: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 24 },
  input: {
    backgroundColor: '#151A26',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2F3D',
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 4,
  },
  button: {
    backgroundColor: '#627EEA',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  biometricButton: { marginTop: 16, alignItems: 'center' },
  biometricButtonText: { color: '#627EEA', fontSize: 14, fontWeight: '600' },
});
