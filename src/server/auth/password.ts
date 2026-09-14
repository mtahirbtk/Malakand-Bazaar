import "server-only";
import { hash, verify, type Algorithm } from "@node-rs/argon2";

/**
 * Password hashing.
 *
 * Argon2id at the OWASP 2024 baseline: 19 MiB of memory, two passes, one lane.
 * Memory-hard by design — the cost that matters against a GPU farm is RAM per
 * guess, which is what bcrypt cannot raise.
 *
 * The parameters are stored inside the PHC string the hash produces, so they
 * can be raised later and old hashes still verify; `needsRehash` below tells
 * the login path when to upgrade one transparently.
 */

/**
 * `Algorithm` is an ambient const enum, which `isolatedModules` forbids
 * importing as a value — hence the literal. 2 is Argon2id; the assertion below
 * makes a change to that mapping a compile error rather than a silent
 * downgrade to Argon2d.
 */
const ARGON2ID = 2 satisfies Algorithm;

const PARAMS = {
  algorithm: ARGON2ID,
  memoryCost: 19_456, // KiB
  timeCost: 2,
  parallelism: 1,
} as const;

export const MIN_PASSWORD_LENGTH = 8;
/**
 * Argon2 has no practical input ceiling, but an unbounded body is a cheap way
 * to burn CPU. 200 characters is far beyond any real passphrase.
 */
export const MAX_PASSWORD_LENGTH = 200;

export function hashPassword(password: string): Promise<string> {
  return hash(password, PARAMS);
}

export async function verifyPassword(storedHash: string, password: string): Promise<boolean> {
  try {
    return await verify(storedHash, password, PARAMS);
  } catch {
    // A malformed or truncated hash must read as "wrong password", never as an
    // exception that a caller might treat as success.
    return false;
  }
}

/**
 * A real Argon2id hash of a value no one can log in with.
 *
 * Login verifies against this when the phone number is unknown, so a request
 * for a non-existent account costs the same time as a wrong password. Without
 * it, response latency alone tells an attacker which numbers are registered.
 */
let dummyHashPromise: Promise<string> | null = null;

export function dummyHash(): Promise<string> {
  dummyHashPromise ??= hashPassword(
    "argon2-timing-equaliser-not-a-credential-cbd0a3f1e27b4c56"
  );
  return dummyHashPromise;
}

export async function burnTimingBudget(password: string): Promise<void> {
  await verifyPassword(await dummyHash(), password);
}

/** True when a stored hash was produced with weaker parameters than we use now. */
export function needsRehash(storedHash: string): boolean {
  const m = storedHash.match(/\$m=(\d+),t=(\d+),p=(\d+)/);
  if (!m) return true;
  const [, memory, time, lanes] = m;
  return (
    Number(memory) < PARAMS.memoryCost ||
    Number(time) < PARAMS.timeCost ||
    Number(lanes) < PARAMS.parallelism
  );
}
