import React from 'react';
import type {ReactNode} from 'react';
import clsx from 'clsx';
import {makeStyles} from '@material-ui/core/styles';

const DarkBgStateSetterContext = React.createContext<null | React.Dispatch<boolean>>(null);

const useStyles = makeStyles(() => ({
  bodyFiller: {
    position: "fixed",
    height: "100%",
    width: "100%",
    opacity: "100%",
    backgroundColor: "var(--dark-bg-color-zeroalpha)",
    transition: "background-color 1s",
    "&.active": {
      backgroundColor: "var(--dark-bg-color)",
    },
    ".content-paper": {
      background: "inherit",
    }
  },
}));


export function DarkBgProvider({children}: {children: ReactNode}) {
  const [darkBgState, setDarkBgState] = React.useState(false);
  const classes = useStyles();

  return <div className={clsx(classes.bodyFiller, {'active': darkBgState})}>
    <DarkBgStateSetterContext.Provider value={setDarkBgState}>
      {children}
    </DarkBgStateSetterContext.Provider>
  </div>;
}

/** Makes the entire background fade to black, until the component that uses the hook is destroyed. */
export function useDarkBg() {
  const setDarkBgState = React.useContext(DarkBgStateSetterContext);
  if (!setDarkBgState) {
    throw new Error('useDarkBg can only be used inside DarkBgProvider');
  }

  React.useEffect(() => {
    setDarkBgState(true);
    return () => setDarkBgState(false);
  }, [setDarkBgState])
}
