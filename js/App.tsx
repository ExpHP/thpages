import React from 'react';
import {StylesProvider, ThemeProvider, createMuiTheme} from '@material-ui/core/styles';
import yellow from '@material-ui/core/colors/yellow';
import pink from '@material-ui/core/colors/pink';
import {HashRouter as Router, Switch, Route, Redirect, Link} from 'react-router-dom';

import {useScrollToAnchor} from './ScrollToAnchorHelper';
import {ANM_INS_TABLE, ANM_VAR_TABLE, STD_TABLE, MSG_TABLE} from './tables';
import {CurrentPageProvider} from './UrlTools';
import {ErrorBoundary} from './Error';
import {Navbar} from './Navbar';
import {MarkdownPage} from './MarkdownPage';
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
        <Router>
          <AppBody />
        </Router>
      </StylesProvider>
    </ThemeProvider>
  );
}

export function AppBody() {
  return (
    <div className='page-width-controller'>
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
              <Content/>
            </CurrentPageProvider>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}

//
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


function Content() {
  const setContentLoaded = useScrollToAnchor();
  const [savedSettings, setSavedSettings] = useSavedSettingsState();
  console.log('saved', savedSettings);

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

      {/* FIXME what to do about all of these markdown pages?  Should the NotFound route look for md files? */}
      {[
        "/anm/concepts",
        "/anm/interpolation",
        "/anm/stages-of-rendering",
        "/anm/ontick-ondraw",
        "/anm/game-colors",
        "/anm/layer-viewer",
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
