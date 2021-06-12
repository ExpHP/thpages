import React from 'react';
import type {ReactNode, ReactElement, ReactChild} from 'react';
import clsx from 'clsx';

import Tooltip from '@material-ui/core/Tooltip';
import type {TooltipProps} from '@material-ui/core/Tooltip';

const IsTipContext = React.createContext<boolean>(false);

/**
 * Add a tooltip to an element.
 *
 * Note: This MUST be provided a single child so that event handlers can be added directly to the child
 * without having to wrap it in a div. (this lets you use `Tip` on things like `<td>`).  Text content
 * will be wrapped in a span.
 */
export function Tip({tip, children, disable, tipProps = {}}: {
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
  if (disable) return <>{children}</>;
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
