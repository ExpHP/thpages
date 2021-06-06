import React from 'react';
import {useLocation} from 'react-router-dom';

import {debugId} from './util';
type State =
  | {type: 'inactive'}
  | {type: 'waiting-for-content'}
  | {type: 'done'}
  ;

type Action =
  | {type: 'new-page'}
  | {type: 'navigated'}
  | {type: 'stop'}
  ;

// FIXME turn into a useDependentReducer instead
function useDependentState<S>(
    initial: S,
    inputs: ReadonlyArray<any>,
    reset?: (prevState?: S) => S,
): [S, React.Dispatch<React.SetStateAction<S>>] {
  let [state, setState] = React.useState<S>(initial);

  React.useMemo(() => {
    const newState = reset ? reset(state) : initial;

    if (newState !== state) {
      setState(state = newState);
    }
  }, inputs);

  return [state, setState];
}

export function useScrollToAnchor() {
  const location = useLocation();
  console.log(debugId(location), location);
  const [traveled, setTraveled] = useDependentState(false, [location]);
  const [contentLoaded, setContentLoaded] = useDependentState(false, [location.pathname, location.search]);
  console.log('useScrollToAnchor');

  React.useLayoutEffect(() => {
    console.log(contentLoaded, traveled, location.hash);
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
