import * as React from 'react';
import type {ReactElement} from 'react';

import {PrefixResolver, globalNames, globalLinks, Context} from './resolver';
import {parseQuery, Query} from './url-format';
import {makeStyles, createMuiTheme} from '@material-ui/core/styles';
import Tooltip from '@material-ui/core/Tooltip';
import {Err} from './common-components';

const globalTips = new PrefixResolver<ReactElement>();
const globalRefTips = new PrefixResolver<ReactElement>();
globalTips.registerPrefix('ref', globalRefTips);

const IsTipContext = React.createContext<boolean>(false);

export type TipProps = {id: string, currentQuery: Query};
export function registerRefTipPrefix(prefix: string, Component: React.FunctionComponent<TipProps>) {
  globalRefTips.registerPrefix(prefix, (id, ctx) => <Component id={id} currentQuery={ctx} />);
}

export function WithTip({tip, children}: {tip: ReactElement, children: ReactElement}): ReactElement | null {
  // const [currentTipKey, _setCurrentTipKey] = React.useContext(CurrentTipContext);
  const isTip = React.useContext(IsTipContext);
  if (isTip) return children; // no nested tips!

  return <IsTipContext.Provider value={true}>
    <Tooltip
      title={tip}
      classes={{tooltip: 'tip'}}
      enterDelay={0} leaveDelay={0}
      TransitionProps={{timeout: {enter: 0, exit: 0}}}
      placement="top"
    >
      {<span>{children}</span> /* the span is to ensure it's an Element; Tooltip silently fails on text nodes... */}
    </Tooltip>
  </IsTipContext.Provider>;
}

export function WithKeyedTip({tipKey, currentQuery, children}: {tipKey: string, currentQuery: Query, children: ReactElement}): ReactElement | null {
  const tipBody = globalTips.getNow(tipKey, currentQuery) || <Err>{`TIP_ERROR(${tipKey})`}</Err>;
  return <WithTip tip={tipBody}>{children}</WithTip>;
}
