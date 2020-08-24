import {MD} from './main.js';
import {Eclmap} from './anm/eclmap';
import dedent from './lib/dedent';
import {SupportedAnmVersion, SUPPORTED_ANM_VERSIONS, ANM_VERSION_DATA} from './anm/versions';
import {readFileSync} from "fs";

const LOCAL_STORAGE_KEY_ANMMAP = 'anmmap';

// --------------------------------------------------------------
// API for loading settings so they can be used from javascript code.

/** A cache so that getCurrentAnmmaps can be called even in reasonably tight loops. */
let currentAnmmaps: LoadedAnmMaps | null = null;

/** Get objects with all info from the user's configured anmmaps. */
export function getCurrentAnmmaps() {
  if (currentAnmmaps == null) {
    const out = storageLoadAnmmaps();
    currentAnmmaps = out;
    return out;
  }
  return currentAnmmaps;
}

/** Clear caches for all `getCurrent__` functions. Suitable for use whenever a page is loaded. */
export function clearSettingsCache() {
  currentAnmmaps = null;
}

// --------------------------------------------------------------
// Functions that implement the settings page.

export function initSettings() {
  (window as any).buildSettingsPage = buildSettingsPage;
}

/** Selects things on the settings page to match the stored settings. */
function setupSettingsPageInitialState() {
  resetSettingsPageAnmmapsFromStorage();
}

/** Generates HTML for the settings page. */
function buildSettingsPage() {
  buildAnmmapSelector(document.querySelector<HTMLElement>('#upload-anmmaps')!);
  setupSettingsPageInitialState();
  setupSettingsPageHooks();
}

/** Generates HTML for the anmmaps selector. */
function buildAnmmapSelector($div: HTMLElement) {
  $div.classList.add('map-files');
  $div.innerHTML = /* HTML */`
    <div class="rows"></div>
    <button class='confirm' disabled='true'></button>
    <div class="save-status"></div>
  `;
  const $rows = document.querySelector('.rows')!;

  let rowsHtml = '';
  for (const version of SUPPORTED_ANM_VERSIONS) {
    const {minGame, maxGame} = ANM_VERSION_DATA[version];
    rowsHtml += dedent(/* html */`
      <div class="row ${version}">
        <div class='col label'>${version} (TH[game-num=${minGame}]&ndash;[game-num=${maxGame}])</div>
        <div class='col raw'>
          <input type='radio' id='anmmap-${version}-raw' name='anmmap-${version}'>
          <label for='anmmap-${version}-raw'></label>
        </div>
        <div class='col auto'>
          <input type='radio' id='anmmap-${version}-auto' name='anmmap-${version}'>
          <label for='anmmap-${version}-auto'></label>
        </div>
        <div class='col file'>
          <input type='radio' id='anmmap-${version}-file' name='anmmap-${version}'>
          <label for='anmmap-${version}-file'><input type='file'></label>
        </div>
        <div class='col status'></div>
      </div>
    `);
  }

  $rows.innerHTML = MD.makeHtml(rowsHtml);
}

function resetSettingsPageAnmmapsFromStorage() {
  const $maps = document.querySelector('#upload-anmmaps');
  if (!$maps) throw new Error('not on settings page!');

  const $rows = $maps.querySelector('.rows')!;
  for (const $input of $rows.querySelectorAll('input')) {
    $input.disabled = false;
  }

  const anmmapSettings = storageReadAnmmapsOrDefault();
  for (const version of SUPPORTED_ANM_VERSIONS) {
    const setting = anmmapSettings[version];
    const $row = $maps.querySelector(`.row.${version}`) as HTMLElement;
    const {$rawRadio, $autoRadio, $fileRadio, $fileUpload, $status} = getMapSettingsRowStuff($row);

    if (setting === 'raw') {
      $rawRadio.checked = true;
      $status.innerHTML = 'using raw names';
    } else if (setting == 'auto') {
      $autoRadio.checked = true;
      $status.innerHTML = 'using default map';
    } else {
      $fileRadio.checked = true;
      $status.innerHTML = 'using stored file';
    }
    $fileUpload.disabled = !$fileRadio.checked;
  }
  const $confirmButton = $maps.querySelector('button.confirm') as HTMLButtonElement;
  $confirmButton.disabled = true;
}

/** Sets up event hooks on the Settings page. */
function setupSettingsPageHooks() {
  const $maps = document.querySelector('#upload-anmmaps');
  if (!$maps) throw new Error('not on settings page!');

  const $rows = $maps.querySelector('.rows')!;
  const $confirmButton = $maps.querySelector('button.confirm') as HTMLButtonElement;
  for (const $input of $rows.querySelectorAll('input')) {
    $input.addEventListener('change', () => {
      for (const $row of $rows.querySelectorAll<HTMLElement>('.row')) {
        const {$fileRadio, $fileUpload} = getMapSettingsRowStuff($row);
        $fileUpload.disabled = !$fileRadio.checked;
      }
      $confirmButton.disabled = false;
      setMapsSaveStatus($maps, 'unsaved');
    });
  }

  $confirmButton.addEventListener('click', () => {
    saveNewAnmmapSettingsFromPage().then(
        () => {},
        (err) => {
          window.alert(`Error: ${err}`);
          resetSettingsPageAnmmapsFromStorage();
        },
    );
  });
}

function getMapSettingsRowStuff($row: HTMLElement) {
  return {
    $rawRadio: $row.querySelector('.raw input[type="radio"]') as HTMLInputElement,
    $autoRadio: $row.querySelector('.auto input[type="radio"]') as HTMLInputElement,
    $fileRadio: $row.querySelector('.file input[type="radio"]') as HTMLInputElement,
    $fileUpload: $row.querySelector('.file input[type="file"]') as HTMLInputElement,
    $status: $row.querySelector('.col.status') as HTMLElement,
  };
}

async function saveNewAnmmapSettingsFromPage() {
  const $maps = document.querySelector('#upload-anmmaps');
  if (!$maps) throw new Error('not on settings page!');

  const oldValue = localStorage.getItem(LOCAL_STORAGE_KEY_ANMMAP);
  try {
    const anmmapSettings = await readAnmmapSettingsFromPage($maps);
    localStorage.setItem(LOCAL_STORAGE_KEY_ANMMAP, JSON.stringify(anmmapSettings));

    // Just check to make sure they can be loaded without errors...
    storageReadAnmmapsOrThrow();
    setMapsSaveStatus($maps, 'success');
  } catch (e) {
    console.error(e);
    setMapsSaveStatus($maps, 'error');
    restoreLocalStorageItem(LOCAL_STORAGE_KEY_ANMMAP, oldValue);
  }

  resetSettingsPageAnmmapsFromStorage();
}

async function readAnmmapSettingsFromPage($maps: Element) {
  const $rows = $maps.querySelector('.rows')!;
  for (const $input of $rows.querySelectorAll('input')) {
    $input.disabled = true;
  }

  // begin with current settings for reason described below.
  const anmmapSettings = storageReadAnmmapsOrDefault();
  for (const version of SUPPORTED_ANM_VERSIONS) {
    const $row = $maps.querySelector(`.row.${version}`) as HTMLElement;
    const {$rawRadio, $autoRadio, $fileRadio, $fileUpload} = getMapSettingsRowStuff($row);

    if ($rawRadio.checked) anmmapSettings[version] = 'raw';
    else if ($autoRadio.checked) anmmapSettings[version] = 'auto';
    else if ($fileRadio.checked) {
      // If no file was uploaded during the current page visit, it is very likely because
      // anmmapSettings already contains a loaded file, so we should just keep that.
      if ($fileUpload.files!.length === 0) continue;

      const text = await readUploadedFile($fileUpload.files![0]);
      anmmapSettings[version] = parseMapText(text);
    }
    loadMapFromSetting(version, anmmapSettings[version]);
  }

  return anmmapSettings;
}

/**
 * like localStorage.setItem, but deletes on null instead of stringifying it,
 * with the expectation that the argument previously came from getItem.
 */
function restoreLocalStorageItem(key: string, value: string | null) {
  if (value == null) localStorage.removeItem(key);
  else localStorage.setItem(key, value);
}

function setMapsSaveStatus($maps: Element, status: null | 'success' | 'error' | 'unsaved') {
  const classes = $maps.querySelector('.save-status')!.classList;
  classes.remove('success');
  classes.remove('unsaved');
  classes.remove('error');
  if (status !== null) {
    classes.add(status);
  }
}

// --------------------------------------------------------------
// Settings implementation.

export const DEFAULT_ANMM_TEXT: {[v in SupportedAnmVersion]: string} = {
  'v3': readFileSync(__dirname + '/../static/eclmap/anmmap/v3.anmm', 'utf8'),
  'v4': readFileSync(__dirname + '/../static/eclmap/anmmap/v4.anmm', 'utf8'),
  'v8': readFileSync(__dirname + '/../static/eclmap/anmmap/v8.anmm', 'utf8'),
};

export type LoadedAnmMaps = {[v in SupportedAnmVersion]: LoadedMap};
export type AnmMapSettings = {[v in SupportedAnmVersion]: MapSetting};

/** Form of an ECLMap stored in memory. */
export type LoadedMap = {ins: NumberMap, vars: NumberMap};
/** Form of an ECLMap setting that gets JSONified and saved in localStorage. */
export type MapSetting = 'raw' | 'auto' | LoadedMap;
export type NumberMap = Record<number, string>;

/** Initializes ANM maps, possibly from localStorage. */
function storageLoadAnmmaps(): LoadedAnmMaps {
  const settings = storageReadAnmmapsOrDefault();
  const out = {} as Record<SupportedAnmVersion, LoadedMap>;
  for (const version of SUPPORTED_ANM_VERSIONS) {
    out[version] = loadMapFromSetting(version, settings[version]);
  }
  return out;
}

/** Get the settings for ANM maps. */
function storageReadAnmmapsOrThrow(): AnmMapSettings {
  const text = localStorage.getItem('anmmap') || '{}';
  const json = JSON.parse(text);
  return parseSettingAnmmapJson(json);
}

function storageReadAnmmapsOrDefault(): AnmMapSettings {
  const text = localStorage.getItem('anmmap') || '{}';
  const json = JSON.parse(text);
  try {
    return parseSettingAnmmapJson(json);
  } catch (e) {
    console.error(`ignoring saved anmmaps due to an error`, e);
    return {'v3': 'auto', 'v4': 'auto', 'v8': 'auto'};
  }
}

function loadMapFromSetting(version: SupportedAnmVersion, m: MapSetting): LoadedMap {
  if (m === 'raw') return {ins: {}, vars: {}};
  if (m === 'auto') return parseMapText(DEFAULT_ANMM_TEXT[version]);
  return m;
}

function parseMapText(s: string): LoadedMap {
  const eclmap = new Eclmap(s);
  const out: LoadedMap = {ins: {}, vars: {}};
  for (const opcode of eclmap.opcodes()) {
    out.ins[opcode as number] = eclmap.getMnemonic(opcode);
  }
  for (const num of eclmap.globalNums()) {
    out.vars[num as number] = eclmap.getGlobal(num);
  }
  return out;
}

function parseSettingAnmmapJson(x: unknown): AnmMapSettings {
  if (!(x && typeof x === 'object')) throw new TypeError(`expected object, got ${typeof x}`);

  const xobj = x as Record<SupportedAnmVersion, unknown>;
  const out = {} as Record<SupportedAnmVersion, MapSetting>;
  for (const version of SUPPORTED_ANM_VERSIONS) {
    out[version] = parseStoredMapJson(xobj[version] || 'auto');
  }
  return out;
}

function parseStoredMapJson(x: unknown): MapSetting {
  if (x === 'raw') return x;
  if (x === 'auto') return x;
  if (x && typeof x === 'object') {
    const {ins, vars} = x as {ins?: unknown, vars?: unknown};
    return {
      ins: parseNumberMapJson(ins || {}),
      vars: parseNumberMapJson(vars || {}),
    };
  }
  throw new Error('invalid stored map');
}

function parseNumberMapJson(x: unknown) {
  if (!(x && typeof x == 'object')) {
    throw new TypeError(`expected object, got ${typeof x}`);
  }
  const out: NumberMap = {};
  for (const [key, value] of Object.entries(x)) {
    if (typeof value !== 'string') throw new Error(`expected string, got: ${value}`);
    const int = parseIntegerIndex(key);
    out[int] = value;
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

async function readUploadedFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
