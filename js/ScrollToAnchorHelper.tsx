import React from 'react';
import {useLocation} from 'react-router-dom';

import {useDependentState} from './XUtil';

export function useScrollToAnchor() {
  const location = useLocation();
  const [traveled, setTraveled] = useDependentState(false, [location]);

  // To see why this must be dependent state, try the following steps:
  //  1. Go to /#/mods/bullet-cap
  //  2. Enter /#/anm/interpolation#footnote-1 into the URL bar
  // It should go to the anchor...
  const [contentLoaded, setContentLoaded] = useDependentState(false, [location.search, location.pathname]);

  React.useLayoutEffect(() => {
    if (contentLoaded && !traveled) {
      const id = location.hash.substring(1);
      if (id.length) {
        const element = document.getElementById(id);
        if (element) {
          scrollToElement(element);
        }
      }
      setTraveled(true);
    }
  }, [location, contentLoaded, traveled, setTraveled]);

  return React.useCallback(setContentLoaded, [setContentLoaded]);
}

function scrollToElement(element: HTMLElement) {
  element.scrollIntoView();
  window.scrollBy(0, -50);
}
