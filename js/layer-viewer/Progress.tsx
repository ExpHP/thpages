import React from 'react';
import clsx from 'clsx';
import LinearProgress from '@material-ui/core/LinearProgress';

import {stableSort} from '~/js/util';

export function useProgress(): [ProgressState, ProgressDispatch] {
  return React.useReducer(reducer, {counts: new Map()});
}

export function Progress({state}: {state: ProgressState}) {
  return <div className='layer-viewer-progress'>
    <ProgressHeader state={state} />
    <ProgressBars state={state} />
  </div>;
}

function ProgressHeader({state}: {state: ProgressState}) {
  const {counts} = state;
  const incomplete = countIncompleteFiles(state);
  const spritesDone = [...state.counts.values()].map(({done}) => done).reduce((a, b) => a + b, 0);
  const spritesTotal = [...state.counts.values()].map(({total}) => total).reduce((a, b) => a + b, 0);

  const className = clsx('layer-viewer-status', {working: counts.size === 0 || spritesDone < spritesTotal});

  if (counts.size === 0) {
    return <h2 className={className}>Reading zip file...</h2>;
  }

  return <>
    <h2 className={className}>{
      incomplete
      ? <>Processing {incomplete} of {state.counts.size} ANM files...</>
      : <>Processing complete.</>
    }</h2>
    <p className='script-total'>({spritesDone} of {spritesTotal} sprites done)</p>
  </>;
}

function ProgressBars({state}: {state: ProgressState}) {
  const {counts} = state;
  const sortedEntries = stableSort([...counts.entries()], {key: ([, {done, total}]) => done < total ? 0 : 1});

  return <div className='layer-viewer-progress-bars'>
    {sortedEntries.map(([name, {done, total}]) => (
      <div key={name} className='progress-row'>
        <span className='col-specname'>{name}.anm</span>
        <LinearProgress className='col-bar' variant="determinate" value={done / total * 100} />
        <span className='col-counts'>
          <span className='done'>{done}</span>
          <span className='slash'>/</span>
          <span className='total'>{total}</span>
        </span>
      </div>
    ))}
  </div>;
}

// =============================================================================

export type ProgressDispatch = (action: ProgressAction) => void;
export type ProgressState = {
  counts: Map<string, SpriteCounts>,
};

export type SpriteCounts = {done: number, total: number};

export type ProgressAction =
  | {type: 'new-zip'}
  | {type: 'spec/begin', payload: {specBasename: string, numSprites: number}}
  | {type: 'sprite/finished', payload: {specBasename: string}}
  ;

export function reducer(state: ProgressState, action: ProgressAction): ProgressState {
  switch (action.type) {
    case 'new-zip':
      return {counts: new Map()};

    case 'spec/begin': {
      state = {...state};
      state.counts = new Map([...state.counts.entries()]);
      state.counts.set(action.payload.specBasename, {done: 0, total: action.payload.numSprites});
      return state;
    }

    case 'sprite/finished': {
      state = {...state};
      state.counts = new Map([...state.counts.entries()]);
      const {done, total} = state.counts.get(action.payload.specBasename)!;
      state.counts.set(action.payload.specBasename, {done: done + 1, total});
      return state;
    }
  }
}

(window as any).x = reducer;

function countIncompleteFiles(state: ProgressState): number {
  return [...state.counts.values()].filter(({done, total}) => done < total).length;
}
