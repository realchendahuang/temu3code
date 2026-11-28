/// <reference types="vite/client" />
import en from './locales/en';
import zhCN from './locales/zh-cn';
import type { Lang, TowerBaseType, TowerBranch } from './types';

export type LocaleDict = Record<string, string>;

export interface LangMeta {
  code: Lang;
  short: string;
  name: string;
  dir: 'ltr' | 'rtl';
}

export const LANGUAGES: readonly LangMeta[] = [
  { code: 'en', short: 'EN', name: 'English', dir: 'ltr' },
  { code: 'zh-CN', short: '简', name: '简体中文', dir: 'ltr' },
  { code: 'zh-TW', short: '繁', name: '繁體中文', dir: 'ltr' },
  { code: 'ja', short: 'JA', name: '日本語', dir: 'ltr' },
  { code: 'ko', short: 'KO', name: '한국어', dir: 'ltr' },
  { code: 'fr', short: 'FR', name: 'Français', dir: 'ltr' },
  { code: 'es', short: 'ES', name: 'Español', dir: 'ltr' },
  { code: 'de', short: 'DE', name: 'Deutsch', dir: 'ltr' },
  { code: 'pt-BR', short: 'PT', name: 'Português', dir: 'ltr' },
  { code: 'ru', short: 'RU', name: 'Русский', dir: 'ltr' },
  { code: 'ar', short: 'AR', name: 'العربية', dir: 'rtl' },
  { code: 'it', short: 'IT', name: 'Italiano', dir: 'ltr' },
  { code: 'nl', short: 'NL', name: 'Nederlands', dir: 'ltr' },
  { code: 'pl', short: 'PL', name: 'Polski', dir: 'ltr' },
  { code: 'tr', short: 'TR', name: 'Türkçe', dir: 'ltr' },
  { code: 'vi', short: 'VI', name: 'Tiếng Việt', dir: 'ltr' },
  { code: 'id', short: 'ID', name: 'Bahasa Indonesia', dir: 'ltr' },
  { code: 'hi', short: 'HI', name: 'हिन्दी', dir: 'ltr' },
] as const;

const LANG_MAP = new Map<Lang, LangMeta>(LANGUAGES.map((meta) => [meta.code, meta]));
const VALID_CODES = new Set<string>(LANGUAGES.map((meta) => meta.code));

export function normalizeLang(raw?: string | null): Lang {
  if (!raw) return 'en';
  const trimmed = String(raw).trim();
  if (VALID_CODES.has(trimmed)) return trimmed as Lang;

  const low = trimmed.toLowerCase().replaceAll('_', '-');
  if (
    low === 'zh' ||
    low.startsWith('zh-cn') ||
    low.startsWith('zh-sg') ||
    low.startsWith('zh-hans')
  ) {
    return 'zh-CN';
  }
  if (
    low.startsWith('zh-tw') ||
    low.startsWith('zh-hk') ||
    low.startsWith('zh-mo') ||
    low.startsWith('zh-hant')
  ) {
    return 'zh-TW';
  }
  if (low === 'pt' || low.startsWith('pt-')) {
    return 'pt-BR';
  }

  for (const meta of LANGUAGES) {
    if (meta.code.toLowerCase() === low) return meta.code;
  }
  const base = low.split('-')[0];
  for (const meta of LANGUAGES) {
    if (meta.code.toLowerCase() === base) return meta.code;
  }
  return 'en';
}

export function getLangMeta(lang: Lang): LangMeta {
  return LANG_MAP.get(lang) ?? LANGUAGES[0];
}

// Built-in synchronous locales (English + Simplified Chinese); remaining 16 code-split via Vite glob.
const loadedLocales = new Map<Lang, LocaleDict>([
  ['en', en],
  ['zh-CN', zhCN],
]);

type LocaleModuleLoader = () => Promise<{ default: LocaleDict }>;

const RAW_EXTRA_LOADERS = import.meta.glob<{ default: LocaleDict }>([
  './locales/*.ts',
  '!./locales/en.ts',
  '!./locales/zh-cn.ts',
]);

const EXTRA_LOADERS = new Map<string, LocaleModuleLoader>();
for (const [path, loader] of Object.entries(RAW_EXTRA_LOADERS)) {
  const fileCode = path.replace(/^.*\//, '').replace(/\.ts$/, '').toLowerCase();
  EXTRA_LOADERS.set(fileCode, loader);
}

const inFlightLoads = new Map<Lang, Promise<void>>();

export function isLocaleLoaded(lang: Lang): boolean {
  return loadedLocales.has(normalizeLang(lang));
}

export async function loadLocale(lang: Lang): Promise<void> {
  const norm = normalizeLang(lang);
  if (loadedLocales.has(norm)) return;

  const existing = inFlightLoads.get(norm);
  if (existing) return existing;

  const loader = EXTRA_LOADERS.get(norm.toLowerCase());
  if (!loader) {
    // Locale chunk not present yet — safe fallback to English
    return;
  }

  const task = loader()
    .then((mod) => {
      if (mod && mod.default && typeof mod.default === 'object') {
        loadedLocales.set(norm, mod.default);
      }
    })
    .catch(() => {
      // Safe fallback to English if a dynamic chunk fails to load
    })
    .finally(() => {
      inFlightLoads.delete(norm);
    });

  inFlightLoads.set(norm, task);
  return task;
}

export function t(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const dict = loadedLocales.get(lang);
  let str = dict?.[key] ?? en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replaceAll(`{${k}}`, String(v));
    }
  }
  return str;
}

export function getTowerTitle(lang: Lang, type: TowerBaseType, branch: TowerBranch): string {
  if (branch === 'none') return t(lang, `tower.${type}.name`);
  return t(lang, `tower.${type}.${branch}.name`);
}

export function getTowerDesc(lang: Lang, type: TowerBaseType, branch: TowerBranch): string {
  if (branch === 'none') return t(lang, `tower.${type}.desc`);
  return t(lang, `tower.${type}.${branch}.desc`);
}

export function getTowerTag(lang: Lang, type: TowerBaseType, branch: TowerBranch): string {
  if (branch === 'none') return t(lang, `tower.${type}.tag`);
  return t(lang, `tower.${type}.${branch}.tag`);
}

export function getHeroBubbles(lang: Lang): {
  vip: string[];
  rage: string[];
  apology: string[];
} {
  return {
    vip: [
      t(lang, 'hero.vip.0'),
      t(lang, 'hero.vip.1'),
      t(lang, 'hero.vip.2'),
      t(lang, 'hero.vip.3'),
    ],
    rage: [
      t(lang, 'hero.rage.0'),
      t(lang, 'hero.rage.1'),
      t(lang, 'hero.rage.2'),
      t(lang, 'hero.rage.3'),
    ],
    apology: [
      t(lang, 'hero.apology.0'),
      t(lang, 'hero.apology.1'),
      t(lang, 'hero.apology.2'),
    ],
  };
}
