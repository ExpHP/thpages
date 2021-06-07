import React from 'react';
import {useLocation} from 'react-router-dom';

import {useDependentState} from './XUtil';

export function useScrollToAnchor() {
  const location = useLocation();
  const [traveled, setTraveled] = useDependentState(false, [location]);
  const [contentLoaded, setContentLoaded] = React.useState(false);

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
