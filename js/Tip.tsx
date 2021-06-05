import React from 'react';
import type {ReactNode, ReactElement, ReactChild} from 'react';

import Tooltip from '@material-ui/core/Tooltip';

const IsTipContext = React.createContext<boolean>(false);

/**
 * Add a tooltip to an element.
 *
 * Note: This MUST be provided a single child so that event handlers can be added directly to the child
 * without having to wrap it in a div. (this lets you use `Tip` on things like `<td>`).  Text content
 * will be wrapped in a span.
 */
export function Tip({tip, children, disable}: {tip: ReactNode, children: ReactChild /* DELIBERATELY not ReactNode */, disable?: boolean}): ReactElement {
  if (typeof children === 'string' || typeof children === 'number') {
    // Ensure it's an element.
    children = <span>{children}</span>;
  }
  const isTip = React.useContext(IsTipContext);
  if (disable) return <>{children}</>;
  if (isTip) return children; // no nested tips!

  return <IsTipContext.Provider value={true}>
    <Tooltip
      title={tip as any}
      classes={{tooltip: 'tip'}}
      enterDelay={0} leaveDelay={0}
      TransitionProps={{timeout: {enter: 0, exit: 0}}}
      placement="top"
    >
      {children}
    </Tooltip>
  </IsTipContext.Provider>;
}
