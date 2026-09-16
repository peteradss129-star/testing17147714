import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useWallet } from '../context/WalletContext';
import { MAINNET_CHAIN_LIST, TESTNET_CHAIN_LIST, CHAINS, ChainKey } from '../lib/chains';
import * as chainService from '../lib/chainService';
import { getTokensForChain, StoredToken } from '../lib/tokenStorage';
import { checkPin } from '../lib/pinAuth';
import { useTheme, ThemeColors } from '../context/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Send'>;

const NATIVE_ASSET = 'native';

export default function SendScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { mnemonic } = useWallet();
  const isTestnet = route.params?.isTestnet ?? true;
  const chainList = isTestnet ? TESTNET_CHAIN_LIST : MAINNET_CHAIN_LIST;
  const [chain, setChain] = useState<ChainKey>(route.params?.defaultChain ?? chainList[0].key);
  const [tokens, setTokens] = useState<StoredToken[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<string>(route.params?.tokenAddress ?? NATIVE_ASSET);
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getTokensForChain(chain).then(setTokens);
  }, [chain]);

  useEffect(() => {
    if (route.params?.scannedAddress) {
      setToAddress(route.params.scannedAddress);
      navigation.setParams({ scannedAddress: undefined });
    }
  }, [route.params?.scannedAddress]);

  const handleChainChange = (newChain: ChainKey) => {
    setChain(newChain);
    setSelectedAsset(NATIVE_ASSET);
  };

  const selectedToken = tokens.find((t) => t.address === selectedAsset);
  const assetSymbol = selectedToken ? selectedToken.symbol : CHAINS[chain].symbol;

  const confirmTransaction = (feeNote: string): Promise<boolean> =>
    new Promise((resolve) => {
      Alert.alert(
        'Confirm transaction',
        `Send ${amount} ${assetSymbol}\nto ${toAddress}\non ${CHAINS[chain].name}${feeNote}`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Confirm & Send', onPress: () => resolve(true) },
        ]
      );
    });

  const handleSend = async () => {
    if (!mnemonic) return;
    if (!toAddress || !amount) {
      Alert.alert('Missing fields', 'Enter a recipient address and amount.');
      return;
    }
    const pinResult = await checkPin(pin);
    if (!pinResult.ok) {
      Alert.alert('PIN check failed', pinResult.message ?? 'Incorrect PIN');
      return;
    }

    let feeNote = '\n\nA network fee will be deducted automatically.';
    try {
      const fee = await chainService.estimateFee(
        mnemonic,
        CHAINS[chain],
        toAddress.trim(),
        amount.trim(),
        selectedToken ? { address: selectedToken.address, decimals: selectedToken.decimals } : undefined
      );
      feeNote = `\n\nEstimated network fee: ~${Number(fee).toFixed(6)} ${CHAINS[chain].symbol}`;
    } catch {
      // fee estimate is best-effort; fall back to the generic note above
      // rather than blocking the send if the estimate call fails
    }

    const confirmed = await confirmTransaction(feeNote);
    if (!confirmed) return;

    setSending(true);
    try {
      const result = selectedToken
        ? await chainService.sendToken(
            mnemonic,
            CHAINS[chain],
            selectedToken.address,
            toAddress.trim(),
            amount.trim(),
            selectedToken.decimals
          )
        : await chainService.sendNative(mnemonic, CHAINS[chain], toAddress.trim(), amount.trim());
      Alert.alert('Transaction sent', `Hash: ${result.hash}`, [
        { text: 'View on explorer', onPress: () => Linking.openURL(CHAINS[chain].explorerTxUrl(result.hash)) },
        { text: 'OK' },
      ]);
      setToAddress('');
      setAmount('');
      setPin('');
    } catch (e: any) {
      Alert.alert('Transaction failed', e?.message ?? 'Unknown error');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Send</Text>

        <Text style={styles.label}>Network</Text>
        <View style={styles.chainSelector}>
          {chainList.map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[styles.chainOption, chain === c.key && styles.chainOptionActive]}
              onPress={() => handleChainChange(c.key)}
            >
              <View style={[styles.chainDot, { backgroundColor: c.color }]} />
              <Text style={styles.chainOptionText}>{c.symbol}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {tokens.length > 0 && (
          <>
            <Text style={styles.label}>Asset</Text>
            <View style={styles.chainSelector}>
              <TouchableOpacity
                style={[styles.chainOption, selectedAsset === NATIVE_ASSET && styles.chainOptionActive]}
                onPress={() => setSelectedAsset(NATIVE_ASSET)}
              >
                <Text style={styles.chainOptionText}>{CHAINS[chain].symbol}</Text>
              </TouchableOpacity>
              {tokens.map((t) => (
                <TouchableOpacity
                  key={t.address}
                  style={[styles.chainOption, selectedAsset === t.address && styles.chainOptionActive]}
                  onPress={() => setSelectedAsset(t.address)}
                >
                  <Text style={styles.chainOptionText}>{t.symbol}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {CHAINS[chain].faucetUrl && (
          <TouchableOpacity
            style={styles.faucetLink}
            onPress={() => Linking.openURL(CHAINS[chain].faucetUrl!)}
          >
            <Text style={styles.faucetLinkText}>Need test {CHAINS[chain].symbol}? Get some from a faucet →</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.label}>Recipient address</Text>
        <View style={styles.addressRow}>
          <TextInput
            style={[styles.input, styles.addressInput]}
            value={toAddress}
            onChangeText={setToAddress}
            placeholder={CHAINS[chain].family === 'bitcoin' ? 'bc1...' : CHAINS[chain].family === 'tron' ? 'T...' : '0x...'}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.scanButton} onPress={() => navigation.navigate('ScanQR')}>
            <Text style={styles.scanButtonText}>Scan</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Amount ({assetSymbol})</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.0"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Confirm with PIN</Text>
        <TextInput
          style={styles.input}
          value={pin}
          onChangeText={setPin}
          placeholder="PIN"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          keyboardType="number-pad"
        />

        <TouchableOpacity style={styles.button} disabled={sending} onPress={handleSend}>
          <Text style={styles.buttonText}>{sending ? 'Sending...' : 'Send'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: 24 },
    title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginBottom: 24 },
    label: { color: colors.textSecondary, fontSize: 13, marginBottom: 8, marginTop: 4 },
    chainSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
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
    faucetLink: { marginBottom: 16 },
    faucetLinkText: { color: colors.primary, fontSize: 13, fontWeight: '500' },
    addressRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 16 },
    addressInput: { flex: 1, marginBottom: 0 },
    scanButton: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    scanButtonText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
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
