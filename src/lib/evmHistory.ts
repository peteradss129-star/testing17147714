import { ethers } from 'ethers';
import { CHAINS, ChainKey } from './chains';

export interface TxHistoryItem {
  hash: string;
  direction: 'in' | 'out' | 'self';
  amount: string;
  counterparty: string;
  timestamp: number;
  confirmed: boolean;
}

// Etherscan-family "txlist"/"tokentx" APIs. Without an API key these are
// rate-limited and occasionally change shape — swap in your own key via
// `&apikey=...` in src/lib/chains.ts's explorerApiUrl if this gets flaky.
async function fetchExplorer(apiUrl: string, params: Record<string, string>): Promise<any> {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${apiUrl}?${query}`);
  if (!res.ok) throw new Error(`Explorer API request failed (HTTP ${res.status})`);
  const data = await res.json();
  if (!Array.isArray(data.result)) {
    throw new Error(typeof data.result === 'string' ? data.result : data.message || 'Failed to fetch history');
  }
  return data.result;
}

function direction(from: string, address: string): 'in' | 'out' | 'self' {
  return from.toLowerCase() === address.toLowerCase() ? 'out' : 'in';
}

export async function getTransactionHistory(chain: ChainKey, address: string): Promise<TxHistoryItem[]> {
  const apiUrl = CHAINS[chain].explorerApiUrl;
  if (!apiUrl) throw new Error(`History is not available for ${CHAINS[chain].name}`);

  const result = await fetchExplorer(apiUrl, {
    module: 'account',
    action: 'txlist',
    address,
    sort: 'desc',
    page: '1',
    offset: '20',
  });

  return result.map((tx: any) => {
    const dir = direction(tx.from, address);
    return {
      hash: tx.hash,
      direction: dir,
      amount: ethers.formatEther(tx.value ?? '0'),
      counterparty: dir === 'out' ? tx.to : tx.from,
      timestamp: Number(tx.timeStamp) || 0,
      confirmed: Number(tx.confirmations ?? 1) > 0,
    };
  });
}

export async function getTokenTransactionHistory(
  chain: ChainKey,
  address: string,
  tokenAddress: string,
  decimals: number
): Promise<TxHistoryItem[]> {
  const apiUrl = CHAINS[chain].explorerApiUrl;
  if (!apiUrl) throw new Error(`History is not available for ${CHAINS[chain].name}`);

  const result = await fetchExplorer(apiUrl, {
    module: 'account',
    action: 'tokentx',
    contractaddress: tokenAddress,
    address,
    sort: 'desc',
    page: '1',
    offset: '20',
  });

  return result.map((tx: any) => {
    const dir = direction(tx.from, address);
    return {
      hash: tx.hash,
      direction: dir,
      amount: ethers.formatUnits(tx.value ?? '0', decimals),
      counterparty: dir === 'out' ? tx.to : tx.from,
      timestamp: Number(tx.timeStamp) || 0,
      confirmed: Number(tx.confirmations ?? 1) > 0,
    };
  });
}
