import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useWallet } from '../context/WalletContext';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { MAINNET_CHAIN_LIST, TESTNET_CHAIN_LIST, ChainKey } from '../lib/chains';
import * as chainService from '../lib/chainService';

type Props = NativeStackScreenProps<RootStackParamList, 'Receive'>;

export default function ReceiveScreen({ route }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { mnemonic } = useWallet();
  const isTestnet = route.params?.isTestnet ?? true;
  const chainList = isTestnet ? TESTNET_CHAIN_LIST : MAINNET_CHAIN_LIST;
  const [chainKey, setChainKey] = useState<ChainKey>(chainList[0].key);

  const chain = chainList.find((c) => c.key === chainKey)!;
  const address = mnemonic ? chainService.deriveAddress(mnemonic, chain) : null;

  const handleCopy = async () => {
    if (!address) return;
    await Clipboard.setStringAsync(address);
    Alert.alert('Copied', 'Address copied to clipboard.');
  };

  if (!address) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Receive</Text>

        <View style={styles.chainSelector}>
          {chainList.map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[styles.chainOption, chainKey === c.key && styles.chainOptionActive]}
              onPress={() => setChainKey(c.key)}
            >
              <View style={[styles.chainDot, { backgroundColor: c.color }]} />
              <Text style={styles.chainOptionText}>{c.symbol}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.subtitle}>
          {chain.family === 'evm'
            ? 'This address works across all EVM chains (Ethereum, BSC, Polygon). Only send assets on an EVM network to it.'
            : `This is your ${chain.name} address. Only send ${chain.name} assets to it.`}
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
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: 24, alignItems: 'center' },
    title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginBottom: 16, alignSelf: 'flex-start' },
    chainSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16, alignSelf: 'flex-start' },
    chainOption: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    chainOptionActive: { borderColor: colors.primary },
    chainOptionText: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
    chainDot: { width: 8, height: 8, borderRadius: 4 },
    subtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 24, alignSelf: 'flex-start', lineHeight: 18 },
    qrWrapper: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 24 },
    addressBox: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      width: '100%',
      marginBottom: 20,
    },
    addressText: { color: colors.textPrimary, fontSize: 14, textAlign: 'center' },
    copyButton: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      paddingHorizontal: 40,
    },
    copyButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  });
}
