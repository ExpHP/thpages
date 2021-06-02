import React from 'react';
import {HashRouter as Router, Switch, Route, Link} from 'react-router-dom';
import {ErrorBoundary} from './common-components';

import {Navbar} from './Navbar';

export function App() {
  return <div>
    <div className='page-width-controller'>
      <div className='header-pane'>
        <div className="header-text">{"ExpHP's Touhou pages"}</div>
      </div>
      <Router>
        <nav className='navigation-pane'>
          <ErrorBoundary><Navbar></Navbar></ErrorBoundary>
        </nav>
        <div className='content-pane'>
          <ErrorBoundary><Content></Content></ErrorBoundary>
        </div>
      </Router>
    </div>
  </div>;
}

function Content() {
  return <div></div>;
}
