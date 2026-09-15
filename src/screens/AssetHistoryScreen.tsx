import React, { useCallback, useState } from 'react';
import {
  Linking,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useWallet } from '../context/WalletContext';
import { CHAINS } from '../lib/chains';
import * as chainService from '../lib/chainService';
import { getTokensForChain, StoredToken } from '../lib/tokenStorage';
import { getNativePrices, formatFiat, PriceInfo } from '../lib/priceService';
import SkeletonBox from '../components/SkeletonBox';
import { useTheme, ThemeColors } from '../context/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'AssetHistory'>;

function formatDate(timestampSeconds: number): string {
  if (!timestampSeconds) return 'Pending';
  return new Date(timestampSeconds * 1000).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function shortAddress(address?: string): string {
  if (!address) return '';
  return address.length > 12 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;
}

export default function AssetHistoryScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { mnemonic } = useWallet();
  const { chainKey, isTestnet, tokenAddress } = route.params;
  const chain = CHAINS[chainKey];

  const [token, setToken] = useState<StoredToken | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [price, setPrice] = useState<PriceInfo | null>(null);
  const [history, setHistory] = useState<chainService.TxHistoryItem[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const symbol = token?.symbol ?? chain.symbol;
  const name = token?.name ?? chain.name;

  const fetchAll = useCallback(async () => {
    if (!mnemonic) return;
    const derivedAddress = chainService.deriveAddress(mnemonic, chain);
    setAddress(derivedAddress);

    let resolvedToken: StoredToken | null = null;
    if (tokenAddress) {
      const tokens = await getTokensForChain(chainKey);
      resolvedToken = tokens.find((t) => t.address.toLowerCase() === tokenAddress.toLowerCase()) ?? null;
      setToken(resolvedToken);
    }

    try {
      const bal = resolvedToken
        ? await chainService.getTokenBalance(chain, resolvedToken.address, derivedAddress, resolvedToken.decimals)
        : await chainService.getNativeBalance(mnemonic, chain);
      setBalance(bal);
    } catch {
      setBalance(null);
    }

    // Pricing only applies to native coins on mainnet — testnet coins and
    // custom tokens have no reliable market price here.
    if (!resolvedToken && !isTestnet) {
      try {
        const prices = await getNativePrices();
        setPrice(prices[chainKey] ?? null);
      } catch {
        setPrice(null);
      }
    } else {
      setPrice(null);
    }

    setHistoryError(null);
    try {
      const items = await chainService.getTransactionHistory(
        chain,
        derivedAddress,
        resolvedToken ? { address: resolvedToken.address, decimals: resolvedToken.decimals } : undefined
      );
      setHistory(items);
    } catch (e: any) {
      setHistory(null);
      setHistoryError(e?.message ?? 'Failed to load transaction history');
    }
  }, [mnemonic, chainKey, tokenAddress]);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.textPrimary} />
        }
      >
        <View style={styles.header}>
          <View style={[styles.dot, { backgroundColor: token ? colors.textMuted : chain.color }]} />
          <View>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.symbol}>{symbol}</Text>
          </View>
        </View>

        <View style={styles.balanceBlock}>
          {balance === null ? (
            <SkeletonBox width={160} height={32} />
          ) : (
            <>
              <Text style={styles.balance}>
                {Number(balance).toFixed(token ? 4 : 5)} {symbol}
              </Text>
              {price && (
                <Text style={styles.fiat}>
                  {formatFiat(Number(balance) * price.usd, 'usd')} · {formatFiat(Number(balance) * price.inr, 'inr')}
                </Text>
              )}
            </>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Receive', { isTestnet })}
          >
            <Text style={styles.actionButtonText}>Receive</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Send', { defaultChain: chainKey, isTestnet, tokenAddress })}
          >
            <Text style={styles.actionButtonText}>Send</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Transaction history</Text>

        {historyError && <Text style={styles.errorText}>{historyError}</Text>}

        {history === null &&
          !historyError &&
          [0, 1, 2].map((i) => (
            <View key={i} style={styles.txRow}>
              <SkeletonBox width={32} height={32} style={{ borderRadius: 16 }} />
              <View style={styles.txInfo}>
                <SkeletonBox width={120} height={14} />
                <SkeletonBox width={80} height={11} style={{ marginTop: 6 }} />
              </View>
              <SkeletonBox width={70} height={14} />
            </View>
          ))}

        {history !== null && history.length === 0 && (
          <Text style={styles.emptyText}>No transactions found for this address yet.</Text>
        )}

        {history?.map((tx) => (
          <TouchableOpacity
            key={tx.hash}
            style={styles.txRow}
            onPress={() => Linking.openURL(tx.explorerUrl)}
          >
            <View
              style={[
                styles.txDirection,
                { backgroundColor: tx.direction === 'out' ? colors.danger + '22' : colors.success + '22' },
              ]}
            >
              <Text style={[styles.txDirectionText, { color: tx.direction === 'out' ? colors.danger : colors.success }]}>
                {tx.direction === 'out' ? '↑' : '↓'}
              </Text>
            </View>
            <View style={styles.txInfo}>
              <Text style={styles.txCounterparty}>
                {tx.direction === 'out' ? 'To ' : 'From '}
                {shortAddress(tx.counterparty) || '—'}
              </Text>
              <Text style={styles.txDate}>
                {formatDate(tx.timestamp)}
                {!tx.confirmed ? ' · pending' : ''}
              </Text>
            </View>
            <Text style={[styles.txAmount, { color: tx.direction === 'out' ? colors.danger : colors.success }]}>
              {tx.direction === 'out' ? '-' : '+'}
              {Number(tx.amount).toFixed(token ? 4 : 6)} {symbol}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: 24 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
    dot: { width: 14, height: 14, borderRadius: 7 },
    name: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
    symbol: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
    balanceBlock: { marginTop: 12, marginBottom: 24 },
    balance: { color: colors.textPrimary, fontSize: 32, fontWeight: '700' },
    fiat: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
    actions: { flexDirection: 'row', gap: 12, marginBottom: 32 },
    actionButton: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionButtonText: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
    sectionTitle: { color: colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase' },
    errorText: { color: colors.danger, fontSize: 13, marginBottom: 12, lineHeight: 18 },
    emptyText: { color: colors.textMuted, fontSize: 13 },
    txRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      gap: 12,
    },
    txDirection: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    txDirectionText: { fontSize: 16, fontWeight: '700' },
    txInfo: { flex: 1 },
    txCounterparty: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
    txDate: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
    txAmount: { fontSize: 14, fontWeight: '600' },
  });
}
