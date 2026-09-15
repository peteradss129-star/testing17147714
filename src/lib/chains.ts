export type ChainKey =
  | 'ethereum'
  | 'bsc'
  | 'polygon'
  | 'sepolia'
  | 'bscTestnet'
  | 'polygonAmoy'
  | 'bitcoin'
  | 'bitcoinTestnet'
  | 'tron'
  | 'tronTestnet';

// EVM chains share one signing/RPC path (src/lib/wallet.ts + erc20.ts).
// Bitcoin and Tron are entirely different address formats and transaction
// signing schemes, handled by src/lib/bitcoin.ts and src/lib/tron.ts.
export type ChainFamily = 'evm' | 'bitcoin' | 'tron';

export interface ChainConfig {
  key: ChainKey;
  family: ChainFamily;
  name: string;
  symbol: string;
  isTestnet: boolean;
  chainId?: number; // EVM only
  rpcUrl?: string; // EVM only
  explorerApiUrl?: string; // EVM only — Etherscan-family API base, for tx history
  explorerTxUrl: (hash: string) => string;
  explorerAddressUrl: (address: string) => string;
  color: string;
  faucetUrl?: string;
}

// Public RPC endpoints. Swap these for your own Infura/Alchemy/QuickNode
// keys before shipping to production — public endpoints are rate-limited
// and not meant for high-volume use.
export const CHAINS: Record<ChainKey, ChainConfig> = {
  ethereum: {
    key: 'ethereum',
    family: 'evm',
    name: 'Ethereum',
    symbol: 'ETH',
    isTestnet: false,
    chainId: 1,
    rpcUrl: 'https://ethereum-rpc.publicnode.com',
    explorerApiUrl: 'https://api.etherscan.io/api',
    explorerTxUrl: (hash) => `https://etherscan.io/tx/${hash}`,
    explorerAddressUrl: (address) => `https://etherscan.io/address/${address}`,
    color: '#627EEA',
  },
  bsc: {
    key: 'bsc',
    family: 'evm',
    name: 'BNB Smart Chain',
    symbol: 'BNB',
    isTestnet: false,
    chainId: 56,
    rpcUrl: 'https://bsc-rpc.publicnode.com',
    explorerApiUrl: 'https://api.bscscan.com/api',
    explorerTxUrl: (hash) => `https://bscscan.com/tx/${hash}`,
    explorerAddressUrl: (address) => `https://bscscan.com/address/${address}`,
    color: '#F0B90B',
  },
  polygon: {
    key: 'polygon',
    family: 'evm',
    name: 'Polygon',
    symbol: 'MATIC',
    isTestnet: false,
    chainId: 137,
    rpcUrl: 'https://polygon-bor-rpc.publicnode.com',
    explorerApiUrl: 'https://api.polygonscan.com/api',
    explorerTxUrl: (hash) => `https://polygonscan.com/tx/${hash}`,
    explorerAddressUrl: (address) => `https://polygonscan.com/address/${address}`,
    color: '#8247E5',
  },
  sepolia: {
    key: 'sepolia',
    family: 'evm',
    name: 'Ethereum Sepolia',
    symbol: 'ETH',
    isTestnet: true,
    chainId: 11155111,
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    explorerApiUrl: 'https://api-sepolia.etherscan.io/api',
    explorerTxUrl: (hash) => `https://sepolia.etherscan.io/tx/${hash}`,
    explorerAddressUrl: (address) => `https://sepolia.etherscan.io/address/${address}`,
    color: '#627EEA',
    faucetUrl: 'https://www.alchemy.com/faucets/ethereum-sepolia',
  },
  bscTestnet: {
    key: 'bscTestnet',
    family: 'evm',
    name: 'BNB Testnet',
    symbol: 'tBNB',
    isTestnet: true,
    chainId: 97,
    rpcUrl: 'https://bsc-testnet-rpc.publicnode.com',
    explorerApiUrl: 'https://api-testnet.bscscan.com/api',
    explorerTxUrl: (hash) => `https://testnet.bscscan.com/tx/${hash}`,
    explorerAddressUrl: (address) => `https://testnet.bscscan.com/address/${address}`,
    color: '#F0B90B',
    faucetUrl: 'https://testnet.bnbchain.org/faucet-smart',
  },
  polygonAmoy: {
    key: 'polygonAmoy',
    family: 'evm',
    name: 'Polygon Amoy',
    symbol: 'POL',
    isTestnet: true,
    chainId: 80002,
    rpcUrl: 'https://polygon-amoy-bor-rpc.publicnode.com',
    explorerApiUrl: 'https://api-amoy.polygonscan.com/api',
    explorerTxUrl: (hash) => `https://amoy.polygonscan.com/tx/${hash}`,
    explorerAddressUrl: (address) => `https://amoy.polygonscan.com/address/${address}`,
    color: '#8247E5',
    faucetUrl: 'https://faucet.polygon.technology',
  },
  bitcoin: {
    key: 'bitcoin',
    family: 'bitcoin',
    name: 'Bitcoin',
    symbol: 'BTC',
    isTestnet: false,
    explorerTxUrl: (hash) => `https://blockstream.info/tx/${hash}`,
    explorerAddressUrl: (address) => `https://blockstream.info/address/${address}`,
    color: '#F7931A',
  },
  bitcoinTestnet: {
    key: 'bitcoinTestnet',
    family: 'bitcoin',
    name: 'Bitcoin Testnet',
    symbol: 'tBTC',
    isTestnet: true,
    explorerTxUrl: (hash) => `https://blockstream.info/testnet/tx/${hash}`,
    explorerAddressUrl: (address) => `https://blockstream.info/testnet/address/${address}`,
    color: '#F7931A',
    faucetUrl: 'https://coinfaucet.eu/en/btc-testnet/',
  },
  tron: {
    key: 'tron',
    family: 'tron',
    name: 'Tron',
    symbol: 'TRX',
    isTestnet: false,
    explorerTxUrl: (hash) => `https://tronscan.org/#/transaction/${hash}`,
    explorerAddressUrl: (address) => `https://tronscan.org/#/address/${address}`,
    color: '#EF0027',
  },
  tronTestnet: {
    key: 'tronTestnet',
    family: 'tron',
    name: 'Tron Shasta',
    symbol: 'TRX',
    isTestnet: true,
    explorerTxUrl: (hash) => `https://shasta.tronscan.org/#/transaction/${hash}`,
    explorerAddressUrl: (address) => `https://shasta.tronscan.org/#/address/${address}`,
    color: '#EF0027',
  },
};

export const MAINNET_CHAIN_LIST: ChainConfig[] = [CHAINS.ethereum, CHAINS.bsc, CHAINS.polygon, CHAINS.bitcoin, CHAINS.tron];
export const TESTNET_CHAIN_LIST: ChainConfig[] = [
  CHAINS.sepolia,
  CHAINS.bscTestnet,
  CHAINS.polygonAmoy,
  CHAINS.bitcoinTestnet,
  CHAINS.tronTestnet,
];
