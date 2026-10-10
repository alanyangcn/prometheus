type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>;
export function readPreference(storage: PreferenceStorage, key: string, fallback: string): string {
  try { return storage.getItem(`prometheus:settings:${key}`) || fallback; } catch { return fallback; }
}
export function writePreference(storage: PreferenceStorage, key: string, value: string) {
  try { storage.setItem(`prometheus:settings:${key}`, value); } catch { /* Controls remain usable when browser storage is blocked. */ }
}
