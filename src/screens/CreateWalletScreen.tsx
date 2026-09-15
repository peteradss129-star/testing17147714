import React, { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { generateMnemonic } from '../lib/wallet';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateWallet'>;

export default function CreateWalletScreen({ navigation }: Props) {
  const [mnemonic] = useState(() => generateMnemonic());
  const [revealed, setRevealed] = useState(false);
  const words = mnemonic.split(' ');

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(mnemonic);
    Alert.alert('Copied', 'Recovery phrase copied to clipboard.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Your recovery phrase</Text>
        <Text style={styles.warning}>
          Write these 12 words down in order and store them somewhere safe. Anyone with this
          phrase can access your funds. Never share it or type it into a website.
        </Text>

        {!revealed ? (
          <TouchableOpacity style={styles.revealBox} onPress={() => setRevealed(true)}>
            <Text style={styles.revealText}>Tap to reveal</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.grid}>
            {words.map((word, i) => (
              <View key={i} style={styles.wordChip}>
                <Text style={styles.wordIndex}>{i + 1}</Text>
                <Text style={styles.wordText}>{word}</Text>
              </View>
            ))}
          </View>
        )}

        {revealed && (
          <TouchableOpacity style={styles.copyButton} onPress={copyToClipboard}>
            <Text style={styles.copyButtonText}>Copy to clipboard</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.continueButton, !revealed && styles.disabledButton]}
        disabled={!revealed}
        onPress={() => navigation.navigate('ConfirmMnemonic', { mnemonic })}
      >
        <Text style={styles.continueButtonText}>I've saved it, continue</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E17' },
  scroll: { padding: 24 },
  title: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 12 },
  warning: { fontSize: 14, color: '#F0B90B', marginBottom: 24, lineHeight: 20 },
  revealBox: {
    height: 180,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2F3D',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#151A26',
  },
  revealText: { color: '#9AA3B2', fontSize: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  wordChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151A26',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    width: '47%',
    gap: 8,
  },
  wordIndex: { color: '#627EEA', fontSize: 12, width: 16 },
  wordText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  copyButton: { marginTop: 20, alignSelf: 'center' },
  copyButtonText: { color: '#627EEA', fontSize: 15, fontWeight: '600' },
  continueButton: {
    backgroundColor: '#627EEA',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    margin: 24,
  },
  disabledButton: { opacity: 0.4 },
  continueButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
