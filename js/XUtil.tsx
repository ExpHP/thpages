// XUtil.tsx: utils specifically for React code

import React from 'react';

import {MAIN_TITLE} from './App';

// React libraries do not all agree on how to supply a single child.
// (in particular, react-markdown supplies [T] while react normally uses T)
export type SingleChild<T> = T | [T];
export function getSingleChild<T>(s: SingleChild<T>): T {
  if (Array.isArray(s)) {
    return s[0];
  }
  return s;
}

export function Title({children}: {children: SingleChild<string> | null}) {
  const title = children ? getSingleChild(children) : null;
  const prefix = title ? `${title} &mdash; ` : '';
  React.useEffect(() => {
    const $title = document.head.querySelector("title");
    if ($title) $title.innerHTML = `${prefix}${MAIN_TITLE}`;
  }, [prefix]);
  return null;
}

export function Wip({children}: {children: React.ReactNode}) {
  return <span data-wip="1">{children}</span>;
}
export function Wip2({children}: {children: React.ReactNode}) {
  return <span data-wip="2">{children}</span>;
}

/** useState but with a dependency list.  Not all overloads are supported. */
export function useDependentState<S>(
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

/**
 * Returns a counter that increases over subsequent renders, giving the browser a chance to update the DOM
 * each time using setTimeout.
 *
 * By e.g. trimming an array of child JSX elements to this length, you can use this to render a large page incrementally,
 * reducing the perceived time of page load by the user. (Note that `React.memo` may be necessary to avoid needlessly
 * rerendering children near the front).
 *
 * The counter will always begin equal to `step`, and will reset to this value whenever the dependencies change.
 */
export function useIncremental({step = 1, max}: {step?: number, max: number}, dependencies: ReadonlyArray<any>) {
  if (step === 0) {
    throw new Error("zero step!");
  }

  const [numToShow, setNumToShow] = useDependentState(step, [...dependencies]);
  React.useEffect(() => {
    if (numToShow < max) {
      const id = setTimeout(() => setNumToShow((n) => Math.min(n + step, max)));
      return () => clearTimeout(id);
    }
    return undefined;
  }, [numToShow, setNumToShow, step, max]);

  return numToShow;
}
