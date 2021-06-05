import React from 'react';
import {StylesProvider} from '@material-ui/core/styles';
import {HashRouter as Router, Switch, Route, Redirect, Link} from 'react-router-dom';

import {ErrorBoundary} from './Error';
import {Navbar} from './Navbar';
import {Tip} from './Tip';
import {StatsPage} from './Stats';
import {useSettings, NameSettingsContext} from './settings';

export function App() {
  const {savedSettings, nameSettings, setSavedSettings} = useSettings();

  // injectFirst gives our CSS precedence over MUI's JSS
  return <StylesProvider injectFirst><NameSettingsContext.Provider value={nameSettings}>
    <div className='page-width-controller'>
      <div className='header-pane'>
        <div className="header-text">{"ExpHP's Touhou pages"}</div>
      </div>
      <Router>
        <nav className='navigation-pane'>
          <ErrorBoundary><Navbar></Navbar></ErrorBoundary>
        </nav>
        <div className='content-pane'>
          <div className='content-paper'>
            <ErrorBoundary><Content></Content></ErrorBoundary>
          </div>
        </div>
      </Router>
    </div>
  </NameSettingsContext.Provider></StylesProvider>;
}

function Content() {
  return <Switch>
    <Route exact path="/">FIXME main page</Route>
    <Route exact path="/index"><Redirect to="/" /></Route>
    <Route exact path="/settings">FIXME</Route>
    <Route exact path="/anm/ins">FIXME</Route>
    <Route exact path="/anm/var">FIXME</Route>
    <Route exact path="/std/ins">FIXME</Route>
    <Route exact path="/msg/ins">FIXME</Route>
    <Route exact path="/anm/stats"><StatsPage /></Route>
    {/* FIXME what to do about all of these markdown pages?  Should the NotFound route look for md files? */}
    <Route exact path="/anm/concepts">FIXME</Route>
    <Route exact path="/anm/interpolation">FIXME</Route>
    <Route exact path="/anm/stages-of-rendering">FIXME</Route>
    <Route exact path="/anm/ontick-ondraw">FIXME</Route>
    <Route exact path="/anm/layer-viewer">FIXME</Route>
    <Route exact path="/mods/bullet-cap">FIXME</Route>
    <Route exact path="/mods/debug-counters">FIXME</Route>
    <Route exact path="/mods/seasonize">FIXME</Route>
    <Route exact path="/mods/za-warudo">FIXME</Route>
    {/* <Route exact path="/settings"><Redirect to="/" /></Route> */}
    <Route><NotFound /></Route>
  </Switch>;
}

function NotFound() {
  return <>
    <h1>Page not found</h1>
    <p>
      The page at this address could not be found.
      Please try try reloading using <strong>CTRL+F5</strong>, or <strong>clearing the browser cache</strong> of this site.
      If the problem persists, contact me on Discord: <strong>ExpHP#4754</strong>.
    </p>
  </>;
}
