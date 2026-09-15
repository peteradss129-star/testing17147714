import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useWallet } from '../context/WalletContext';
import { CHAIN_LIST, ChainKey } from '../lib/chains';
import { getBalance } from '../lib/wallet';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const { address, lock, resetWallet } = useWallet();
  const [balances, setBalances] = useState<Record<ChainKey, string | null>>({
    ethereum: null,
    bsc: null,
    polygon: null,
  });
  const [refreshing, setRefreshing] = useState(false);

  const fetchBalances = useCallback(async () => {
    if (!address) return;
    const results = await Promise.all(
      CHAIN_LIST.map(async (chain) => {
        try {
          const balance = await getBalance(address, chain.key);
          return [chain.key, balance] as const;
        } catch (e) {
          console.warn(`Failed to fetch ${chain.name} balance:`, e);
          return [chain.key, 'error'] as const;
        }
      })
    );
    setBalances(Object.fromEntries(results) as Record<ChainKey, string>);
  }, [address]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBalances();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert('Lock wallet', 'You will need your PIN to unlock again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Lock', onPress: lock },
    ]);
  };

  const handleReset = () => {
    Alert.alert(
      'Remove wallet from this device',
      'This deletes the wallet from this device. You can only recover it with your recovery phrase.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: resetWallet },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#fff" />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.addressLabel}>Your address</Text>
            <Text style={styles.address}>
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
            </Text>
          </View>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.lockButton}>Lock</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Receive')}
          >
            <Text style={styles.actionButtonText}>Receive</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Send', { defaultChain: 'ethereum' })}
          >
            <Text style={styles.actionButtonText}>Send</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Assets</Text>
        {CHAIN_LIST.map((chain) => (
          <TouchableOpacity
            key={chain.key}
            style={styles.chainRow}
            onPress={() => navigation.navigate('Send', { defaultChain: chain.key })}
          >
            <View style={[styles.chainDot, { backgroundColor: chain.color }]} />
            <View style={styles.chainInfo}>
              <Text style={styles.chainName}>{chain.name}</Text>
              <Text style={styles.chainSymbol}>{chain.symbol}</Text>
            </View>
            <Text style={styles.chainBalance}>
              {balances[chain.key] === null
                ? '...'
                : balances[chain.key] === 'error'
                ? 'error'
                : `${Number(balances[chain.key]).toFixed(5)} ${chain.symbol}`}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.removeButton} onPress={handleReset}>
          <Text style={styles.removeButtonText}>Remove wallet from this device</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0E17' },
  scroll: { padding: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  addressLabel: { color: '#9AA3B2', fontSize: 12 },
  address: { color: '#fff', fontSize: 18, fontWeight: '600', marginTop: 2 },
  lockButton: { color: '#627EEA', fontSize: 15, fontWeight: '600' },
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
  chainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151A26',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  chainDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  chainInfo: { flex: 1 },
  chainName: { color: '#fff', fontSize: 15, fontWeight: '600' },
  chainSymbol: { color: '#9AA3B2', fontSize: 12, marginTop: 2 },
  chainBalance: { color: '#fff', fontSize: 14, fontWeight: '500' },
  removeButton: { marginTop: 32, alignItems: 'center' },
  removeButtonText: { color: '#E5484D', fontSize: 13 },
});
