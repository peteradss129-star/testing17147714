import React from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useWallet } from '../context/WalletContext';

export default function ReceiveScreen() {
  const { address } = useWallet();

  const handleCopy = async () => {
    if (!address) return;
    await Clipboard.setStringAsync(address);
    Alert.alert('Copied', 'Address copied to clipboard.');
  };

  if (!address) return null;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Receive</Text>
      <Text style={styles.subtitle}>
        This address works across all EVM chains (Ethereum, BSC, Polygon). Only send assets on
        one of those networks to it.
      </Text>

      <View style={styles.qrWrapper}>
        <QRCode value={address} size={220} backgroundColor="#fff" color="#0B0E17" />
      </View>

      <View style={styles.addressBox}>
        <Text style={styles.addressText}>{address}</Text>
      </View>

      <TouchableOpacity style={styles.copyButton} onPress={handleCopy}>
        <Text style={styles.copyButtonText}>Copy address</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E17', padding: 24, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 8, alignSelf: 'flex-start' },
  subtitle: { fontSize: 13, color: '#9AA3B2', marginBottom: 32, alignSelf: 'flex-start', lineHeight: 18 },
  qrWrapper: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 24 },
  addressBox: {
    backgroundColor: '#151A26',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 20,
  },
  addressText: { color: '#fff', fontSize: 14, textAlign: 'center' },
  copyButton: {
    backgroundColor: '#627EEA',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
  },
  copyButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
