import React from 'react';

import {computeNameSettingsFromSettings, getDummyNameSettings, NameSettings} from './settings';
import {getSavedSettingsFromLocalStorage} from './local-storage';

/**
 * This should be called in the root of the application, above everything else that needs settings.
 * and 'nameSettings' should be supplied to `NameSettingsContext` ASAP.
 */
export function useSettings() {
  const [savedSettings, setSavedSettings] = React.useState(getSavedSettingsFromLocalStorage);

  let nameSettings: NameSettings;
  try {
    nameSettings = computeNameSettingsFromSettings(savedSettings);
  } catch (e) {
    // This can happen very high up and we don't want it to bring the whole site down.
    console.error("Couldn't compute name settings", e);
    nameSettings = getDummyNameSettings();
  }
  return {savedSettings, nameSettings, setSavedSettings};
}

// (For this thing it's easier to debug "why is this null" when it happens, than it is to deal with the
//  cognitive load of constantly having to think about "what does it mean if this is null?". (hint: it means a bug!)
//
//  In an ideal world, React.createContext would have an overload that takes a lazily computed initial state,
//  where we could simply throw an exception.)
export const NameSettingsContext = React.createContext<NameSettings>(null as any);

