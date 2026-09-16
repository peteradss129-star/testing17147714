import React, { useCallback, useState } from 'react';
import { Image, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { getTopCoins, formatFiat, MarketCoin } from '../lib/priceService';
import SkeletonBox from '../components/SkeletonBox';

export default function MarketScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [coins, setCoins] = useState<MarketCoin[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCoins = useCallback(async () => {
    setError(null);
    try {
      const data = await getTopCoins(100);
      setCoins(data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load market data');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchCoins();
    }, [fetchCoins])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCoins();
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
        <Text style={styles.title}>Market</Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {coins === null &&
          !error &&
          Array.from({ length: 10 }).map((_, i) => (
            <View key={i} style={styles.row}>
              <SkeletonBox width={32} height={32} style={{ borderRadius: 16 }} />
              <View style={styles.info}>
                <SkeletonBox width={100} height={14} />
                <SkeletonBox width={60} height={11} style={{ marginTop: 6 }} />
              </View>
              <SkeletonBox width={70} height={14} />
            </View>
          ))}

        {coins?.map((coin) => {
          const change = coin.priceChangePercentage24h;
          const isUp = (change ?? 0) >= 0;
          return (
            <View key={coin.id} style={styles.row}>
              <Image source={{ uri: coin.image }} style={styles.coinImage} />
              <View style={styles.info}>
                <Text style={styles.name}>{coin.name}</Text>
                <Text style={styles.symbol}>{coin.symbol}</Text>
              </View>
              <View style={styles.priceBlock}>
                <Text style={styles.price}>{formatFiat(coin.currentPrice, 'usd')}</Text>
                {change !== null && (
                  <Text style={[styles.change, { color: isUp ? colors.success : colors.danger }]}>
                    {isUp ? '+' : ''}
                    {change.toFixed(2)}%
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: 24 },
    title: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginBottom: 20 },
    errorText: { color: colors.danger, fontSize: 13, marginBottom: 12, lineHeight: 18 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      gap: 12,
    },
    coinImage: { width: 32, height: 32, borderRadius: 16 },
    info: { flex: 1 },
    name: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
    symbol: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
    priceBlock: { alignItems: 'flex-end' },
    price: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
    change: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  });
}
