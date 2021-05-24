import {MD} from './markdown';
import {Eclmap} from './anm/eclmap';
import dedent from './lib/dedent';
import {globalNames, PrefixResolver, Context} from './resolver';
import {
  SupportedAnmVersion, StdVersion, MsgVersion, VersionData as OldVersionData,
  SUPPORTED_ANM_VERSIONS, ANM_VERSION_DATA, SUPPORTED_STD_VERSIONS, STD_VERSION_DATA,
  GAME_ANM_VERSIONS, SUPPORTED_MSG_VERSIONS, MSG_VERSION_DATA, GAME_MSG_VERSIONS, GAME_STD_VERSIONS,
} from './anm/versions';
import {queryGame} from './url-format';
import {Game, allGames} from './game-names';
import {readFileSync} from 'fs';
import {TableHandlers, QualifiedOpcode, getAnmInsHandlers, getAnmVarHandlers, getStdHandlers, getMsgHandlers, InsData, VarData} from './anm/tables';
import {readUploadedFile, cached, StrMap} from './util';

// It occurs to me that this site shares localStorage with everything else under the same domain,
// so we should use prefixed keys.
const LOCAL_STORAGE_KEY_ANMMAP = 'thpages-anmmap';
const LOCAL_STORAGE_KEY_STDMAP = 'thpages-stdmap';
const LOCAL_STORAGE_KEY_OTHER_CONFIG = 'thpages-config';
const LOCAL_STORAGE_KEY_UNUSED_DUMMY = 'thpages-__unused_dummy_key';

// The old keys will be backwards-compatibly supported for probably at least a year.
function moveDeprecatedLocalStorageKey(oldKey: string, newKey: string) {
  const oldValue = localStorage.getItem(oldKey);
  if (oldValue != null) {
    localStorage.setItem(newKey, oldValue);
    localStorage.removeItem(oldKey);
  }
}
moveDeprecatedLocalStorageKey('anmmap', LOCAL_STORAGE_KEY_ANMMAP);
moveDeprecatedLocalStorageKey('stdmap', LOCAL_STORAGE_KEY_STDMAP);
moveDeprecatedLocalStorageKey('config', LOCAL_STORAGE_KEY_OTHER_CONFIG);
localStorage.removeItem(LOCAL_STORAGE_KEY_UNUSED_DUMMY); // nothing should ever be here

export type Config = {
  /**
   * On the stats table page, freeze the first column and header row.
   * This looks buggy on some browsers that I can't easily test on.
   */
  'freeze-stats-headers': boolean,
};

const DEFAULT_CONFIG: Config = {
  'freeze-stats-headers': true,
};

export const globalConfigNames = new PrefixResolver<string>();
globalNames.registerPrefix('cfg', globalConfigNames);

// --------------------------------------------------------------
// API for loading settings so they can be used from javascript code.

/** A cache so that getCurrentAnmmaps can be called even in reasonably tight loops. */
const currentVersionAnmmaps = cached(() => storageLoadMaps(anmmapSet));
const currentVersionStdmaps = cached(() => storageLoadMaps(stdmapSet));
const currentMapNamesDone = cached(() => convertOldVersionConfigToNewConfig());
const currentConfig = cached(() => storageLoadConfigOrDefault());

function getCurrentVersionAnmmaps() { return currentVersionAnmmaps.get(); }
function getCurrentVersionStdmaps() { return currentVersionStdmaps.get(); }

/** Can be called at any point in time to ensure that 'cfg:' names are up to date. */
export function requireMaps() {
  currentMapNamesDone.get();
}

/** Get additional Config. */
export function getConfig() {
  return currentConfig.get();
}

/** Clear caches for all `getCurrent__` functions. Suitable for use whenever a page is loaded. */
export function clearSettingsCache() {
  currentVersionAnmmaps.reset();
  currentVersionStdmaps.reset();
  currentMapNamesDone.reset();
  currentConfig.reset();
}

// --------------------------------------------------------------
// Functions that implement the settings page.

/** Old abstraction for a group of map-related options on the settings page. */
type MapSet<V extends string> = {
  /** ID of section on settings page. */
  controlId: string,
  /** Get all supported versions. */
  supportedVersions: V[],
  /** Get data about a version. */
  versionData: {[k in V]: OldVersionData},
  /** Prefix of some controls. */
  mapType: string,
  /** Where do we store settings for these maps in localStorage? */
  localStorageKey: string | null,
  /** Default map file contents for each version. */
  defaultMapText: {[v in V]: string},
  /** Function that loads the maps, possibly from cache. */
  getMaps: () => LoadedMaps<V>,
  getHandlers: {
    ins: () => TableHandlers<InsData>,
    vars?: () => TableHandlers<VarData>,
  },
}

const anmmapSet: MapSet<SupportedAnmVersion> = {
  controlId: 'upload-anmmaps',
  supportedVersions: SUPPORTED_ANM_VERSIONS,
  versionData: ANM_VERSION_DATA,
  mapType: 'anmmap',
  localStorageKey: LOCAL_STORAGE_KEY_ANMMAP,
  defaultMapText: {
    'v0': readFileSync(__dirname + '/../static/eclmap/anmmap/v0.anmm', 'utf8'),
    'v2': readFileSync(__dirname + '/../static/eclmap/anmmap/v2.anmm', 'utf8'),
    'v3': readFileSync(__dirname + '/../static/eclmap/anmmap/v2.anmm', 'utf8'),
    'v4': readFileSync(__dirname + '/../static/eclmap/anmmap/v4.anmm', 'utf8'),
    'v8': readFileSync(__dirname + '/../static/eclmap/anmmap/v8.anmm', 'utf8'),
  },
  getMaps: getCurrentVersionAnmmaps,
  getHandlers: {
    ins: getAnmInsHandlers,
    vars: getAnmVarHandlers,
  },
};

const stdmapSet: MapSet<StdVersion> = {
  controlId: 'upload-stdmaps',
  supportedVersions: SUPPORTED_STD_VERSIONS,
  versionData: STD_VERSION_DATA,
  mapType: 'stdmap',
  localStorageKey: LOCAL_STORAGE_KEY_STDMAP,
  defaultMapText: {
    'eosd': readFileSync(__dirname + '/../static/stdmap/std-06.stdm', 'utf8'),
    'classic': readFileSync(__dirname + '/../static/stdmap/std-09.stdm', 'utf8'),
    'modern': readFileSync(__dirname + '/../static/stdmap/std-14.stdm', 'utf8'),
  },
  getMaps: getCurrentVersionStdmaps,
  getHandlers: {'ins': getStdHandlers},
};

const fakeMsgMaps = new Proxy({}, {get: () => ({ins: {}, var: {}})}) as {[v in MsgVersion]: LoadedMap};
const msgmapSet: MapSet<MsgVersion> = {
  controlId: 'upload-stdmaps',
  supportedVersions: SUPPORTED_MSG_VERSIONS,
  versionData: MSG_VERSION_DATA,
  mapType: 'msgmap',
  localStorageKey: null,
  defaultMapText: new Proxy({}, {get: () => ''}) as {[v in MsgVersion]: string},
  getMaps: () => fakeMsgMaps,
  getHandlers: {'ins': getMsgHandlers},
};

export function initSettings() {
  (window as any).buildSettingsPage = buildSettingsPage;
  (window as any).makeFrozenStatsTableCheckbox = makeFrozenStatsTableCheckbox;
}

/** Selects things on the settings page to match the stored settings. */
function setupSettingsPageInitialState() {
  resetSettingsPageMapsFromStorage(anmmapSet);
  resetSettingsPageMapsFromStorage(stdmapSet);
}

/** Generates HTML for the settings page. */
function buildSettingsPage() {
  buildMapSelector(document.querySelector<HTMLElement>(`#${anmmapSet.controlId}`)!, anmmapSet);
  buildMapSelector(document.querySelector<HTMLElement>(`#${stdmapSet.controlId}`)!, stdmapSet);
  setupSettingsPageInitialState();
  setupSettingsPageHooks();
}

/** Generates HTML for the anmmaps selector. */
function buildMapSelector<V extends string>($div: HTMLElement, mapSet: MapSet<V>) {
  const {mapType, supportedVersions, versionData} = mapSet;

  $div.classList.add('map-files');
  $div.innerHTML = /* HTML */`
    <div class="rows"></div>
    <p><button class='confirm' disabled='true'></button><span class="save-status"></span></p>

  `;
  const $rows = $div.querySelector('.rows')!;

  let rowsHtml = '';
  for (const version of supportedVersions) {
    const {minGame, maxGame} = versionData[version];

    let gameRangeStr;
    if (minGame === maxGame) {
      gameRangeStr = `TH[game-num=${minGame}]`;
    } else {
      gameRangeStr = `TH[game-num=${minGame}]&ndash;[game-num=${maxGame}]`;
    }
    rowsHtml += dedent(/* html */`
      <div class="row ${version}">
        <div class='col label'>${version} (${gameRangeStr})</div>
        <div class='col raw'>
          <input type='radio' id='${mapType}-${version}-raw' name='${mapType}-${version}'>
          <label for='${mapType}-${version}-raw'></label>
        </div>
        <div class='col auto'>
          <input type='radio' id='${mapType}-${version}-auto' name='${mapType}-${version}'>
          <label for='${mapType}-${version}-auto'></label>
        </div>
        <div class='col file'>
          <input type='radio' id='${mapType}-${version}-file' name='${mapType}-${version}'>
          <label for='${mapType}-${version}-file'><input type='file'></label>
        </div>
        <div class='col status'></div>
      </div>
    `);
  }

  $rows.innerHTML = MD.makeHtml(rowsHtml);
}

function resetSettingsPageMapsFromStorage<V extends string>(mapSet: MapSet<V>) {
  const {controlId, supportedVersions} = mapSet;

  const $maps = document.querySelector(`#${controlId}`);
  if (!$maps) throw new Error('not on settings page!');

  const $rows = $maps.querySelector('.rows')!;
  for (const $input of $rows.querySelectorAll('input')) {
    $input.disabled = false;
  }

  const mapSettings = storageReadMapsOrDefault(mapSet);
  for (const version of supportedVersions) {
    const setting = mapSettings[version];
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
  setupMapHooks(anmmapSet);
  setupMapHooks(stdmapSet);
}

function setupMapHooks<V extends string>(mapSet: MapSet<V>) {
  const {controlId} = mapSet;

  const $maps = document.querySelector(`#${controlId}`);
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
    saveNewMapSettingsFromPage(mapSet).then(
        () => {},
        (err) => {
          window.alert(`Error: ${err}`);
          resetSettingsPageMapsFromStorage(mapSet);
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

async function saveNewMapSettingsFromPage<V extends string>(mapSet: MapSet<V>) {
  const {controlId, localStorageKey} = mapSet;

  if (localStorageKey == null) {
    return;
  }

  const $maps = document.querySelector(`#${controlId}`);
  if (!$maps) throw new Error('not on settings page!');

  const oldValue = localStorage.getItem(localStorageKey);
  try {
    const mapSettings = await readMapSettingsFromPage($maps, mapSet);
    localStorage.setItem(localStorageKey, JSON.stringify(mapSettings));

    // Just check to make sure they can be loaded without errors...
    storageReadMapsOrThrow(mapSet);
    setMapsSaveStatus($maps, 'success');
  } catch (e) {
    console.error(e);
    setMapsSaveStatus($maps, 'error');
    restoreLocalStorageItem(localStorageKey, oldValue);
  }

  resetSettingsPageMapsFromStorage(mapSet);
}

async function readMapSettingsFromPage<V extends string>($maps: Element, mapSet: MapSet<V>) {
  const {supportedVersions} = mapSet;

  const $rows = $maps.querySelector('.rows')!;
  for (const $input of $rows.querySelectorAll('input')) {
    $input.disabled = true;
  }

  // begin with current settings for reason described below.
  const mapSettings = storageReadMapsOrDefault(mapSet);
  for (const version of supportedVersions) {
    const $row = $maps.querySelector(`.row.${version}`) as HTMLElement;
    const {$rawRadio, $autoRadio, $fileRadio, $fileUpload} = getMapSettingsRowStuff($row);

    let mapSetting: MapSetting | undefined;
    if ($rawRadio.checked) mapSetting = 'raw';
    else if ($autoRadio.checked) mapSetting = 'auto';
    else if ($fileRadio.checked) {
      // If no file was uploaded during the current page visit, it is very likely because
      // mapSettings already contains a loaded file, so we should just keep that.
      if ($fileUpload.files!.length === 0) continue;

      const text = await readUploadedFile($fileUpload.files![0]);
      mapSetting = parseMapText(text);
    }
    mapSettings[version] = mapSetting!;
    loadMapFromSetting(version, mapSetting!, mapSet);
  }

  return mapSettings;
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

function makeFrozenStatsTableCheckbox($input: HTMLInputElement) {
  $input.checked = getConfig()['freeze-stats-headers'];
  $input.addEventListener('click', () => {
    const config = getConfig();
    config['freeze-stats-headers'] = $input.checked;
    saveConfig(config);

    window.location.reload();
  });
}

// --------------------------------------------------------------
// Settings implementation.

export type LoadedMaps<V extends string> = {[v in V]: LoadedMap};
export type MapSettings<V extends string> = StrMap<V, MapSetting>;

/** Form of an ECLMap stored in memory. */
export type LoadedMap = {ins: NumberMap, vars: NumberMap};
/** Form of an ECLMap setting that gets JSONified and saved in localStorage. */
export type MapSetting = 'raw' | 'auto' | LoadedMap;
export type NumberMap = Record<number, string>;

function storageLoadConfigOrDefault(): Config {
  const text = localStorage.getItem(LOCAL_STORAGE_KEY_OTHER_CONFIG) || '{}';
  return {...DEFAULT_CONFIG, ...JSON.parse(text)};
}

function saveConfig(config: Config) {
  localStorage.setItem(LOCAL_STORAGE_KEY_OTHER_CONFIG, JSON.stringify(config));
}

/** Initializes ANM maps, possibly from localStorage. */
function storageLoadMaps<V extends string>(mapSet: MapSet<V>): LoadedMaps<V> {
  const {supportedVersions} = mapSet;

  const settings = storageReadMapsOrDefault(mapSet);
  const out = {} as Record<V, LoadedMap>;
  for (const version of supportedVersions) {
    out[version] = loadMapFromSetting(version, StrMap.getOrDefault(settings, version, 'auto'), mapSet);
  }
  return out;
}

/** Get the settings for ANM maps. */
function storageReadMapsOrThrow<V extends string>(mapSet: MapSet<V>): MapSettings<V> {
  const {localStorageKey} = mapSet;

  const text = localStorage.getItem(localStorageKey || LOCAL_STORAGE_KEY_UNUSED_DUMMY) || '{}';
  const json = JSON.parse(text);
  return parseSettingMapJson(json, mapSet);
}

function storageReadMapsOrDefault<V extends string>(mapSet: MapSet<V>): MapSettings<V> {
  const {localStorageKey, mapType} = mapSet;

  const text = localStorage.getItem(localStorageKey || LOCAL_STORAGE_KEY_UNUSED_DUMMY) || '{}';
  const json = JSON.parse(text);
  try {
    return parseSettingMapJson(json, mapSet);
  } catch (e) {
    console.error(`ignoring saved ${mapType}s due to an error`, e);
    return {};
  }
}

function loadMapFromSetting<V extends string>(version: V, m: MapSetting, mapSet: MapSet<V>): LoadedMap {
  if (m === 'raw') return {ins: {}, vars: {}};
  if (m === 'auto') return parseMapText(mapSet.defaultMapText[version]);
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

function parseSettingMapJson<V extends string>(x: unknown, mapSet: MapSet<V>): MapSettings<V> {
  const {supportedVersions} = mapSet;

  if (!(x && typeof x === 'object')) throw new TypeError(`expected object, got ${typeof x}`);

  const xobj = x as Record<V, unknown>;
  const out = {} as Record<V, MapSetting>;
  for (const version of supportedVersions) {
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

// --------------------------------------------------------------
// Converting old version-based config system to new config system.

function convertOldVersionConfigToNewConfig() {
  convertSingleOldVersionConfigToNewConfig(anmmapSet, 'ins');
  convertSingleOldVersionConfigToNewConfig(anmmapSet, 'vars');
  convertSingleOldVersionConfigToNewConfig(stdmapSet, 'ins');
  convertSingleOldVersionConfigToNewConfig(msgmapSet, 'ins');
}
function convertSingleOldVersionConfigToNewConfig<V extends string>(mapset: MapSet<V>, subkey: 'ins' | 'vars') {
  const {supportedVersions, versionData, getHandlers, getMaps} = mapset;
  const tableHandlers = getHandlers[subkey]!();
  const {mainPrefix, tableByOpcode} = tableHandlers;
  const loadedMaps = getMaps();

  // For each version in the old config, we may or may not have a mapfile.
  // If we do have a mapfile, apply the names inside to the refs for the corresponding instructions.
  //
  // Names from newer versions will overwrite names from older versions for the same ref.
  const nameMap: Record<string, string> = {};
  for (const version of supportedVersions) {
    const table = tableByOpcode.get(versionData[version].maxGame);
    if (table == null) continue; // can't lookup refs; skip this one

    for (const [opcodeStr, name] of Object.entries(loadedMaps[version][subkey])) {
      const opcode = parseInt(opcodeStr, 10);
      const entry = table[opcode];
      if (entry == null) continue;
      nameMap[entry.ref] = name;
    }
  }

  globalConfigNames.registerPrefix(mainPrefix, (id, ctx) => {
    const ref = `${mainPrefix}:${id}`;
    const qualOpcode = opcodeForNamingRef(tableHandlers, ref, ctx);
    if (qualOpcode == null) return null;

    const currentGame = queryGame(ctx);
    let name = nameMap[ref];
    if (name == null) {
      name = `ins_${qualOpcode.opcode}`;
    }
    if (currentGame != qualOpcode.game) {
      name = `th${qualOpcode.game}:${name}`;
    }
    return name;
  });
}

function opcodeForNamingRef(tableHandlers: TableHandlers<any>, ref: string, ctx: Context): QualifiedOpcode | null {
  const {reverseTable, latestGameTable} = tableHandlers;

  // prefer displaying the name from the current game if it exists there
  const currentGame = queryGame(ctx);
  const table = reverseTable[currentGame];
  if (table) {
    const opcode = table[ref];
    if (opcode != null) {
      return {game: currentGame, opcode};
    }
  }

  // else find the latest game that has it
  const qualOpcode = latestGameTable[ref];
  if (!qualOpcode) return null;
  return qualOpcode;
}
