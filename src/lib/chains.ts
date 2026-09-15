export type ChainKey = 'ethereum' | 'bsc' | 'polygon' | 'sepolia' | 'bscTestnet' | 'polygonAmoy';

export interface ChainConfig {
  key: ChainKey;
  name: string;
  symbol: string;
  chainId: number;
  rpcUrl: string;
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
    name: 'Ethereum',
    symbol: 'ETH',
    chainId: 1,
    rpcUrl: 'https://ethereum-rpc.publicnode.com',
    explorerTxUrl: (hash) => `https://etherscan.io/tx/${hash}`,
    explorerAddressUrl: (address) => `https://etherscan.io/address/${address}`,
    color: '#627EEA',
  },
  bsc: {
    key: 'bsc',
    name: 'BNB Smart Chain',
    symbol: 'BNB',
    chainId: 56,
    rpcUrl: 'https://bsc-rpc.publicnode.com',
    explorerTxUrl: (hash) => `https://bscscan.com/tx/${hash}`,
    explorerAddressUrl: (address) => `https://bscscan.com/address/${address}`,
    color: '#F0B90B',
  },
  polygon: {
    key: 'polygon',
    name: 'Polygon',
    symbol: 'MATIC',
    chainId: 137,
    rpcUrl: 'https://polygon-bor-rpc.publicnode.com',
    explorerTxUrl: (hash) => `https://polygonscan.com/tx/${hash}`,
    explorerAddressUrl: (address) => `https://polygonscan.com/address/${address}`,
    color: '#8247E5',
  },
  sepolia: {
    key: 'sepolia',
    name: 'Ethereum Sepolia',
    symbol: 'ETH',
    chainId: 11155111,
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    explorerTxUrl: (hash) => `https://sepolia.etherscan.io/tx/${hash}`,
    explorerAddressUrl: (address) => `https://sepolia.etherscan.io/address/${address}`,
    color: '#627EEA',
    faucetUrl: 'https://www.alchemy.com/faucets/ethereum-sepolia',
  },
  bscTestnet: {
    key: 'bscTestnet',
    name: 'BNB Testnet',
    symbol: 'tBNB',
    chainId: 97,
    rpcUrl: 'https://bsc-testnet-rpc.publicnode.com',
    explorerTxUrl: (hash) => `https://testnet.bscscan.com/tx/${hash}`,
    explorerAddressUrl: (address) => `https://testnet.bscscan.com/address/${address}`,
    color: '#F0B90B',
    faucetUrl: 'https://testnet.bnbchain.org/faucet-smart',
  },
  polygonAmoy: {
    key: 'polygonAmoy',
    name: 'Polygon Amoy',
    symbol: 'POL',
    chainId: 80002,
    rpcUrl: 'https://polygon-amoy-bor-rpc.publicnode.com',
    explorerTxUrl: (hash) => `https://amoy.polygonscan.com/tx/${hash}`,
    explorerAddressUrl: (address) => `https://amoy.polygonscan.com/address/${address}`,
    color: '#8247E5',
    faucetUrl: 'https://faucet.polygon.technology',
  },
};

export const MAINNET_CHAIN_LIST: ChainConfig[] = [CHAINS.ethereum, CHAINS.bsc, CHAINS.polygon];
export const TESTNET_CHAIN_LIST: ChainConfig[] = [CHAINS.sepolia, CHAINS.bscTestnet, CHAINS.polygonAmoy];
