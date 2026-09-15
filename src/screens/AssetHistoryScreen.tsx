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
  const { mnemonic } = useWallet();
  const { chainKey, isTestnet, tokenAddress } = route.params;
  const chain = CHAINS[chainKey];

  const [token, setToken] = useState<StoredToken | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#fff" />}
      >
        <View style={styles.header}>
          <View style={[styles.dot, { backgroundColor: token ? '#5A6172' : chain.color }]} />
          <View>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.symbol}>{symbol}</Text>
          </View>
        </View>

        <Text style={styles.balance}>
          {balance === null ? '...' : `${Number(balance).toFixed(token ? 4 : 5)} ${symbol}`}
        </Text>

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

        {history === null && !historyError && <Text style={styles.emptyText}>Loading...</Text>}

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
                { backgroundColor: tx.direction === 'out' ? '#E5484D22' : '#3DD68C22' },
              ]}
            >
              <Text style={[styles.txDirectionText, { color: tx.direction === 'out' ? '#E5484D' : '#3DD68C' }]}>
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
            <Text style={[styles.txAmount, { color: tx.direction === 'out' ? '#E5484D' : '#3DD68C' }]}>
              {tx.direction === 'out' ? '-' : '+'}
              {Number(tx.amount).toFixed(token ? 4 : 6)} {symbol}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E17' },
  scroll: { padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  name: { color: '#fff', fontSize: 16, fontWeight: '600' },
  symbol: { color: '#9AA3B2', fontSize: 12, marginTop: 2 },
  balance: { color: '#fff', fontSize: 32, fontWeight: '700', marginTop: 12, marginBottom: 24 },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  actionButton: {
    flex: 1,
    backgroundColor: '#151A26',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2F3D',
  },
  actionButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  sectionTitle: { color: '#9AA3B2', fontSize: 13, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase' },
  errorText: { color: '#E5484D', fontSize: 13, marginBottom: 12, lineHeight: 18 },
  emptyText: { color: '#5A6172', fontSize: 13 },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151A26',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  txDirection: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  txDirectionText: { fontSize: 16, fontWeight: '700' },
  txInfo: { flex: 1 },
  txCounterparty: { color: '#fff', fontSize: 14, fontWeight: '600' },
  txDate: { color: '#9AA3B2', fontSize: 12, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '600' },
});
