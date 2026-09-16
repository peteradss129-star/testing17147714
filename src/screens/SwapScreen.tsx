import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { ethers } from 'ethers';
import { useWallet } from '../context/WalletContext';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { CHAINS, MAINNET_CHAIN_LIST, ChainKey } from '../lib/chains';
import { getTokensForChain, StoredToken } from '../lib/tokenStorage';
import * as chainService from '../lib/chainService';
import * as swap from '../lib/swap';
import { checkPin } from '../lib/pinAuth';

const NATIVE_ASSET = 'native';
const SLIPPAGE_OPTIONS = [10, 50, 100]; // basis points: 0.1%, 0.5%, 1%
const SWAP_CHAINS = MAINNET_CHAIN_LIST.filter((c) => swap.isSwapSupported(c.key));

export default function SwapScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { mnemonic } = useWallet();

  const [chain, setChain] = useState<ChainKey>(SWAP_CHAINS[0].key);
  const [tokens, setTokens] = useState<StoredToken[]>([]);
  const [fromAsset, setFromAsset] = useState<string>(NATIVE_ASSET);
  const [toAsset, setToAsset] = useState<string>('');
  const [amountIn, setAmountIn] = useState('');
  const [slippageBps, setSlippageBps] = useState(50);
  const [pin, setPin] = useState('');

  const [quote, setQuote] = useState<swap.SwapQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [swapping, setSwapping] = useState(false);
  const [swapStep, setSwapStep] = useState<'approving' | 'swapping' | null>(null);

  useEffect(() => {
    getTokensForChain(chain).then(setTokens);
    setFromAsset(NATIVE_ASSET);
    setToAsset('');
    setQuote(null);
  }, [chain]);

  const fromToken = tokens.find((t) => t.address === fromAsset);
  const toToken = tokens.find((t) => t.address === toAsset);
  const fromSymbol = fromToken?.symbol ?? CHAINS[chain].symbol;
  const toSymbol = toToken?.symbol ?? CHAINS[chain].symbol;
  const fromDecimals = fromToken?.decimals ?? 18;
  const toDecimals = toToken?.decimals ?? 18;
  const assetOptions = [{ address: NATIVE_ASSET, symbol: CHAINS[chain].symbol }, ...tokens];

  const fetchQuote = useCallback(async () => {
    setQuoteError(null);
    setQuote(null);
    if (!toAsset || fromAsset === toAsset || !amountIn || Number(amountIn) <= 0) return;
    setQuoting(true);
    try {
      const amountInWei = ethers.parseUnits(amountIn, fromDecimals);
      const result = await swap.getSwapQuote(
        chain,
        fromToken?.address ?? null,
        toToken?.address ?? null,
        amountInWei
      );
      setQuote(result);
    } catch (e: any) {
      setQuoteError(e?.message ?? 'Could not fetch a quote for this pair');
    } finally {
      setQuoting(false);
    }
  }, [chain, fromAsset, toAsset, amountIn, fromDecimals, fromToken, toToken]);

  useEffect(() => {
    const timeout = setTimeout(fetchQuote, 500);
    return () => clearTimeout(timeout);
  }, [fetchQuote]);

  const handleFlip = () => {
    if (!toAsset) return;
    setFromAsset(toAsset);
    setToAsset(fromAsset);
    setAmountIn('');
    setQuote(null);
  };

  const handleSwap = async () => {
    if (!mnemonic || !quote || !toAsset) return;
    const pinResult = await checkPin(pin);
    if (!pinResult.ok) {
      Alert.alert('PIN check failed', pinResult.message ?? 'Incorrect PIN');
      return;
    }

    const amountOutFormatted = ethers.formatUnits(quote.amountOut, toDecimals);
    const amountOutMin = (quote.amountOut * BigInt(10000 - slippageBps)) / 10000n;
    const minFormatted = ethers.formatUnits(amountOutMin, toDecimals);
    const impact = quote.priceImpactPercent;
    const impactNote = impact !== null ? `\nPrice impact: ${impact.toFixed(2)}%` : '';
    const isHighImpact = impact !== null && impact > 10;

    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        isHighImpact ? '⚠️ Very high price impact' : 'Confirm swap',
        `Pay ${amountIn} ${fromSymbol}\nReceive ~${Number(amountOutFormatted).toFixed(6)} ${toSymbol}` +
          `\nMinimum received: ${Number(minFormatted).toFixed(6)} ${toSymbol}${impactNote}` +
          `\nvia ${swap.getDexConfig(chain).name}` +
          (isHighImpact
            ? `\n\nThis pool has very little liquidity for this trade size. You may lose a large % of your funds to slippage.`
            : ''),
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          {
            text: isHighImpact ? 'Swap anyway' : 'Confirm & Swap',
            style: isHighImpact ? 'destructive' : 'default',
            onPress: () => resolve(true),
          },
        ]
      );
    });
    if (!confirmed) return;

    setSwapping(true);
    try {
      const amountInWei = ethers.parseUnits(amountIn, fromDecimals);

      if (fromToken) {
        const owner = chainService.deriveAddress(mnemonic, CHAINS[chain]);
        const allowance = await swap.getSwapAllowance(chain, fromToken.address, owner);
        if (allowance < amountInWei) {
          setSwapStep('approving');
          await swap.approveTokenForSwap(mnemonic, chain, fromToken.address, amountInWei);
        }
      }

      setSwapStep('swapping');
      const result = await swap.executeSwap(
        mnemonic,
        chain,
        fromToken?.address ?? null,
        toToken?.address ?? null,
        amountInWei,
        amountOutMin,
        quote.path
      );

      Alert.alert('Swap sent', `Hash: ${result.hash}`, [
        { text: 'View on explorer', onPress: () => Linking.openURL(CHAINS[chain].explorerTxUrl(result.hash)) },
        { text: 'OK' },
      ]);
      setAmountIn('');
      setPin('');
      setQuote(null);
    } catch (e: any) {
      Alert.alert('Swap failed', e?.message ?? 'Unknown error');
    } finally {
      setSwapping(false);
      setSwapStep(null);
    }
  };

  const amountOutDisplay = quote ? Number(ethers.formatUnits(quote.amountOut, toDecimals)).toFixed(6) : '';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Swap</Text>
        <Text style={styles.subtitle}>Mainnet only — swap needs real on-chain liquidity.</Text>

        <Text style={styles.label}>Network</Text>
        <View style={styles.chainSelector}>
          {SWAP_CHAINS.map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[styles.chainOption, chain === c.key && styles.chainOptionActive]}
              onPress={() => setChain(c.key)}
            >
              <View style={[styles.chainDot, { backgroundColor: c.color }]} />
              <Text style={styles.chainOptionText}>{c.symbol}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>You pay</Text>
        <View style={styles.assetSelector}>
          {assetOptions.map((a) => (
            <TouchableOpacity
              key={a.address}
              style={[styles.assetOption, fromAsset === a.address && styles.assetOptionActive]}
              onPress={() => setFromAsset(a.address)}
            >
              <Text style={styles.assetOptionText}>{a.symbol}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.input}
          value={amountIn}
          onChangeText={setAmountIn}
          placeholder="0.0"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
        />

        <TouchableOpacity style={styles.flipButton} onPress={handleFlip} disabled={!toAsset}>
          <Text style={styles.flipButtonText}>⇅ Flip</Text>
        </TouchableOpacity>

        <Text style={styles.label}>You receive</Text>
        <View style={styles.assetSelector}>
          {assetOptions
            .filter((a) => a.address !== fromAsset)
            .map((a) => (
              <TouchableOpacity
                key={a.address}
                style={[styles.assetOption, toAsset === a.address && styles.assetOptionActive]}
                onPress={() => setToAsset(a.address)}
              >
                <Text style={styles.assetOptionText}>{a.symbol}</Text>
              </TouchableOpacity>
            ))}
        </View>

        <View style={styles.quoteBox}>
          {quoting && <ActivityIndicator color={colors.primary} />}
          {!quoting && quoteError && <Text style={styles.errorText}>{quoteError}</Text>}
          {!quoting && !quoteError && quote && (
            <>
              <Text style={styles.quoteAmount}>
                {amountOutDisplay} {toSymbol}
              </Text>
              {quote.priceImpactPercent !== null && (
                <Text
                  style={[
                    styles.priceImpact,
                    { color: quote.priceImpactPercent > 3 ? colors.danger : colors.textSecondary },
                  ]}
                >
                  Price impact: {quote.priceImpactPercent.toFixed(2)}%
                </Text>
              )}
            </>
          )}
          {!quoting && !quoteError && !quote && (
            <Text style={styles.placeholderText}>Enter an amount and pick both assets to see a quote</Text>
          )}
        </View>

        <Text style={styles.label}>Slippage tolerance</Text>
        <View style={styles.chainSelector}>
          {SLIPPAGE_OPTIONS.map((bps) => (
            <TouchableOpacity
              key={bps}
              style={[styles.chainOption, slippageBps === bps && styles.chainOptionActive]}
              onPress={() => setSlippageBps(bps)}
            >
              <Text style={styles.chainOptionText}>{(bps / 100).toFixed(1)}%</Text>
            </TouchableOpacity>
          ))}
        </View>

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

        <TouchableOpacity
          style={[styles.button, (!quote || swapping) && styles.disabledButton]}
          disabled={!quote || swapping}
          onPress={handleSwap}
        >
          <Text style={styles.buttonText}>
            {swapStep === 'approving' ? 'Approving...' : swapStep === 'swapping' ? 'Swapping...' : 'Swap'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: 24 },
    title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
    subtitle: { fontSize: 12, color: colors.textMuted, marginBottom: 24 },
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
    assetSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
    assetOption: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    assetOptionActive: { borderColor: colors.primary },
    assetOptionText: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
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
    flipButton: { alignSelf: 'center', marginBottom: 16 },
    flipButtonText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
    quoteBox: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      minHeight: 60,
      justifyContent: 'center',
    },
    quoteAmount: { color: colors.textPrimary, fontSize: 20, fontWeight: '700' },
    priceImpact: { fontSize: 12, marginTop: 4 },
    placeholderText: { color: colors.textMuted, fontSize: 13 },
    errorText: { color: colors.danger, fontSize: 13, lineHeight: 18 },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 12,
    },
    disabledButton: { opacity: 0.4 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  });
}
