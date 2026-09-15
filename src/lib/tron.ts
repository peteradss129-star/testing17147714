import { ethers } from 'ethers';
import bs58 from 'bs58';

const TRON_MAINNET_API = 'https://api.trongrid.io';
const TRON_TESTNET_API = 'https://api.shasta.trongrid.io'; // Shasta testnet
const DERIVATION_PATH = "m/44'/195'/0'/0/0";
const abiCoder = ethers.AbiCoder.defaultAbiCoder();

function getTronApiBase(isTestnet: boolean): string {
  return isTestnet ? TRON_TESTNET_API : TRON_MAINNET_API;
}

function evmStyleToTronAddress(evmAddress: string): string {
  const bytes20 = ethers.getBytes(evmAddress);
  const tronBytes = new Uint8Array(21);
  tronBytes[0] = 0x41;
  tronBytes.set(bytes20, 1);
  const checksum = ethers.getBytes(ethers.sha256(ethers.sha256(tronBytes))).slice(0, 4);
  const full = new Uint8Array(25);
  full.set(tronBytes, 0);
  full.set(checksum, 21);
  return bs58.encode(full);
}

function tronAddressToHexPrefixed(address: string): string {
  const decoded = bs58.decode(address);
  const withoutChecksum = decoded.slice(0, 21); // 0x41 prefix byte + 20 address bytes
  return ethers.hexlify(withoutChecksum).slice(2); // e.g. "41ab12..." (42 hex chars, no 0x)
}

function tronAddressToEvmStyle(address: string): string {
  return '0x' + tronAddressToHexPrefixed(address).slice(2);
}

const TRON_ZERO_ADDRESS = evmStyleToTronAddress('0x' + '00'.repeat(20));

function hexToUtf8Safe(hex: string): string {
  try {
    return ethers.toUtf8String('0x' + hex.replace(/^0x/, ''));
  } catch {
    return hex;
  }
}

function deriveTronHDWallet(mnemonic: string): ethers.HDNodeWallet {
  return ethers.HDNodeWallet.fromPhrase(mnemonic.trim(), undefined, DERIVATION_PATH);
}

function tronAddressFromPrivateKey(privateKeyHex: string): string {
  // Tron addresses use the same secp256k1 keccak256 scheme as Ethereum, just
  // with a 0x41 version byte and Base58Check encoding instead of hex+0x.
  const uncompressedPubKey = new ethers.SigningKey(privateKeyHex).publicKey;
  const pubKeyBytes = ethers.getBytes(uncompressedPubKey).slice(1);
  const hash = ethers.getBytes(ethers.keccak256(pubKeyBytes));
  const addressBytes = hash.slice(-20);
  return evmStyleToTronAddress(ethers.hexlify(addressBytes));
}

export function deriveTronAddress(mnemonic: string): string {
  return tronAddressFromPrivateKey(deriveTronHDWallet(mnemonic).privateKey);
}

// Tron's signature format for API submission is r(32) + s(32) + recoveryId(1)
// as a single hex string, distinct from Ethereum's legacy 27/28 "v" byte.
function signTronDigest(privateKeyHex: string, digestHex: string): string {
  const signature = new ethers.SigningKey(privateKeyHex).sign(digestHex);
  const v = signature.yParity.toString(16).padStart(2, '0');
  return signature.r.slice(2) + signature.s.slice(2) + v;
}

export async function getTronBalance(address: string, isTestnet: boolean): Promise<string> {
  const res = await fetch(`${getTronApiBase(isTestnet)}/v1/accounts/${address}`);
  if (!res.ok) throw new Error(`Failed to fetch balance (HTTP ${res.status})`);
  const data = await res.json();
  const balanceSun = data.data?.[0]?.balance ?? 0;
  return (balanceSun / 1e6).toFixed(6);
}

export interface SendTrxResult {
  hash: string;
}

export async function sendTrx(
  mnemonic: string,
  isTestnet: boolean,
  toAddress: string,
  amountTrx: string
): Promise<SendTrxResult> {
  const base = getTronApiBase(isTestnet);
  const hdWallet = deriveTronHDWallet(mnemonic);
  const fromAddress = tronAddressFromPrivateKey(hdWallet.privateKey);
  const amountSun = Math.round(parseFloat(amountTrx) * 1e6);
  if (!Number.isFinite(amountSun) || amountSun <= 0) {
    throw new Error('Invalid amount');
  }

  const createRes = await fetch(`${base}/wallet/createtransaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to_address: tronAddressToHexPrefixed(toAddress),
      owner_address: tronAddressToHexPrefixed(fromAddress),
      amount: amountSun,
      visible: false,
    }),
  });
  const unsignedTx = await createRes.json();
  if (!unsignedTx?.txID) {
    throw new Error(unsignedTx?.Error ?? 'Failed to create transaction');
  }

  const signature = signTronDigest(hdWallet.privateKey, '0x' + unsignedTx.txID);
  const broadcastRes = await fetch(`${base}/wallet/broadcasttransaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...unsignedTx, signature: [signature] }),
  });
  const result = await broadcastRes.json();
  if (!result.result) {
    throw new Error(result.message ? hexToUtf8Safe(result.message) : 'Broadcast failed');
  }
  return { hash: unsignedTx.txID };
}

async function triggerConstant(
  base: string,
  ownerAddress: string,
  contractAddress: string,
  functionSelector: string,
  parameter: string
): Promise<string> {
  const res = await fetch(`${base}/wallet/triggerconstantcontract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      owner_address: tronAddressToHexPrefixed(ownerAddress),
      contract_address: tronAddressToHexPrefixed(contractAddress),
      function_selector: functionSelector,
      parameter,
      visible: false,
    }),
  });
  const data = await res.json();
  if (data.result?.result !== true) {
    throw new Error(data.result?.message ? hexToUtf8Safe(data.result.message) : 'Contract call failed');
  }
  return data.constant_result?.[0] ?? '';
}

function encodeAddressParam(tronAddress: string): string {
  return abiCoder.encode(['address'], [tronAddressToEvmStyle(tronAddress)]).slice(2);
}

function encodeTransferParam(toTronAddress: string, amount: bigint): string {
  return abiCoder.encode(['address', 'uint256'], [tronAddressToEvmStyle(toTronAddress), amount]).slice(2);
}

export interface Trc20Metadata {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
}

export async function fetchTrc20Metadata(contractAddress: string, isTestnet: boolean): Promise<Trc20Metadata> {
  const base = getTronApiBase(isTestnet);
  const [nameHex, symbolHex, decimalsHex] = await Promise.all([
    triggerConstant(base, TRON_ZERO_ADDRESS, contractAddress, 'name()', ''),
    triggerConstant(base, TRON_ZERO_ADDRESS, contractAddress, 'symbol()', ''),
    triggerConstant(base, TRON_ZERO_ADDRESS, contractAddress, 'decimals()', ''),
  ]);
  const name = abiCoder.decode(['string'], '0x' + nameHex)[0] as string;
  const symbol = abiCoder.decode(['string'], '0x' + symbolHex)[0] as string;
  const decimals = Number(abiCoder.decode(['uint8'], '0x' + decimalsHex)[0]);
  return { address: contractAddress, name, symbol, decimals };
}

export async function getTrc20Balance(
  contractAddress: string,
  ownerAddress: string,
  isTestnet: boolean,
  decimals: number
): Promise<string> {
  const base = getTronApiBase(isTestnet);
  const resultHex = await triggerConstant(
    base,
    ownerAddress,
    contractAddress,
    'balanceOf(address)',
    encodeAddressParam(ownerAddress)
  );
  const balance = abiCoder.decode(['uint256'], '0x' + resultHex)[0] as bigint;
  return ethers.formatUnits(balance, decimals);
}

export interface SendTrc20Result {
  hash: string;
}

export async function sendTrc20(
  mnemonic: string,
  isTestnet: boolean,
  contractAddress: string,
  toAddress: string,
  amount: string,
  decimals: number
): Promise<SendTrc20Result> {
  const base = getTronApiBase(isTestnet);
  const hdWallet = deriveTronHDWallet(mnemonic);
  const fromAddress = tronAddressFromPrivateKey(hdWallet.privateKey);
  const amountUnits = ethers.parseUnits(amount, decimals);

  const createRes = await fetch(`${base}/wallet/triggersmartcontract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      owner_address: tronAddressToHexPrefixed(fromAddress),
      contract_address: tronAddressToHexPrefixed(contractAddress),
      function_selector: 'transfer(address,uint256)',
      parameter: encodeTransferParam(toAddress, amountUnits),
      fee_limit: 100_000_000,
      call_value: 0,
      visible: false,
    }),
  });
  const created = await createRes.json();
  const unsignedTx = created.transaction;
  if (!unsignedTx?.txID) {
    throw new Error(created.result?.message ? hexToUtf8Safe(created.result.message) : 'Failed to create token transfer');
  }

  const signature = signTronDigest(hdWallet.privateKey, '0x' + unsignedTx.txID);
  const broadcastRes = await fetch(`${base}/wallet/broadcasttransaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...unsignedTx, signature: [signature] }),
  });
  const result = await broadcastRes.json();
  if (!result.result) {
    throw new Error(result.message ? hexToUtf8Safe(result.message) : 'Broadcast failed');
  }
  return { hash: unsignedTx.txID };
}
