import React from 'react';
import {StylesProvider} from '@material-ui/core/styles';
import {HashRouter as Router, Switch, Route, Redirect, Link} from 'react-router-dom';
import {ErrorBoundary} from './Error';
import {Navbar} from './Navbar';
import {Tip} from './Tip';
import {StatsPage} from './Stats';

export function App() {
  return <StylesProvider injectFirst> {/* Gives our CSS precedence over MUI's. */}
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
  </StylesProvider>;
}

function Content() {
  return <Switch>
    <Route exact path="/">Hello.</Route>
    <Route exact path="/index"><Redirect to="/" /></Route>
    <Route exact path="/anm/stats">
      <StatsPage />
    </Route>
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
