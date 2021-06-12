import React from 'react';

import {Game} from '~/js/tables/game';
import {unreachable} from '../util';

import {Lang, BuiltinNameSet, LoadedMap, SavedSettings, SavedLangSettings} from './settings';

// =============================================================================
// Component state for a single language.

export type State = {[L in Lang]: LangState};
export type Dispatch = {[L in Lang]: React.Dispatch<LangAction>};

/**
 * This is like SavedLangSettings, but augmented with additional details about unsaved edits
 * to the settings by the user.
 */
export type LangState = {
  builtin: BuiltinNameSet;
  customEnabled: boolean;
  customMapfileList: CustomMapfileListItem[];
  nextUnusedId: CustomMapfileId;
};

export type CustomMapfileId = number; // stable IDs to use as React keys
export type CustomMapfileListItem = {
  id: CustomMapfileId;
  name: string;
  game: Game | null;
  contents: LoadedMap;
  uploadDate: Date | null,
  warnings: string[],
};
function findMapfileIndex(state: LangState, id: CustomMapfileId) {
  const matches = state.customMapfileList.map((value, index) => [value.id, index]).filter(([itemId]) => itemId === id);
  if (matches.length === 0) {
    throw new Error(`bad list item id: ${id}`);
  }
  return matches[0][1];
}

export type RefNameState = {
  oldName: string | null,
  newName: string | null,
};

export type LangAction =
  | {type: 'load', payload: {settings: SavedLangSettings}}
  | {type: 'save'}
  // broad settings
  | {type: 'change-builtin', payload: {builtin: BuiltinNameSet}}
  | {type: 'toggle-custom-maps', payload: {customEnabled: boolean}}
  // mapfiles
  | {type: 'custom-map/add', payload: Omit<CustomMapfileListItem, 'id'>}
  | {type: 'custom-map/delete', payload: {id: CustomMapfileId}}
  | {type: 'custom-map/move-up', payload: {id: CustomMapfileId}}
  | {type: 'custom-map/move-down', payload: {id: CustomMapfileId}}
  | {type: 'custom-map/change-game', payload: {id: CustomMapfileId, game: Game}}
  | {type: 'custom-map/delete', payload: {id: CustomMapfileId}}
  ;

export function useSettingsPageStateReducer(settings: SavedSettings): [State, Dispatch] {
  const [anmState, anmDispatch] = useLangStateReducer(settings, 'anm');
  const [stdState, stdDispatch] = useLangStateReducer(settings, 'std');
  const [msgState, msgDispatch] = useLangStateReducer(settings, 'msg');
  return [{anm: anmState, std: stdState, msg: msgState}, {anm: anmDispatch, std: stdDispatch, msg: msgDispatch}];
}

function useLangStateReducer(settings: SavedSettings, lang: Lang): [LangState, React.Dispatch<LangAction>] {
  const langSettings = settings[lang];
  const initFunc = React.useCallback(() => initializeLangStateFromSettings(lang, langSettings), [lang, langSettings]);
  const reducer = React.useMemo(() => getLangReducer('anm'), []);
  return React.useReducer(reducer, null, initFunc);
}

export function initializeLangStateFromSettings(language: Lang, settings: SavedLangSettings): LangState {
  const {builtin, customEnabled, mapfiles} = settings;
  console.log('initialize', mapfiles);

  let state: LangState = {builtin, customEnabled, customMapfileList: [], nextUnusedId: 0};

  // We'll let the reducer handle the mapfiles so it can take care of IDs for us.
  const reducer = getLangReducer(language);
  for (const {name, mapfile, game, uploadDate} of mapfiles) {
    state = reducer(state, {type: 'custom-map/add', payload: {
      name, game, uploadDate, contents: mapfile, warnings: [],
    }});
  }

  return state;
}

export function newSettingsFromState(state: State): SavedSettings {
  return Object.fromEntries(Object.entries(state).map(([lang, value]) => [lang, newSettingsFromLangState(value)] as const));
}

function newSettingsFromLangState(state: LangState): SavedLangSettings {
  const {builtin, customEnabled, customMapfileList} = state;
  console.log(state);
  console.log(customMapfileList);
  const mapfiles = customMapfileList.flatMap(({name, game, contents, uploadDate}) => {
    if (!game) throw new Error('You must select a game for all mapfiles');
    return [{name, game, uploadDate, mapfile: contents}];
  });
  return {builtin, customEnabled, mapfiles};
}

function getLangReducer(language: Lang) {
  return reducer;

  function reducer(state: LangState, action: LangAction): LangState {
    state = {...state};

    if (action.type === 'load') {
      return initializeLangStateFromSettings(language, action.payload.settings);

    } else if (action.type === 'change-builtin') {
      state.builtin = action.payload.builtin;
      return state;

    } else if (action.type === 'toggle-custom-maps') {
      state.customEnabled = action.payload.customEnabled;
      return state;

    } else if (action.type === 'custom-map/add') {
      state.nextUnusedId += 1;
      state.customMapfileList.push({...action.payload, id: state.nextUnusedId - 1});
      return state;

    } else if (action.type === 'custom-map/delete') {
      const {id} = action.payload;
      const index = findMapfileIndex(state, id);
      state.customMapfileList = [...state.customMapfileList];
      state.customMapfileList.splice(index, 1);
      return state;

    } else if (action.type === 'custom-map/change-game') {
      const {id, game} = action.payload;
      const index = findMapfileIndex(state, id);
      state.customMapfileList[index].game = game;
      return state;

    } else if (action.type === 'custom-map/move-up') {
      const {id} = action.payload;
      const index = findMapfileIndex(state, id);
      if (index > 0) {
        const newList = [...state.customMapfileList];
        newList[index] = state.customMapfileList[index - 1];
        newList[index - 1] = state.customMapfileList[index];
        state.customMapfileList = newList;
      }
      return state;

    } else if (action.type === 'custom-map/move-down') {
      const {id} = action.payload;
      const index = findMapfileIndex(state, id);
      if (index < state.customMapfileList.length - 1) {
        const newList = [...state.customMapfileList];
        newList[index] = state.customMapfileList[index + 1];
        newList[index + 1] = state.customMapfileList[index];
        state.customMapfileList = newList;
      }
      return state;

    } else if (action.type === 'save') {
      state.customMapfileList.forEach((oldEntry, index) => {
        state.customMapfileList[index] = {...oldEntry};
        const entry = state.customMapfileList[index];
        entry.id = index;
      });
      state.nextUnusedId = state.customMapfileList.length;
      return state;
    }

    return unreachable(action);
  }
}
