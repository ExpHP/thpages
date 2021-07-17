import React from 'react';
import type {ReactNode, ReactElement} from 'react';
import clsx from 'clsx';

import {CurrentReferenceTableRowContext} from './InlineRef';

const IsTipContext = React.createContext<boolean>(false);

const DEFAULT_EMPTY_OBJECT = {};

/**
 * Add a tooltip to an element.
 *
 * This implementation is vastly more efficient than Material UI's Tooltip when there are thousands of
 * tooltips on a single page, as all tooltips in this implementation share a single event handler.
 */
export function Tip({tip, children, disable, element = 'span', elementProps = DEFAULT_EMPTY_OBJECT, popperClassName}: {
    tip: ReactNode,
    popperClassName?: string,
    children: ReactNode,
    disable?: boolean,
    /**
     * Override the element that will be used to wrap the content in the page with data attributes.
     * For instance, a table cell may want to use 'td'.
     */
    element?: string,
    elementProps?: React.HTMLAttributes<any>;
}): ReactElement {
  const tipStore = React.useContext(TipStoreContext);
  let [tipId, setTipId] = React.useState<number | undefined>(undefined);
  const isRecursivelyInsideTip = React.useContext(IsTipContext);

  const tipOkay = !isRecursivelyInsideTip && !disable;

  tip = useForwardedContext(tip);

  React.useEffect(() => {
    if (!tipStore) return;
    if (!tipOkay) return;

    const newId = tipStore.addTip({tip, popperClassName});
    setTipId(newId);
    return () => {
      tipStore.removeTip(newId); // don't leak memory
      setTipId(undefined);
    };
  }, [tipStore, setTipId, tip, tipOkay, popperClassName]);

  if (!tipOkay) tipId = undefined;

  return React.createElement(element, {...elementProps, 'data-tip': tipId}, children);
}

/**
 * Wraps a tip body with some pieces of the current context that the tip body may be interested in.
 *
 * This is necessary because our tips are rendered in a shared div that lives outside the content area of the app,
 * so they would not normally have access to the same context that is available to the <Tip> that defined them.
 * (see https://github.com/ExpHP/thpages/issues/5)
 **/
function useForwardedContext(tip: ReactNode) {
  const currentTableRow = React.useContext(CurrentReferenceTableRowContext);
  return React.useMemo(
    () => <CurrentReferenceTableRowContext.Provider value={currentTableRow}>
      {tip}
    </CurrentReferenceTableRowContext.Provider>,
    [currentTableRow, tip],
  );
}

const TipStoreContext = React.createContext<TipStore | null>(null);
type StoredTip = {tip: ReactNode, popperClassName?: string};
class TipStore {
  private tips: Map<number, StoredTip>;
  private lastId: number;

  constructor() {
    this.tips = new Map();
    this.lastId = 0;
  }

  addTip(content: StoredTip): number {
    ++this.lastId;
    this.tips.set(this.lastId, content);
    return this.lastId;
  }

  get(id: number): StoredTip | undefined {
    return this.tips.get(id);
  }

  removeTip(id: number) {
    this.tips.delete(id);
  }
}

type TipState = {
  tip: StoredTip;
  $described: HTMLElement;
  $eventTarget: HTMLElement;
};

export function TipProvider({children}: {children: ReactNode}) {
  const tipStore = React.useMemo(() => new TipStore(), []);

  return <TipStoreContext.Provider value={tipStore}>
    <TipProviderImpl tipStore={tipStore}>{children}</TipProviderImpl>
  </TipStoreContext.Provider>;
}

export function TipProviderImpl({children, tipStore}: {children: ReactNode, tipStore: TipStore}) {
  const [tipState, setTipState] = React.useState<TipState | null>(null);
  const popperRef = React.useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = React.useState<Position | null>(null);

  const tipIn = React.useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (!tipStore) return;
    const tipData = getAncestorTip(e.target as HTMLElement, tipStore);
    if (!tipData) return;

    const [tip, $described] = tipData;
    setTipState({tip, $described, $eventTarget: e.target as HTMLElement});
    e.stopPropagation();
  }, [tipStore]);

  const tipOut = React.useCallback(() => {
    setTipState(null);
  }, [setTipState]);

  React.useLayoutEffect(() => {
    if (!tipState) return;
    if (!popperRef.current) return;

    const tipRect = popperRef.current.getBoundingClientRect();
    const rect = tipState.$described.getBoundingClientRect();
    const top = rect.top - tipRect.height + window.scrollY;
    let left = rect.left + rect.width/2 - tipRect.width/2;
    const max = document.body.offsetWidth - tipRect.width;
    if (left < 0) left = 0;
    if (left > max) left = max;
    setPos({left, top});

    return () => {
      setPos(null);
    };
  }, [tipState]);

  React.useEffect(() => {
    window.addEventListener("hashchange", tipOut);
    return () => window.removeEventListener("hashchange", tipOut);
  }, [tipOut]);

  return <div className='tip-provider' onMouseOver={tipIn} onMouseOut={tipOut}>
    <Popper pos={pos} className={tipState?.tip?.popperClassName} ref={popperRef}>{tipState?.tip?.tip}</Popper>
    {children}
  </div>;
}

type Position = {top: number, left: number};
const Popper = React.forwardRef(function Popper({children, pos, className}: {children: ReactNode, pos: Position | null, className?: string}, ref: React.ForwardedRef<HTMLDivElement>) {
  return <div
    className={clsx('tip', 'markdown-styling', className)}
    ref={ref}
    style={pos
        ? {position: 'absolute', top: pos.top, left: pos.left}
        : {position: 'absolute', display: 'block', opacity: 0} // can't be display: none because we might need to compute its size
    }
  >
    <IsTipContext.Provider value={true}>
      {children}
    </IsTipContext.Provider>
  </div>;
});

function getAncestorTip($targ: HTMLElement, tipStore: TipStore): [StoredTip, HTMLElement] | null {
  const [tipKey, $refElem] = getAncestorElementData($targ, "tip");
  const tipId = parseInt(tipKey, 10);
  if ($refElem && !Number.isNaN(tipId)) {
    return [tipStore.get(tipId)!, $refElem];
  }
  return null;
}

function getAncestorElementData($elem: HTMLElement, key: string): [string, HTMLElement | null] {
  let $cur: HTMLElement | null = $elem;
  for (let depth=0; depth<1000; depth++) {
    if (!$cur) return ["", null];
    const value = $cur.dataset[key];
    if (value !== undefined) {
      return [value, $cur];
    }
    $cur = $cur.parentElement;
  }
  throw new Error('getAncestorElementData: Iteration limit exceeded!');
}
