import React, { useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { isValidMnemonic } from '../lib/wallet';

type Props = NativeStackScreenProps<RootStackParamList, 'ImportWallet'>;

export default function ImportWalletScreen({ navigation }: Props) {
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
        placeholderTextColor="#5A6172"
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E17', padding: 24 },
  title: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#9AA3B2', marginBottom: 24 },
  input: {
    backgroundColor: '#151A26',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2F3D',
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#627EEA',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
