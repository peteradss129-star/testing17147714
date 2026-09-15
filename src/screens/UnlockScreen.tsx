import React, { useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { useWallet } from '../context/WalletContext';

export default function UnlockScreen() {
  const { unlock } = useWallet();
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleUnlock = async () => {
    setSubmitting(true);
    try {
      const ok = await unlock(pin);
      if (!ok) {
        Alert.alert('Incorrect PIN', 'Please try again.');
        setPin('');
      }
    } finally {
      setSubmitting(false);
    }
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
});
