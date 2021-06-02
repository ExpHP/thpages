import {allBuiltins, defaultBuiltin, SavedSettings, SavedLangSettings, SavedRefOverride, SavedLangMap, LoadedMap} from './settings';
import {validateGame, Game} from '../game-names';

// It occurs to me that this site shares localStorage with everything else under the same domain,
// so we should use prefixed keys.
const LOCAL_STORAGE_KEY_LEGACY_ANMMAP = 'thpages-anmmap';
const LOCAL_STORAGE_KEY_LEGACY_STDMAP = 'thpages-stdmap';
const LOCAL_STORAGE_KEY_OTHER_CONFIG = 'thpages-config';
const LOCAL_STORAGE_KEY_NAMES = 'thpages-names';

export function fixOldLocalStorageKeys() {
  // The old keys will be backwards-compatibly supported for probably at least a year.
  function moveDeprecatedLocalStorageKey(oldKey: string, newKey: string) {
    const oldValue = localStorage.getItem(oldKey);
    if (oldValue != null) {
      localStorage.setItem(newKey, oldValue);
      localStorage.removeItem(oldKey);
    }
  }
  moveDeprecatedLocalStorageKey('anmmap', LOCAL_STORAGE_KEY_LEGACY_ANMMAP);
  moveDeprecatedLocalStorageKey('stdmap', LOCAL_STORAGE_KEY_LEGACY_STDMAP);
  moveDeprecatedLocalStorageKey('config', LOCAL_STORAGE_KEY_OTHER_CONFIG);
}

export function getNameSettingsFromLocalStorage(): SavedSettings {
  try {
    const json = localStorage.getItem(LOCAL_STORAGE_KEY_NAMES);
    if (json) {
      const data = JSON.parse(json);
      if (data.version !== 1) { // version 0 wasn't stored here. (also didn't have a version field...)
        throw new Error(`unexpected settings version: ${data.version}`);
      }
      return {
        anm: data.anm ? parseSavedLangSettingsV1(data.anm) : defaultLangSettings(),
        msg: data.msg ? parseSavedLangSettingsV1(data.msg) : defaultLangSettings(),
        std: data.std ? parseSavedLangSettingsV1(data.std) : defaultLangSettings(),
      };

    } else {
      // Nothing at the new localStorage key.  Try the old ones.
      console.log('V1 config not found. Falling back to V0');
      const fromLangV0 = (lang: LangV0) => {
        const json = localStorage.getItem(localStorageKeyForLangV0[lang]);
        if (json) {
          const data = JSON.parse(json);
          return upgradeLangSettingsToV1(lang, parseSavedLangSettingsV0(lang, data));
        } else {
          return defaultLangSettings();
        }
      };
      return {
        anm: fromLangV0('anm'),
        std: fromLangV0('std'),
        msg: defaultLangSettings(),
      };
    }

  } catch (e) {
    console.error(e);
    console.warn("Using default names due to above error");
    return {
      anm: defaultLangSettings(),
      msg: defaultLangSettings(),
      std: defaultLangSettings(),
    };
  }
}

export function writeNameSettingsToLocalStorage(settings: SavedSettings) {
  function replacer(x: unknown) {
    if (x instanceof Map) {
      const out = {} as any;
      for (const [key, value] of x.entries()) {
        out[key] = value;
      }
      return out;
    }
    return x;
  }
  const json = JSON.stringify(settings, replacer);
  localStorage.setItem(LOCAL_STORAGE_KEY_NAMES, json);
}

function defaultLangSettings(): SavedLangSettings {
  return {
    builtin: 'truth',
    customEnabled: false,
    mapfiles: [],
  };
}

function parseSavedLangSettingsV1(settings: any): SavedLangSettings {
  const builtin = allBuiltins().includes(settings.builtin) ? settings.builtin : defaultBuiltin();
  const customEnabled = [true, false].includes(settings.customEnabled) ? settings.customEnabled : false;
  const mapfiles = parseMapListV1(settings.overrides);
  return {builtin, customEnabled, mapfiles};
}

function parseMapListV1(x: unknown): SavedLangMap[] {
  if (!(x && Array.isArray(x))) {
    throw new TypeError(`expected array, got ${typeof x}`);
  }
  const out = [];
  for (const item of x) {
    try {
      const {name, gameStr} = item;
      const game = validateGame(gameStr);
      if (!game) throw new Error(`expected game, got: ${JSON.stringify(gameStr)}`);
      if (typeof name !== 'string') throw new Error(`expected string, got: ${JSON.stringify(name)}`);
      const mapfile = parseLoadedMapV1(x.map);

      out.push({name, game, mapfile});

    } catch (e) {
      console.error(e);
    }
  }
  return out;
}

function parseLoadedMapV1(x: unknown): LoadedMap {
  return parseLoadedMapV0(x);
}

// function parseRefOverridesV1(x: unknown): Map<string, SavedRefOverride> {
//   if (!(x && typeof x == 'object')) {
//     throw new TypeError(`expected object, got ${typeof x}`);
//   }
//   const out = new Map<string, SavedRefOverride>();
//   for (const [key, value] of Object.entries(x)) {
//     if (!(value && typeof value == 'object')) throw new Error(`expected string, got: ${JSON.stringify(value)}`);

//     const value2 = value as {name?: string};
//     if (typeof value2.name !== 'string') throw new Error(`expected string, got: ${JSON.stringify(value2.name)}`);
//     out.set(key, {name: value2.name});
//   }
//   return out;
// }

function upgradeLangSettingsToV1(language: LangV0, settings: SavedLangSettingsV0): SavedLangSettings {
  // we used to have 'raw'/'auto' on a per-version basis, now it's per-language.  Choose the most common.
  const allMapSettings = [...settings.values()];
  const rawCount = allMapSettings.filter((x) => x === 'raw').length;
  const autoCount = allMapSettings.filter((x) => x === 'auto').length;
  const builtin = (autoCount >= rawCount) ? 'truth' : 'raw';

  const mapfiles = [];
  let customEnabled = false;
  for (const version of allLangVersionsV0(language)) {
    const thisVersionSettings = settings.get(version);
    if (thisVersionSettings) {
      if (thisVersionSettings !== 'raw' && thisVersionSettings !== 'auto') {
        customEnabled = true;
        mapfiles.push({
          name: `old ${version} mapfile`,
          game: latestGameForVersionV0(language, version),
          mapfile: thisVersionSettings,
        });
      }
    }
  }
  return {builtin, customEnabled, mapfiles};
}

// =============================================================================
// Legacy settings (V0)

// The old config for mapfiles stored one for each "version" of a language.  (a concept that no longer exists on the website)
type LangV0 = 'anm' | 'std';
type VersionV0 = string;
const latestGameForAnmVersionV0: Record<VersionV0, Game> = {'v0': '06', 'v2': '07', 'v3': '09', 'v4': '128', 'v8': '18'};
const latestGameForStdVersionV0: Record<VersionV0, Game> = {'eosd': '06', 'classic': '09', 'modern': '18'};
const localStorageKeyForLangV0: Record<LangV0, string> = {'anm': LOCAL_STORAGE_KEY_LEGACY_ANMMAP, 'std': LOCAL_STORAGE_KEY_LEGACY_STDMAP};

function allLangVersionsV0(lang: LangV0): VersionV0[] {
  if (lang === 'anm') { return ['v0', 'v2', 'v3', 'v4', 'v8']; }
  else if (lang === 'std') { return ['eosd', 'classic', 'modern']; }
  else { throw new Error(`bad legacy lang ${lang}`); }
}
function latestGameForVersionV0(lang: LangV0, version: VersionV0): Game {
  if (lang === 'anm') { return latestGameForAnmVersionV0[version]; }
  else if (lang === 'std') { return latestGameForStdVersionV0[version]; }
  else { throw new Error(`bad legacy lang ${lang}`); }
}

type SavedLangSettingsV0 = Map<string, SingleMapSettingV0>;
type SingleMapSettingV0 = 'raw' | 'auto' | LoadedMap;

function parseSavedLangSettingsV0(language: LangV0, x: unknown): SavedLangSettingsV0 {
  if (!(x && typeof x === 'object')) throw new TypeError(`expected object, got ${typeof x}`);

  const xobj = x as Record<string, unknown>;
  const out = new Map<string, SingleMapSettingV0>();
  for (const version of allLangVersionsV0(language)) {
    const innerJson = xobj[version];
    if (innerJson != null) {
      out.set(version, parseSingleMapSettingV0(innerJson));
    }
  }
  return out;
}

function parseSingleMapSettingV0(x: unknown): SingleMapSettingV0 {
  if (x === 'raw') return x;
  if (x === 'auto') return x;
  if (x && typeof x === 'object') return parseLoadedMapV0(x);
  throw new Error('invalid stored map');
}

function parseLoadedMapV0(x: unknown): LoadedMap {
  const {ins, vars, timeline} = x as {ins?: unknown, vars?: unknown, timeline?: unknown};
  return {
    ins: parseNumberMapJson(ins || {}),
    vars: parseNumberMapJson(vars || {}),
    timeline: parseNumberMapJson(timeline || {}),
  };
}

function parseNumberMapJson(x: unknown): Map<number, string> {
  if (!(x && typeof x == 'object')) {
    throw new TypeError(`expected object, got ${typeof x}`);
  }
  const out = new Map<number, string>();
  for (const [key, value] of Object.entries(x)) {
    if (typeof value !== 'string') throw new Error(`expected string, got: ${JSON.stringify(value)}`);
    const int = parseIntegerIndex(key);
    out.set(int, value);
  }
  return out;
}

// Parse a string to integer, but only if it contains the canonical form of an integer
// as would be produced by toString.
function parseIntegerIndex(str: string) {
  const n = Math.floor(Number(str));
  if (Math.abs(n) === Infinity || n !== n || n < 0) throw new Error(`not a non-negative integer: ${str}`);
  if (String(n) !== str) throw new Error(`non-canonical form of number: ${str}`);
  return n;
}
