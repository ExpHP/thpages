import React from 'react';
import type {ReactNode, ReactElement, ReactChild} from 'react';
import clsx from 'clsx';

import Tooltip from '@material-ui/core/Tooltip';
import type {TooltipProps} from '@material-ui/core/Tooltip';

const IsTipContext = React.createContext<boolean>(false);

const DEFAULT_EMPTY_OBJECT = {};

/**
 * Add a Material UI tooltip to an element.
 *
 * Note: This MUST be provided a single child so that event handlers can be added directly to the child
 * without having to wrap it in a div. (this lets you use `Tip` on things like `<td>`).  Text content
 * will be wrapped in a span.
 *
 * ---
 *
 * This has been superceded by a new Tip component, and has been left here "just in case" I need to bring it back
 * in one or more places for some reason.
 *
 * (TODO: delete once we're certain it's not needed)
 */
export function MuiTip({tip, children, disable, tipProps = DEFAULT_EMPTY_OBJECT}: {
    tip: ReactNode,
    children: ReactChild, // DELIBERATELY not ReactNode
    disable?: boolean,
    tipProps?: Omit<TooltipProps, 'title' | 'children' | 'className'>,
}): ReactElement {
  if (typeof children === 'string' || typeof children === 'number') {
    // Ensure it's an element.
    children = <span>{children}</span>;
  }
  const isTip = React.useContext(IsTipContext);
  if (disable) return children;
  if (isTip) return children; // no nested tips!

  tipProps = {
    enterDelay: 0,
    leaveDelay: 0,
    placement: "top",
    ...tipProps as object,
    classes: {
      ...tipProps.classes as object,
      tooltip: clsx('tip', tipProps.classes?.tooltip),
    },
    TransitionProps: {
      ...tipProps?.TransitionProps as object,
      timeout: {
        enter: 0,
        exit: 0,
        ...tipProps?.TransitionProps?.timeout as object,
      },
    },
  };

  return <IsTipContext.Provider value={true}>
    <Tooltip title={tip as any} {...tipProps}>{children}</Tooltip>
  </IsTipContext.Provider>;
}

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
    className={clsx('tip', className)}
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
