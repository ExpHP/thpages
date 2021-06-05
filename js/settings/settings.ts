

import {Game} from '~/js/tables/game';
import {getAllTables, Ref} from '~/js/tables';
import {readUploadedFile} from '~/js/util';

import {parseEclmap} from './eclmap';
import {fixOldLocalStorageKeys} from './local-storage';

export function settingsPreAppInit() {
  fixOldLocalStorageKeys();
}

export type Lang = 'anm' | 'msg' | 'std';
export type BuiltinNameSet = 'raw' | 'truth';
export function allBuiltins(): BuiltinNameSet[] { return ['raw', 'truth']; }
export function defaultBuiltin(): BuiltinNameSet { return 'truth'; }
export function allLangs(): Lang[] { return ['anm', 'msg', 'std']; }

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
  | {type: 'mapfile', name: string}
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

export async function loadMapFromFile(file: File): Promise<LoadedMap> {
  const text = await readUploadedFile(file);
  const {ins, vars, timelineIns} = parseEclmap(text);
  return {ins, vars, timeline: timelineIns};
}

/** Compute names for refs in all languages. */
export function computeNameSettingsFromSettings(savedSettings: SavedSettings): NameSettings {
  const out = {dataByRef: new Map<Ref, NameSettingsForRef>()};

  for (const lang of allLangs()) {
    addNameSettingsFromLangSettings(out, lang, savedSettings[lang]);
  }
  return out;
}

/** Compute names for refs in a single language. */
export function computeNameSettingsFromLangSettings(lang: Lang, savedSettings: SavedLangSettings): NameSettings {
  const out = {dataByRef: new Map<Ref, NameSettingsForRef>()};
  addNameSettingsFromLangSettings(out, lang, savedSettings);
  return out;
}

export function getDummyNameSettings(): NameSettings {
  return {dataByRef: new Map()};
}

function addNameSettingsFromLangSettings(out: NameSettings, lang: Lang, savedSettings: SavedLangSettings) {
  const {builtin, mapfiles} = savedSettings;

  // Builtins
  if (builtin === 'truth') {
    console.warn('TODO: reimplement truth builtin');
  }

  // Mapfiles
  //
  // Use table handlers to connect submaps (e.g. ins, vars, timeline) to ref tables.
  // E.g. if lang is 'anm' we should find the 'anm' table and the 'anmvar' table.
  for (const table of getAllTables()) {
    if (table.nameSettingsPath.lang !== lang) continue;
    const {nameSettingsPath: {submap}} = table;

    for (const {name: source, mapfile, game} of mapfiles) {
      for (const [opcode, name] of mapfile[submap].entries()) {
        const data = table.getRefByOpcode(game, opcode);
        if (!data) continue;

        out.dataByRef.set(data.ref, {name, source: {type: 'mapfile', name: source}});
      }
    }
  }
}
