import * as storage from './storage';
import { verifyPin } from './pin';

// Shared by app-unlock and by the per-transaction PIN confirmation in
// SendScreen, so brute-forcing either one hits the same lockout.
const MAX_ATTEMPTS_BEFORE_LOCKOUT = 5;
const BASE_LOCKOUT_SECONDS = 30;
const MAX_LOCKOUT_SECONDS = 3600;

export interface PinCheckResult {
  ok: boolean;
  message?: string;
}

export async function checkPin(pin: string): Promise<PinCheckResult> {
  const lockoutUntil = await storage.getLockoutUntil();
  if (lockoutUntil > Date.now()) {
    const seconds = Math.ceil((lockoutUntil - Date.now()) / 1000);
    return { ok: false, message: `Too many attempts. Try again in ${seconds}s.` };
  }

  const storedHash = await storage.getPinHash();
  if (!storedHash) {
    return { ok: false, message: 'No PIN set on this device.' };
  }

  const valid = await verifyPin(pin, storedHash);
  if (!valid) {
    const failCount = (await storage.getPinFailCount()) + 1;
    await storage.setPinFailCount(failCount);
    if (failCount >= MAX_ATTEMPTS_BEFORE_LOCKOUT) {
      const lockoutSeconds = Math.min(
        BASE_LOCKOUT_SECONDS * 2 ** (failCount - MAX_ATTEMPTS_BEFORE_LOCKOUT),
        MAX_LOCKOUT_SECONDS
      );
      await storage.setLockoutUntil(Date.now() + lockoutSeconds * 1000);
      return { ok: false, message: `Too many failed attempts. Locked for ${lockoutSeconds}s.` };
    }
    return { ok: false, message: `Incorrect PIN. ${MAX_ATTEMPTS_BEFORE_LOCKOUT - failCount} attempt(s) remaining.` };
  }

  await storage.setPinFailCount(0);
  await storage.setLockoutUntil(0);
  return { ok: true };
}
