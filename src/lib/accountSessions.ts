import { UserProfile } from './firebase';

const SAVED_ACCOUNTS_KEY = 'telapp_saved_accounts';

export function getSavedAccounts(): UserProfile[] {
  try {
    const raw = localStorage.getItem(SAVED_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAccountToSessions(profile: UserProfile): UserProfile[] {
  try {
    const existing = getSavedAccounts();
    const filtered = existing.filter(u => u.uid !== profile.uid);
    const updated = [profile, ...filtered];
    localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [profile];
  }
}

export function removeAccountFromSessions(uid: string): UserProfile[] {
  try {
    const existing = getSavedAccounts();
    const updated = existing.filter(u => u.uid !== uid);
    localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}
