import React from 'react';
import type {ReactNode} from 'react';
import {Async} from 'react-async';

import {computeNameSettingsFromSettings, getDummyNameSettings, NameSettings, SavedSettings} from './settings';
import {getSavedSettingsFromLocalStorage} from './local-storage';

/**
 * This should be called in the root of the application, above everything else that needs settings.
 *
 * Mind, calling the setter will not update local storage!
 */
export function useSavedSettingsState() {
  return React.useState(getSavedSettingsFromLocalStorage);
}

export function NameSettingsProvider({savedSettings, loading, children}: {savedSettings: SavedSettings, loading: ReactNode, children: ReactNode}) {
  return <Async promiseFn={nameSettingsPromiseFn} savedSettings={savedSettings}>
    <Async.Loading>{loading}</Async.Loading>
    <Async.Fulfilled>{(data: NameSettings) => (
      <NameSettingsContext.Provider value={data}>{children}</NameSettingsContext.Provider>
    )}</Async.Fulfilled>
  </Async>;
}

const NameSettingsContext = React.createContext<NameSettings | null>(null as any);
export function useNameSettings(): NameSettings {
  const nameSettings = React.useContext(NameSettingsContext);
  if (!nameSettings) {
    throw new Error("Cannot use useNameSettings outside of NameSettingsProvider!");
  }
  return nameSettings;
}

async function nameSettingsPromiseFn({savedSettings}: {savedSettings: SavedSettings}, abort: AbortController): Promise<NameSettings> {
  try {
    return await computeNameSettingsFromSettings(savedSettings, abort);
  } catch (e) {
    // This can happen very high up and we don't want it to bring the whole site down.
    console.error("Couldn't compute name settings", e);
    return getDummyNameSettings();
  }
}
