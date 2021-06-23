import React from 'react';
import clsx from 'clsx';
import {StylesProvider, ThemeProvider, createMuiTheme} from '@material-ui/core/styles';
import yellow from '@material-ui/core/colors/yellow';
import pink from '@material-ui/core/colors/pink';
import {HashRouter as Router, Switch, Route, Redirect} from 'react-router-dom';

import {useScrollToAnchor} from './ScrollToAnchorHelper';
import {ANM_INS_TABLE, ANM_VAR_TABLE, STD_TABLE, MSG_TABLE} from './tables';
import {CurrentPageProvider} from './UrlTools';
import {DarkBgProvider, useDarkBg} from './DarkenBg';
import {ErrorBoundary} from './Error';
import {Navbar} from './Navbar';
import {MarkdownPage} from './MarkdownPage';
import {LayerViewerPage} from './layer-viewer/LayerViewer';
import {StructViewerPage} from './struct-viewer/StructViewer';
import {StatsPage} from './Stats';
import {useSavedSettingsState, NameSettingsProvider, SettingsPage} from './settings';
import {ReferenceTablePage} from './ReferenceTable';
import {TipProvider} from './Tip';
import {Title} from './XUtil';

export const MAIN_TITLE = "ExpHP's Touhou pages";
export function App() {
  // injectFirst gives our CSS precedence over MUI's JSS
  return (
    <ThemeProvider theme={theme}>
      <StylesProvider injectFirst>
        <DarkBgProvider>
          <Router>
            <TopLevelSwitch/>
          </Router>
        </DarkBgProvider>
      </StylesProvider>
    </ThemeProvider>
  );
}

export function TopLevelSwitch() {
  return <Switch>
    <Route exact path="/struct"><StructAppBody /></Route>
    <Route><NormalAppBody /></Route>
  </Switch>;
}

export function NormalAppBody() {
  const {hasPendingScroll, setContentLoaded} = useScrollToAnchor();

  return (
    <div className={clsx('page-width-controller', 'body-root', {'pending-scroll': hasPendingScroll})}>
      <div className='header-pane'>
        <div className="header-text">{"ExpHP's Touhou pages"}</div>
      </div>
      <nav className='navigation-pane'>
        <ErrorBoundary><Navbar></Navbar></ErrorBoundary>
      </nav>
      <div className='content-pane'>
        <div className='content-paper'>
          <ErrorBoundary>
            <CurrentPageProvider>
              <Content setContentLoaded={setContentLoaded}/>
            </CurrentPageProvider>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}

export function StructAppBody() {
  useDarkBg();

  return (
    <div className={clsx('page-width-controller', 'body-root')}>
      <nav className='navigation-pane'>
        <ErrorBoundary><Navbar></Navbar></ErrorBoundary>
      </nav>
      <div className='content-pane'>
        <StructViewerPage/>
      </div>
    </div>
  );
}



const theme = createMuiTheme({
  palette: {
    type: 'dark',
    primary: {main: yellow[500]},
    secondary: {main: pink[500]},
  },
  transitions: {
    duration: {
      // make transitions shorter in general.
      shortest: 50,
      shorter: 100,
      short: 150,
      standard: 175,
      complex: 200,
      enteringScreen: 225,
      leavingScreen: 195,
    },
  },
});


function Content({setContentLoaded}: {setContentLoaded: React.Dispatch<boolean>}) {
  const [savedSettings, setSavedSettings] = useSavedSettingsState();

  return <NameSettingsProvider savedSettings={savedSettings} loading={"Loading mapfiles..."}><TipProvider>
    <Switch>
      <Route exact path="/"><MarkdownPage path="./content/index.md"/></Route>
      <Route exact path="/index"><Redirect to="/" /></Route>
      <Route exact path="/settings"><SettingsPage settings={savedSettings} onSave={setSavedSettings} /></Route>
      <Route exact path="/anm/ins"><ReferenceTablePage table={ANM_INS_TABLE} setContentLoaded={setContentLoaded} /></Route>
      <Route exact path="/anm/var"><ReferenceTablePage table={ANM_VAR_TABLE} setContentLoaded={setContentLoaded} /></Route>
      <Route exact path="/std/ins"><ReferenceTablePage table={STD_TABLE} setContentLoaded={setContentLoaded} /></Route>
      <Route exact path="/msg/ins"><ReferenceTablePage table={MSG_TABLE} setContentLoaded={setContentLoaded} /></Route>
      <Route exact path="/anm/stats"><StatsPage /></Route>
      <Route exact path="/anm/layer-viewer"><LayerViewerPage /></Route>

      {/* FIXME what to do about all of these markdown pages?  Should the NotFound route look for md files? */}
      {[
        "/anm/concepts",
        "/anm/interpolation",
        "/anm/stages-of-rendering",
        "/anm/ontick-ondraw",
        "/anm/game-colors",
        "/mods/bullet-cap",
        "/mods/debug-counters",
        "/mods/seasonize",
        "/mods/za-warudo",
      ].map((path) => <Route key={path} exact path={path}>
        <MarkdownPage path={`./content${path}.md`} setContentLoaded={setContentLoaded}/>
      </Route>)}

      {/* <Route exact path="/settings"><Redirect to="/" /></Route> */}
      <Route><NotFound /></Route>
    </Switch>
  </TipProvider></NameSettingsProvider>;
}


// This event listener is added before starting React, so that it runs before React's hashchange
// (which could potentially trigger an undesirable brief display of "Page not found" before redirecting).
export function redirectPreAppInit() {
  // Old-format links to our pages may still exist out there.
  // Intercept them before React Router even gets the chance to see them.
  window.addEventListener('hashchange', function redirectOldHashes() {
    let newHash = window.location.hash;
    newHash = (newHash === '') ? '#' : newHash;
    // ancient format:  #s=/anm/ins&g=08
    newHash = newHash.replace(/^#s=/, '#');

    if (!newHash.includes('?')) {
      // This is a tad aggressive, and we really only want these replacements to work if they occur
      // in the 'pathname' part of the location.
      //
      // However, since we know there's no '?', we can only really mess up the hash, which would never have these.
      //
      // old format:   #/anm/ins&g=08&a=ins-23
      // new format:   #/anm/ins?g=08#ins-23
      newHash = newHash.replace('&a=', '#');
      newHash = newHash.replace('&', '?');
    }

    if (newHash !== window.location.hash) {
      window.location.replace(newHash);
    }
  });
}


function NotFound() {
  return <>
    <Title>404</Title>
    <h1>Page not found</h1>
    <p>
      The page at this address could not be found.
      Please try try reloading using <strong>CTRL+F5</strong>, or <strong>clearing the browser cache</strong> of this site.
      If the problem persists, contact me on Discord: <strong>ExpHP#4754</strong>.
    </p>
  </>;
}
