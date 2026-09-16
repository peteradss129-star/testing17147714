import { ChainKey } from './chains';

// CoinGecko's free public endpoint, no API key needed. Only covers native
// coins (not custom tokens) and only makes sense for mainnet — testnet coins
// have no real market value.
const COINGECKO_IDS: Partial<Record<ChainKey, string>> = {
  ethereum: 'ethereum',
  bsc: 'binancecoin',
  polygon: 'matic-network',
  bitcoin: 'bitcoin',
  tron: 'tron',
};

export interface PriceInfo {
  usd: number;
  inr: number;
}

let cache: { data: Record<string, PriceInfo>; timestamp: number } | null = null;
const CACHE_TTL_MS = 60_000;

function mapToChainKeys(data: Record<string, PriceInfo>): Partial<Record<ChainKey, PriceInfo>> {
  const result: Partial<Record<ChainKey, PriceInfo>> = {};
  for (const [chainKey, coingeckoId] of Object.entries(COINGECKO_IDS)) {
    const price = data[coingeckoId];
    if (price) {
      result[chainKey as ChainKey] = price;
    }
  }
  return result;
}

export async function getNativePrices(): Promise<Partial<Record<ChainKey, PriceInfo>>> {
  const now = Date.now();
  if (cache && now - cache.timestamp < CACHE_TTL_MS) {
    return mapToChainKeys(cache.data);
  }

  const ids = Object.values(COINGECKO_IDS).join(',');
  const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,inr`);
  if (!res.ok) throw new Error(`Failed to fetch prices (HTTP ${res.status})`);
  const data = await res.json();

  cache = { data, timestamp: now };
  return mapToChainKeys(data);
}

export function formatFiat(amount: number, currency: 'usd' | 'inr'): string {
  const symbol = currency === 'usd' ? '$' : '₹';
  return `${symbol}${amount.toLocaleString(undefined, { maximumFractionDigits: amount < 1 ? 4 : 2 })}`;
}

export interface MarketCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  currentPrice: number;
  priceChangePercentage24h: number | null;
  marketCap: number;
  sparkline7d: number[];
}

let marketCache: { data: MarketCoin[]; timestamp: number } | null = null;

export async function getTopCoins(perPage = 100): Promise<MarketCoin[]> {
  const now = Date.now();
  if (marketCache && now - marketCache.timestamp < CACHE_TTL_MS) {
    return marketCache.data;
  }

  const res = await fetch(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=1&sparkline=true`
  );
  if (!res.ok) throw new Error(`Failed to fetch market data (HTTP ${res.status})`);
  const data = await res.json();

  const coins: MarketCoin[] = data.map((c: any) => ({
    id: c.id,
    symbol: (c.symbol ?? '').toUpperCase(),
    name: c.name,
    image: c.image,
    currentPrice: c.current_price ?? 0,
    priceChangePercentage24h: c.price_change_percentage_24h,
    marketCap: c.market_cap ?? 0,
    sparkline7d: c.sparkline_in_7d?.price ?? [],
  }));

  marketCache = { data: coins, timestamp: now };
  return coins;
}

export type ChartRange = '1D' | '7D' | '1M' | '1Y';

const RANGE_TO_DAYS: Record<ChartRange, number> = {
  '1D': 1,
  '7D': 7,
  '1M': 30,
  '1Y': 365,
};

export interface PricePoint {
  timestamp: number;
  price: number;
}

const chartCache = new Map<string, { data: PricePoint[]; timestamp: number }>();

export async function getCoinChart(coinId: string, range: ChartRange): Promise<PricePoint[]> {
  const cacheKey = `${coinId}:${range}`;
  const now = Date.now();
  const cached = chartCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const days = RANGE_TO_DAYS[range];
  const res = await fetch(
    `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`
  );
  if (!res.ok) throw new Error(`Failed to fetch chart data (HTTP ${res.status})`);
  const data = await res.json();

  const points: PricePoint[] = (data.prices ?? []).map(([timestamp, price]: [number, number]) => ({
    timestamp,
    price,
  }));

  chartCache.set(cacheKey, { data: points, timestamp: now });
  return points;
}
