import React from 'react';
import {useLocation} from 'react-router-dom';

import {useDependentState} from './XUtil';

export function useScrollToAnchor() {
  const location = useLocation();
  const [traveled, setTraveled] = useDependentState(false, [location]);

  // This lets code outside of this hook indicate that all elements that could have meaningful IDs
  // for navigation have been generated.  This can be used to disable a wait cursor for a scroll that will never happen.
  const [contentLoaded, setContentLoaded] = useDependentState(false, [location.search, location.pathname]);

  React.useLayoutEffect(() => {
    const id = location.hash.substring(1);
    if (id.length && !traveled) {
      const intervalId = window.setInterval(() => scrollToElementIfLoaded(id, () => {
        setTraveled(true);
        clearInterval(intervalId);
      }));

      window.setTimeout(() => clearInterval(intervalId), MAX_SCROLL_DELAY_SECONDS * 1000);
      return () => clearInterval(intervalId);
    }
    return () => {};
  }, [location, traveled, setTraveled]);

  const hasPendingScroll = !contentLoaded && !traveled && location.hash.substring(1).length;
  return {hasPendingScroll, setContentLoaded};
}

const MAX_SCROLL_DELAY_SECONDS = 20;
function scrollToElementIfLoaded(id: string, onSuccess: () => void) {
  const element = document.getElementById(id);
  if (element) {
    scrollToElement(element);
    onSuccess();
  }
}

function scrollToElement(element: HTMLElement) {
  element.scrollIntoView();
  window.scrollBy(0, -50);
}
