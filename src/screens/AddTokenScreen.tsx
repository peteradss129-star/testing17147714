import React, { useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { CHAINS, MAINNET_CHAIN_LIST, TESTNET_CHAIN_LIST, ChainKey } from '../lib/chains';
import * as chainService from '../lib/chainService';
import { addStoredToken } from '../lib/tokenStorage';
import { useTheme, ThemeColors } from '../context/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'AddToken'>;

export default function AddTokenScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const isTestnet = route.params?.isTestnet ?? true;
  const chainList = (isTestnet ? TESTNET_CHAIN_LIST : MAINNET_CHAIN_LIST).filter(chainService.chainSupportsTokens);
  const [chain, setChain] = useState<ChainKey>(route.params?.defaultChain ?? chainList[0].key);
  const [address, setAddress] = useState('');
  const [metadata, setMetadata] = useState<chainService.TokenMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleFetch = async () => {
    setMetadata(null);
    setLoading(true);
    try {
      const meta = await chainService.fetchTokenMetadata(CHAINS[chain], address.trim());
      setMetadata(meta);
    } catch (e: any) {
      Alert.alert('Could not load token', e?.message ?? 'Check the contract address and network.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!metadata) return;
    setSaving(true);
    try {
      await addStoredToken({ ...metadata, chain });
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Add custom token</Text>
      <Text style={styles.subtitle}>
        Paste a token contract address (ERC-20 or TRC-20) and we'll look up its symbol, name, and
        decimals directly from the chain.
      </Text>

      <Text style={styles.label}>Network</Text>
      <View style={styles.chainSelector}>
        {chainList.map((c) => (
          <TouchableOpacity
            key={c.key}
            style={[styles.chainOption, chain === c.key && styles.chainOptionActive]}
            onPress={() => {
              setChain(c.key);
              setMetadata(null);
            }}
          >
            <View style={[styles.chainDot, { backgroundColor: c.color }]} />
            <Text style={styles.chainOptionText}>{c.symbol}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Contract address</Text>
      <TextInput
        style={styles.input}
        value={address}
        onChangeText={(text) => {
          setAddress(text);
          setMetadata(null);
        }}
        placeholder={CHAINS[chain].family === 'tron' ? 'T...' : '0x...'}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <TouchableOpacity style={styles.secondaryButton} disabled={loading || !address} onPress={handleFetch}>
        <Text style={styles.secondaryButtonText}>{loading ? 'Looking up...' : 'Look up token'}</Text>
      </TouchableOpacity>

      {metadata && (
        <View style={styles.metaCard}>
          <Text style={styles.metaName}>
            {metadata.name} ({metadata.symbol})
          </Text>
          <Text style={styles.metaDetail}>{metadata.decimals} decimals</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, !metadata && styles.disabledButton]}
        disabled={!metadata || saving}
        onPress={handleSave}
      >
        <Text style={styles.buttonText}>{saving ? 'Adding...' : 'Add token'}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: 24 },
    title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
    subtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 24, lineHeight: 18 },
    label: { color: colors.textSecondary, fontSize: 13, marginBottom: 8 },
    chainSelector: { flexDirection: 'row', gap: 10, marginBottom: 20 },
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
    input: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.textPrimary,
      fontSize: 16,
      marginBottom: 16,
    },
    secondaryButton: {
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      marginBottom: 20,
    },
    secondaryButtonText: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
    metaCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    metaName: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
    metaDetail: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
    },
    disabledButton: { opacity: 0.4 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  });
}
