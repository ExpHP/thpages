

import {Game} from '~/js/tables/game';
import {getAllTables, Ref} from '~/js/tables';
import {readUploadedFile} from '~/js/util';

import {parseMapfile, loadMapSet, Mapfile} from './mapfile';
import {fixOldLocalStorageKeys} from './local-storage';

export function settingsPreAppInit() {
  fixOldLocalStorageKeys();
}

export type Lang = 'anm' | 'msg' | 'std';
export type BuiltinNameSet = 'raw' | 'truth';
export function allBuiltins(): BuiltinNameSet[] { return ['raw', 'truth']; }
export function defaultBuiltin(): BuiltinNameSet { return 'truth'; }
export function allLangs(): Lang[] { return ['anm', 'msg', 'std']; }

const truthMapPath = './mapfile';
const truthGamemaps: {[L in Lang]: string} = {
  anm: 'any.anmm',
  std: 'any.stdm',
  msg: 'any.msgm',
};

/** Form of an ECLMap stored in memory. */
export type LoadedMap = {[K in SubmapKey]: NumberMap};
export type SubmapKey = 'ins' | 'vars' | 'timeline';
export type NumberMap = Map<number, string>;

/** Representation of settings that's generally useful at runtime. */
export type NameSettings = {
  dataByRef: Map<Ref, NameSettingsForRef>,
};

export type NameSettingsForRef = {
  /**
   * Name like `rgb` or `$I0` for each "anm:", "anmvar:", and etc. ref,
   * without any disambiguating prefixes like "th08:" that would depend on the current URL.
   *
   * It is NEVER a raw name, because the same ref can correspond to different opcodes in different games.
   * (i.e. the fallback to raw syntax should be implemented whenever lookup into NameSettings fails,
   *  and it should depend on the current game)
   */
  name: string,
  /** Where this name came from. */
  source: NameSettingSource,
}

export type NameSettingSource =
  | {type: 'user-mapfile', name: string}
  | {type: 'truth-mapfile', name: string}
  ;

/** Representation of settings that's close to what we keep in localStorage. */
export type SavedSettings = {
  anm: SavedLangSettings,
  std: SavedLangSettings,
  msg: SavedLangSettings,
};

export type SavedLangSettings = {
  builtin: BuiltinNameSet;
  customEnabled: boolean;
  /** Mapfiles uploaded by the user. */
  mapfiles: SavedLangMap[];
};
export type SavedLangMap = {name: string, mapfile: LoadedMap, game: Game};

export async function loadMapFromFile(file: File, warn: (msg: string) => void): Promise<LoadedMap> {
  const text = await readUploadedFile(file);
  return loadedMapFromMapfile(parseMapfile(text, warn));
}

export function loadedMapFromMapfile(mapfile: Mapfile): LoadedMap {
  const {ins, vars, timelineIns} = mapfile;
  return {ins, vars, timeline: timelineIns};
}

/** Compute names for refs in all languages. */
export async function computeNameSettingsFromSettings(savedSettings: SavedSettings, abort: AbortController): Promise<NameSettings> {
  let out = {dataByRef: new Map<Ref, NameSettingsForRef>()};

  for (const lang of allLangs()) {
    out = await addNameSettingsFromLangSettings(out, lang, savedSettings[lang], abort);
  }
  return out;
}

/** Compute names for refs in a single language. */
export async function computeNameSettingsFromLangSettings(lang: Lang, savedSettings: SavedLangSettings, abort: AbortController): Promise<NameSettings> {
  let out = {dataByRef: new Map<Ref, NameSettingsForRef>()};
  out = await addNameSettingsFromLangSettings(out, lang, savedSettings, abort);
  return out;
}

export function getDummyNameSettings(): NameSettings {
  return {dataByRef: new Map()};
}

async function addNameSettingsFromLangSettings(out: NameSettings, lang: Lang, savedSettings: SavedLangSettings, abort: AbortController): Promise<NameSettings> {
  if (savedSettings.builtin === 'truth') {
    out = await addNameSettingsFromTruth(out, lang, abort);
  }

  addNameSettingsFromMapfiles(out, lang, savedSettings.mapfiles, 'user-mapfile');
  return out;
}

async function addNameSettingsFromTruth(out: NameSettings, lang: Lang, abort: AbortController): Promise<NameSettings> {
  const gamemapFilename = truthGamemaps[lang];
  const readFile = (filename: string) => fetch(`${truthMapPath}/${filename}`, abort).then((r) => r.text());
  const warn = (msg: string) => { throw new Error(`error in truth mapfile: ${msg}`); };

  try {
    const mapSet = await loadMapSet({gamemapFilename, readFile, warn});
    const mapfiles = mapSet.map(({game, mapfile}) => ({name: gamemapFilename, game, mapfile: loadedMapFromMapfile(mapfile)}));
    addNameSettingsFromMapfiles(out, lang, mapfiles, 'truth-mapfile');
  } catch (e) {
    console.error(`Ignoring truth mapfiles for '${lang}' due to an error.`, e);
  }
  return out;
}


function addNameSettingsFromMapfiles(out: NameSettings, lang: Lang, mapfiles: SavedLangMap[], type: 'user-mapfile' | 'truth-mapfile') {
  // Use table handlers to connect submaps (e.g. ins, vars, timeline) to ref tables.
  // E.g. if lang is 'anm' we should find the 'anm' table and the 'anmvar' table.
  for (const table of getAllTables()) {
    if (table.nameSettingsPath.lang !== lang) continue;
    const {nameSettingsPath: {submap}} = table;

    for (const {name: source, mapfile, game} of mapfiles) {
      for (const [opcode, name] of mapfile[submap].entries()) {
        const data = table.getRefByOpcode(game, opcode);
        if (!data) continue;

        out.dataByRef.set(data.ref, {name, source: {type, name: source}});
      }
    }
  }
}
