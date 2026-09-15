export type ChainKey = 'ethereum' | 'bsc' | 'polygon';

export interface ChainConfig {
  key: ChainKey;
  name: string;
  symbol: string;
  chainId: number;
  rpcUrl: string;
  explorerTxUrl: (hash: string) => string;
  explorerAddressUrl: (address: string) => string;
  color: string;
}

// Public RPC endpoints. Swap these for your own Infura/Alchemy/QuickNode
// keys before shipping to production — public endpoints are rate-limited
// and not meant for high-volume use.
export const CHAINS: Record<ChainKey, ChainConfig> = {
  ethereum: {
    key: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    chainId: 1,
    rpcUrl: 'https://eth.llamarpc.com',
    explorerTxUrl: (hash) => `https://etherscan.io/tx/${hash}`,
    explorerAddressUrl: (address) => `https://etherscan.io/address/${address}`,
    color: '#627EEA',
  },
  bsc: {
    key: 'bsc',
    name: 'BNB Smart Chain',
    symbol: 'BNB',
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed.binance.org',
    explorerTxUrl: (hash) => `https://bscscan.com/tx/${hash}`,
    explorerAddressUrl: (address) => `https://bscscan.com/address/${address}`,
    color: '#F0B90B',
  },
  polygon: {
    key: 'polygon',
    name: 'Polygon',
    symbol: 'MATIC',
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com',
    explorerTxUrl: (hash) => `https://polygonscan.com/tx/${hash}`,
    explorerAddressUrl: (address) => `https://polygonscan.com/address/${address}`,
    color: '#8247E5',
  },
};

export const CHAIN_LIST: ChainConfig[] = Object.values(CHAINS);
