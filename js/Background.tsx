import React from 'react';
import type {ReactNode} from 'react';
import clsx from 'clsx';
import '~/css/background.less';
import {makeStyles} from '@material-ui/core/styles';

const DarkBgStateSetterContext = React.createContext<null | React.Dispatch<boolean>>(null);


export function BackgroundProvider({children}: {children: ReactNode}) {
  const [darkBgState, setDarkBgState] = React.useState(false);

  return <div className={clsx('body-filler', {'active': darkBgState})} data-testid="darken-bg">
    <DarkBgStateSetterContext.Provider value={setDarkBgState}>
      {children}
    </DarkBgStateSetterContext.Provider>
  </div>;
}

/** Makes the entire background fade to black, until the component that uses the hook is destroyed. */
export function useDarkBg() {
  const setDarkBgState = React.useContext(DarkBgStateSetterContext);
  if (!setDarkBgState) {
    throw new Error('useDarkBg can only be used inside <BackgroundProvider>');
  }

  React.useEffect(() => {
    setDarkBgState(true);
    return () => setDarkBgState(false);
  }, [setDarkBgState])
}
