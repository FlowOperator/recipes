import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

const LAST_ACTIVITY_KEY = 'recipe-site:lastActivityAt';
const IDLE_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000; // 30 days (Requirement 18.5)

/**
 * Pure function: given the timestamp of last activity and the current time
 * (both epoch milliseconds), returns whether the session should be treated
 * as expired due to inactivity.
 *
 * Feature: personal-recipe-website, Property 37: Idle session expiry boundary
 */
export function isSessionExpired(lastActivityAt: number, now: number): boolean {
  return now - lastActivityAt >= IDLE_TIMEOUT_MS;
}

export function recordActivity(now: number = Date.now()): void {
  localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
}

export function getLastActivity(): number {
  const raw = localStorage.getItem(LAST_ACTIVITY_KEY);
  return raw ? Number(raw) : Date.now();
}

export function clearActivity(): void {
  localStorage.removeItem(LAST_ACTIVITY_KEY);
}

export interface SignInResult {
  ok: boolean;
  errorMessage?: string;
}

/**
 * Requirement 18.1-18.3: sign in with email/password, no public sign-up path
 * is exposed anywhere in this app.
 */
export async function signIn(email: string, password: string): Promise<SignInResult> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { ok: false, errorMessage: 'Invalid email or password.' };
  }
  recordActivity();
  return { ok: true };
}

/**
 * Requirement 18.4: sign-out terminates the session and requires
 * re-authentication before any subsequent access.
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  clearActivity();
}

/**
 * Requirement 18.1-18.2, 18.5: returns the current session only if one
 * exists AND it has not been idle for 30+ days. If idle-expired, the
 * session is proactively signed out so the Owner isn't left with a dead
 * session that appears logged in.
 */
export async function getActiveSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) {
    return null;
  }

  const lastActivityAt = getLastActivity();
  if (isSessionExpired(lastActivityAt, Date.now())) {
    await signOut();
    return null;
  }

  recordActivity();
  return session;
}
