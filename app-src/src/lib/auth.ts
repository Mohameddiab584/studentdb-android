// Single-user local lock screen (one device, not networked).
// The password itself is stored ONLY as a salted hash by the platform
// bridge (Electron on Windows, Preferences on Android). Student data
// files are intentionally NOT encrypted (owner's choice): the lock
// screen stops casual opening of the program, it does not hide the
// data files from anyone who can open the app's data folder.

export type AuthBridge = {
  isSet: () => Promise<boolean>;
  set: (password: string) => Promise<{ ok: boolean; message?: string }>;
  verify: (password: string) => Promise<boolean>;
  change: (current: string, next: string) => Promise<{ ok: boolean; message?: string }>;
};

declare global {
  interface Window {
    __auth?: AuthBridge;
  }
}

export function hasAuthBridge(): boolean {
  return typeof window !== 'undefined' && !!window.__auth;
}

// null = no bridge (plain web dev) -> the app opens unlocked.
export async function authIsSet(): Promise<boolean | null> {
  if (!window.__auth) return null;
  return window.__auth.isSet();
}

export async function authSet(password: string): Promise<{ ok: boolean; message?: string }> {
  if (!window.__auth) return { ok: false, message: 'لا توجد واجهة قفل في هذه البيئة.' };
  return window.__auth.set(password);
}

export async function authVerify(password: string): Promise<boolean> {
  if (!window.__auth) return true;
  return window.__auth.verify(password);
}

export async function authChange(
  current: string,
  next: string,
): Promise<{ ok: boolean; message?: string }> {
  if (!window.__auth) return { ok: false, message: 'لا توجد واجهة قفل في هذه البيئة.' };
  return window.__auth.change(current, next);
}
