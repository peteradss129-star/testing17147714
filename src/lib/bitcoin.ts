import * as bitcoin from 'bitcoinjs-lib';
import { BIP32Factory } from 'bip32';
import { ECPairFactory } from 'ecpair';
import * as ecc from '@bitcoinerlab/secp256k1';
import { ethers } from 'ethers';

bitcoin.initEccLib(ecc);
const bip32 = BIP32Factory(ecc);
const ECPair = ECPairFactory(ecc);

const BLOCKSTREAM_MAINNET = 'https://blockstream.info/api';
const BLOCKSTREAM_TESTNET = 'https://blockstream.info/testnet/api';

// Native SegWit (BIP84): m/84'/0'/0'/0/0 mainnet, m/84'/1'/0'/0/0 testnet.
function derivationPath(isTestnet: boolean): string {
  return `m/84'/${isTestnet ? 1 : 0}'/0'/0/0`;
}

function getNetwork(isTestnet: boolean): bitcoin.Network {
  return isTestnet ? bitcoin.networks.testnet : bitcoin.networks.bitcoin;
}

function getApiBase(isTestnet: boolean): string {
  return isTestnet ? BLOCKSTREAM_TESTNET : BLOCKSTREAM_MAINNET;
}

function deriveNode(mnemonic: string, isTestnet: boolean) {
  const seed = ethers.getBytes(ethers.Mnemonic.fromPhrase(mnemonic.trim()).computeSeed());
  const network = getNetwork(isTestnet);
  const root = bip32.fromSeed(seed, network);
  return root.derivePath(derivationPath(isTestnet));
}

export function deriveBitcoinAddress(mnemonic: string, isTestnet: boolean): string {
  const node = deriveNode(mnemonic, isTestnet);
  const { address } = bitcoin.payments.p2wpkh({ pubkey: node.publicKey, network: getNetwork(isTestnet) });
  if (!address) throw new Error('Failed to derive Bitcoin address');
  return address;
}

interface UtxoInfo {
  txid: string;
  vout: number;
  value: number;
  status: { confirmed: boolean };
}

export async function getBitcoinBalance(address: string, isTestnet: boolean): Promise<string> {
  const res = await fetch(`${getApiBase(isTestnet)}/address/${address}`);
  if (!res.ok) throw new Error(`Failed to fetch balance (HTTP ${res.status})`);
  const data = await res.json();
  const sats = data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
  return (sats / 1e8).toFixed(8);
}

async function getUtxos(address: string, isTestnet: boolean): Promise<UtxoInfo[]> {
  const res = await fetch(`${getApiBase(isTestnet)}/address/${address}/utxo`);
  if (!res.ok) throw new Error(`Failed to fetch UTXOs (HTTP ${res.status})`);
  return res.json();
}

async function getFeeRateSatPerVByte(isTestnet: boolean): Promise<number> {
  try {
    const res = await fetch(`${getApiBase(isTestnet)}/fee-estimates`);
    const data = await res.json();
    return Math.max(1, Math.ceil(data['6'] ?? 10));
  } catch {
    return 10;
  }
}

// Rough vbyte estimate for an all-P2WPKH transaction: ~68 vbytes per input,
// ~31 per output, plus a fixed overhead. Good enough for fee estimation —
// not exact, but errs slightly high rather than under-paying.
function estimateVBytes(inputCount: number, outputCount: number): number {
  return inputCount * 68 + outputCount * 31 + 10;
}

const DUST_THRESHOLD_SATS = 546;

interface PreparedBitcoinTx {
  network: bitcoin.Network;
  fromAddress: string;
  outputScript: Uint8Array;
  selected: UtxoInfo[];
  amountSats: number;
  feeSats: number;
  changeSats: number;
}

// Shared by estimateBitcoinFee (preview, before the user confirms) and
// sendBitcoin (the real thing) so the fee shown to the user is exactly what
// gets charged, not a separate approximation.
async function prepareTransaction(
  mnemonic: string,
  isTestnet: boolean,
  toAddress: string,
  amountBtc: string
): Promise<PreparedBitcoinTx> {
  const network = getNetwork(isTestnet);
  const node = deriveNode(mnemonic, isTestnet);
  const fromAddress = deriveBitcoinAddress(mnemonic, isTestnet);

  const amountSats = Math.round(parseFloat(amountBtc) * 1e8);
  if (!Number.isFinite(amountSats) || amountSats <= 0) {
    throw new Error('Invalid amount');
  }

  const utxos = (await getUtxos(fromAddress, isTestnet)).filter((u) => u.status.confirmed);
  if (utxos.length === 0) {
    throw new Error('No confirmed funds available to spend yet');
  }

  const feeRate = await getFeeRateSatPerVByte(isTestnet);
  const { output } = bitcoin.payments.p2wpkh({ pubkey: node.publicKey, network });
  if (!output) throw new Error('Failed to build output script');

  const selected: UtxoInfo[] = [];
  let total = 0;
  for (const utxo of utxos) {
    selected.push(utxo);
    total += utxo.value;
    const fee = estimateVBytes(selected.length, 2) * feeRate;
    if (total >= amountSats + fee) break;
  }

  const feeSats = Math.ceil(estimateVBytes(selected.length, 2) * feeRate);
  if (total < amountSats + feeSats) {
    throw new Error('Insufficient balance to cover amount and network fee');
  }

  return {
    network,
    fromAddress,
    outputScript: output,
    selected,
    amountSats,
    feeSats,
    changeSats: total - amountSats - feeSats,
  };
}

export async function estimateBitcoinFee(
  mnemonic: string,
  isTestnet: boolean,
  toAddress: string,
  amountBtc: string
): Promise<string> {
  const prepared = await prepareTransaction(mnemonic, isTestnet, toAddress, amountBtc);
  return (prepared.feeSats / 1e8).toFixed(8);
}

export interface SendBitcoinResult {
  hash: string;
}

export async function sendBitcoin(
  mnemonic: string,
  isTestnet: boolean,
  toAddress: string,
  amountBtc: string
): Promise<SendBitcoinResult> {
  const node = deriveNode(mnemonic, isTestnet);
  if (!node.privateKey) throw new Error('Failed to derive Bitcoin private key');

  const prepared = await prepareTransaction(mnemonic, isTestnet, toAddress, amountBtc);
  const keyPair = ECPair.fromPrivateKey(node.privateKey, { network: prepared.network });

  const psbt = new bitcoin.Psbt({ network: prepared.network });
  for (const utxo of prepared.selected) {
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: { script: prepared.outputScript, value: BigInt(utxo.value) },
    });
  }

  psbt.addOutput({ address: toAddress, value: BigInt(prepared.amountSats) });
  if (prepared.changeSats > DUST_THRESHOLD_SATS) {
    psbt.addOutput({ address: prepared.fromAddress, value: BigInt(prepared.changeSats) });
  }

  psbt.signAllInputs(keyPair);
  psbt.finalizeAllInputs();
  const txHex = psbt.extractTransaction().toHex();

  const broadcastRes = await fetch(`${getApiBase(isTestnet)}/tx`, { method: 'POST', body: txHex });
  if (!broadcastRes.ok) {
    const errText = await broadcastRes.text();
    throw new Error(errText || `Failed to broadcast transaction (HTTP ${broadcastRes.status})`);
  }
  const txid = await broadcastRes.text();
  return { hash: txid };
}

export interface BitcoinTxHistoryItem {
  hash: string;
  direction: 'in' | 'out' | 'self';
  amount: string;
  timestamp: number;
  confirmed: boolean;
}

export async function getBitcoinHistory(address: string, isTestnet: boolean): Promise<BitcoinTxHistoryItem[]> {
  const res = await fetch(`${getApiBase(isTestnet)}/address/${address}/txs`);
  if (!res.ok) throw new Error(`Failed to fetch history (HTTP ${res.status})`);
  const txs = await res.json();

  return txs.map((tx: any) => {
    let received = 0;
    let sent = 0;
    for (const vout of tx.vout ?? []) {
      if (vout.scriptpubkey_address === address) received += vout.value;
    }
    for (const vin of tx.vin ?? []) {
      if (vin.prevout?.scriptpubkey_address === address) sent += vin.prevout.value;
    }
    const net = received - sent;
    return {
      hash: tx.txid,
      direction: net > 0 ? 'in' : net < 0 ? 'out' : 'self',
      amount: (Math.abs(net) / 1e8).toFixed(8),
      timestamp: tx.status?.confirmed ? tx.status.block_time : 0,
      confirmed: Boolean(tx.status?.confirmed),
    };
  });
}
