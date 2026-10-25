// Android (Capacitor) bridges. This module is a no-op on desktop/web:
// it only defines bridges when the app runs inside the native shell.
//
// - window.__auth: same shape as the Electron bridge, but the password
//   hash lives in Capacitor Preferences and the hash is PBKDF2-SHA-256
//   via WebCrypto (Capacitor serves over https://localhost, a secure
//   context, so crypto.subtle is available).
// - window.__shareFile: browser downloads don't land in a visible file
//   on Android, so exports and printable pages are saved to the app
//   cache and handed to the Android share sheet instead.
//
// The data layer itself needs no change: it is pure localStorage,
// which the Android WebView persists like the desktop shell does.

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

declare global {
  interface Window {
    __shareFile?: (fileName: string, blob: Blob) => Promise<void>;
  }
}

const AUTH_KEY = 'studentdb-auth';

type StoredAuth = { salt: string; hash: string };

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomSaltHex(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toHex(bytes.buffer);
}

async function deriveHash(password: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = new Uint8Array(
    saltHex.match(/../g)!.map((h) => parseInt(h, 16)),
  );
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  return toHex(bits);
}

async function readStored(): Promise<StoredAuth | null> {
  try {
    const { value } = await Preferences.get({ key: AUTH_KEY });
    if (!value) return null;
    const obj = JSON.parse(value) as unknown;
    if (obj && typeof obj === 'object') {
      const o = obj as Record<string, unknown>;
      if (typeof o.salt === 'string' && typeof o.hash === 'string') {
        return { salt: o.salt, hash: o.hash };
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function initCapacitorBridges(): void {
  if (!Capacitor.isNativePlatform()) return;

  window.__auth = {
    isSet: async () => (await readStored()) !== null,
    set: async (password) => {
      if (password.length < 4) {
        return { ok: false, message: 'كلمة السر قصيرة جدًا (4 أحرف على الأقل).' };
      }
      if (await readStored()) return { ok: false, message: 'كلمة السر مضبوطة بالفعل.' };
      const salt = randomSaltHex();
      await Preferences.set({
        key: AUTH_KEY,
        value: JSON.stringify({ salt, hash: await deriveHash(password, salt) }),
      });
      return { ok: true };
    },
    verify: async (password) => {
      const a = await readStored();
      if (!a) return false;
      return (await deriveHash(password, a.salt)) === a.hash;
    },
    change: async (current, next) => {
      const a = await readStored();
      if (!a) return { ok: false, message: 'لا توجد كلمة سر مضبوطة.' };
      if (next.length < 4) {
        return { ok: false, message: 'كلمة السر الجديدة قصيرة جدًا (4 أحرف على الأقل).' };
      }
      if ((await deriveHash(current, a.salt)) !== a.hash) {
        return { ok: false, message: 'كلمة السر الحالية غير صحيحة.' };
      }
      const salt = randomSaltHex();
      await Preferences.set({
        key: AUTH_KEY,
        value: JSON.stringify({ salt, hash: await deriveHash(next, salt) }),
      });
      return { ok: true };
    },
  };

  window.__shareFile = async (fileName, blob) => {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache });
    const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
    await Share.share({ title: fileName, url: uri, dialogTitle: 'مشاركة الملف' });
  };
}
