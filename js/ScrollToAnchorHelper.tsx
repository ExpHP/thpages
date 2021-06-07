import React from 'react';
import {useLocation} from 'react-router-dom';

// useState but with a dependency list
function useDependentState<S>(
    initial: S,
    inputs: ReadonlyArray<any>,
    reset?: (prevState?: S) => S,
): [S, React.Dispatch<React.SetStateAction<S>>] {
  let [state, setState] = React.useState<S>(initial);

  React.useMemo(() => {
    const newState = reset ? reset(state) : initial;
    if (newState !== state) {
      // Reassigning state is deliberate so that THIS render does not have a stale value.
      setState(state = newState); // eslint-disable-line
    }
  }, inputs);

  return [state, setState];
}

export function useScrollToAnchor() {
  const location = useLocation();
  const [traveled, setTraveled] = useDependentState(false, [location]);
  const [contentLoaded, setContentLoaded] = React.useState(false);

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
