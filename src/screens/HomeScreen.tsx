import React, { useCallback, useState } from 'react';
import {
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useWallet } from '../context/WalletContext';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { MAINNET_CHAIN_LIST, TESTNET_CHAIN_LIST, ChainKey } from '../lib/chains';
import * as chainService from '../lib/chainService';
import { getStoredTokens, StoredToken } from '../lib/tokenStorage';
import { getNativePrices, formatFiat, PriceInfo } from '../lib/priceService';
import SkeletonBox from '../components/SkeletonBox';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const { address, mnemonic, lock, resetWallet } = useWallet();
  const { mode, colors, toggleTheme } = useTheme();
  const styles = createStyles(colors);
  const [isTestnet, setIsTestnet] = useState(true);
  const [balances, setBalances] = useState<Partial<Record<ChainKey, string>>>({});
  const [prices, setPrices] = useState<Partial<Record<ChainKey, PriceInfo>>>({});
  const [tokens, setTokens] = useState<StoredToken[]>([]);
  const [tokenBalances, setTokenBalances] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);

  const chainList = isTestnet ? TESTNET_CHAIN_LIST : MAINNET_CHAIN_LIST;
  const chainKeysInScope = new Set(chainList.map((c) => c.key));

  const tokenKey = (t: StoredToken) => `${t.chain}:${t.address.toLowerCase()}`;

  const fetchAll = useCallback(async () => {
    if (!mnemonic) return;

    setBalances({});
    const balanceResults = await Promise.all(
      chainList.map(async (chain) => {
        try {
          const balance = await chainService.getNativeBalance(mnemonic, chain);
          return [chain.key, balance] as const;
        } catch (e) {
          console.warn(`Failed to fetch ${chain.name} balance:`, e);
          return [chain.key, 'error'] as const;
        }
      })
    );
    setBalances(Object.fromEntries(balanceResults));

    // Testnet coins have no real market value, so skip pricing entirely there.
    if (!isTestnet) {
      try {
        setPrices(await getNativePrices());
      } catch (e) {
        console.warn('Failed to fetch prices:', e);
        setPrices({});
      }
    } else {
      setPrices({});
    }

    const allTokens = await getStoredTokens();
    const scopedTokens = allTokens.filter((t) => chainKeysInScope.has(t.chain));
    setTokens(scopedTokens);

    setTokenBalances({});
    const tokenResults = await Promise.all(
      scopedTokens.map(async (token) => {
        try {
          const chain = chainList.find((c) => c.key === token.chain)!;
          const ownerAddress = chainService.deriveAddress(mnemonic, chain);
          const balance = await chainService.getTokenBalance(chain, token.address, ownerAddress, token.decimals);
          return [tokenKey(token), balance] as const;
        } catch (e) {
          console.warn(`Failed to fetch ${token.symbol} balance:`, e);
          return [tokenKey(token), 'error'] as const;
        }
      })
    );
    setTokenBalances(Object.fromEntries(tokenResults));
  }, [mnemonic, isTestnet]);

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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.textPrimary} />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.addressLabel}>Your EVM address</Text>
            <Text style={styles.address}>
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={toggleTheme} style={styles.themeButton}>
              <Text style={styles.themeButtonText}>{mode === 'dark' ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout}>
              <Text style={styles.lockButton}>Lock</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.networkToggle}>
          <View>
            <Text style={styles.networkToggleTitle}>Testnet mode</Text>
            <Text style={styles.networkToggleSubtitle}>
              {isTestnet ? 'Using free test networks — safe to experiment' : 'Using real mainnet funds'}
            </Text>
          </View>
          <Switch
            value={isTestnet}
            onValueChange={setIsTestnet}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff"
          />
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
            onPress={() => navigation.navigate('Send', { defaultChain: chainList[0].key, isTestnet })}
          >
            <Text style={styles.actionButtonText}>Send</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Assets</Text>
        {chainList.map((chain) => {
          const balance = balances[chain.key];
          const price = prices[chain.key];
          return (
            <TouchableOpacity
              key={chain.key}
              style={styles.chainRow}
              onPress={() => navigation.navigate('AssetHistory', { chainKey: chain.key, isTestnet })}
            >
              <View style={[styles.chainDot, { backgroundColor: chain.color }]} />
              <View style={styles.chainInfo}>
                <Text style={styles.chainName}>{chain.name}</Text>
                <Text style={styles.chainSymbol}>{chain.symbol}</Text>
              </View>
              <View style={styles.chainValues}>
                {balance === undefined ? (
                  <SkeletonBox width={80} height={14} />
                ) : balance === 'error' ? (
                  <Text style={styles.chainBalance}>error</Text>
                ) : (
                  <>
                    <Text style={styles.chainBalance}>
                      {Number(balance).toFixed(5)} {chain.symbol}
                    </Text>
                    {price && (
                      <Text style={styles.chainFiat}>
                        {formatFiat(Number(balance) * price.usd, 'usd')} · {formatFiat(Number(balance) * price.inr, 'inr')}
                      </Text>
                    )}
                  </>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={styles.tokensHeader}>
          <Text style={styles.sectionTitle}>Tokens</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AddToken', { isTestnet })}>
            <Text style={styles.addTokenLink}>+ Add token</Text>
          </TouchableOpacity>
        </View>

        {tokens.length === 0 && (
          <Text style={styles.emptyTokens}>No custom tokens added yet on the current network.</Text>
        )}

        {tokens.map((token) => {
          const balance = tokenBalances[tokenKey(token)];
          return (
            <TouchableOpacity
              key={tokenKey(token)}
              style={styles.chainRow}
              onPress={() =>
                navigation.navigate('AssetHistory', { chainKey: token.chain, isTestnet, tokenAddress: token.address })
              }
            >
              <View style={[styles.chainDot, { backgroundColor: colors.textMuted }]} />
              <View style={styles.chainInfo}>
                <Text style={styles.chainName}>{token.name}</Text>
                <Text style={styles.chainSymbol}>{token.symbol}</Text>
              </View>
              {balance === undefined ? (
                <SkeletonBox width={80} height={14} />
              ) : (
                <Text style={styles.chainBalance}>
                  {balance === 'error' ? 'error' : `${Number(balance).toFixed(4)} ${token.symbol}`}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={styles.removeButton} onPress={handleReset}>
          <Text style={styles.removeButtonText}>Remove wallet from this device</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    themeButton: { padding: 4 },
    themeButtonText: { fontSize: 18 },
    addressLabel: { color: colors.textSecondary, fontSize: 12 },
    address: { color: colors.textPrimary, fontSize: 18, fontWeight: '600', marginTop: 2 },
    lockButton: { color: colors.primary, fontSize: 15, fontWeight: '600' },
    networkToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    networkToggleTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
    networkToggleSubtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
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
    tokensHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 24,
    },
    addTokenLink: { color: colors.primary, fontSize: 13, fontWeight: '600', marginBottom: 12 },
    emptyTokens: { color: colors.textMuted, fontSize: 13, marginBottom: 12 },
    chainRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      marginBottom: 10,
    },
    chainDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
    chainInfo: { flex: 1 },
    chainName: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
    chainSymbol: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
    chainValues: { alignItems: 'flex-end' },
    chainBalance: { color: colors.textPrimary, fontSize: 14, fontWeight: '500' },
    chainFiat: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
    removeButton: { marginTop: 32, alignItems: 'center' },
    removeButtonText: { color: colors.danger, fontSize: 13 },
  });
}
