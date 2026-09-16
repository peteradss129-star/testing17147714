import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { getCoinChart, formatFiat, ChartRange, PricePoint } from '../lib/priceService';
import PriceChart from '../components/PriceChart';

type Props = NativeStackScreenProps<RootStackParamList, 'CoinDetail'>;

const RANGES: ChartRange[] = ['1D', '7D', '1M', '1Y'];
const CHART_WIDTH = Dimensions.get('window').width - 48;
const CHART_HEIGHT = 220;

function formatScrubDate(timestamp: number, range: ChartRange): string {
  const date = new Date(timestamp);
  if (range === '1D') {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: range === '1Y' ? 'numeric' : undefined });
}

export default function CoinDetailScreen({ route }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { coinId, name, symbol, image, currentPrice, priceChangePercentage24h } = route.params;

  const [range, setRange] = useState<ChartRange>('7D');
  const [chartData, setChartData] = useState<PricePoint[] | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scrubPoint, setScrubPoint] = useState<PricePoint | null>(null);

  const fetchChart = useCallback(async (r: ChartRange) => {
    setIsFetching(true);
    setError(null);
    try {
      const points = await getCoinChart(coinId, r);
      setChartData(points);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load chart');
    } finally {
      setIsFetching(false);
    }
  }, [coinId]);

  useEffect(() => {
    // Keep showing the previous range's chart (dimmed) while the new one
    // loads, instead of a jarring skeleton/blank flash.
    fetchChart(range);
  }, [range, fetchChart]);

  const displayPrice = scrubPoint ? scrubPoint.price : currentPrice;
  const isUp = (priceChangePercentage24h ?? 0) >= 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image source={{ uri: image }} style={styles.coinImage} />
        <View>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.symbol}>{symbol}</Text>
        </View>
      </View>

      <View style={styles.priceBlock}>
        <Text style={styles.price}>{formatFiat(displayPrice, 'usd')}</Text>
        {scrubPoint ? (
          <Text style={styles.scrubDate}>{formatScrubDate(scrubPoint.timestamp, range)}</Text>
        ) : (
          priceChangePercentage24h !== null && (
            <Text style={[styles.change, { color: isUp ? colors.success : colors.danger }]}>
              {isUp ? '+' : ''}
              {priceChangePercentage24h.toFixed(2)}% (24h)
            </Text>
          )
        )}
      </View>

      <View style={styles.rangeRow}>
        {RANGES.map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.rangeButton, range === r && styles.rangeButtonActive]}
            onPress={() => setRange(r)}
          >
            <Text style={[styles.rangeButtonText, range === r && styles.rangeButtonTextActive]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={{ opacity: isFetching ? 0.4 : 1 }}>
        {chartData && chartData.length > 1 ? (
          <PriceChart data={chartData} width={CHART_WIDTH} height={CHART_HEIGHT} onScrub={setScrubPoint} />
        ) : (
          <View style={{ width: CHART_WIDTH, height: CHART_HEIGHT }} />
        )}
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: 24 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    coinImage: { width: 40, height: 40, borderRadius: 20 },
    name: { color: colors.textPrimary, fontSize: 18, fontWeight: '600' },
    symbol: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
    priceBlock: { marginBottom: 20 },
    price: { color: colors.textPrimary, fontSize: 32, fontWeight: '700' },
    change: { fontSize: 14, fontWeight: '600', marginTop: 4 },
    scrubDate: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
    rangeRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
    rangeButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rangeButtonActive: { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
    rangeButtonText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
    rangeButtonTextActive: { color: colors.primary },
    errorText: { color: colors.danger, fontSize: 13, marginBottom: 12 },
  });
}
