/**
 * @jest-environment jsdom
 */

import React from 'react';
import {Router} from 'react-router-dom';
import {createMemoryHistory} from 'history';
import type {History} from 'history';
import {render, fireEvent, waitFor, screen, act, within} from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';

import {TypeDatabase, TypeName, Version, VersionLevel} from './database';
import {Navigation, useNavigationPropsFromUrl} from './Navigation';

const PROMISE_THAT_NEVER_RESOLVES = new Promise<never>(() => {});

const SIMPLE_STRUCT = {
  is: 'struct',
  size: '0x4',
  align: '0x4',
  members: [
    {offset: '0x0', name: 'number', type: {is: 'int', signed: true, size: 4}},
    {offset: '0x4', name: '__end', type: null},
  ]
};

type Matchable = string | RegExp;
type DbData = [Matchable, unknown][];
const DEFAULT_DB_DATA: DbData = [
  ['db-head.json', {
    'version': 2,
    'common-modules': [],
    'versions': [
      {version: 'v1.0', level: 'primary'},
      {version: 'v2.0-pre', level: 'secondary'},
      {version: 'v2.0', level: 'primary'},
    ],
  }],
  [new RegExp("data/[^/]+/version-props.json"), {'pointer-size': 4}],
  [new RegExp("data/[^/]+/types-ext.json"), {}],
  ['data/v1.0/types-own.json', {
    'Common': SIMPLE_STRUCT,
    'OnlyInV1': SIMPLE_STRUCT,
  }],
  ['data/v2.0-pre/types-own.json', {
    'Common': SIMPLE_STRUCT,
    'OnlyInPre': SIMPLE_STRUCT,
  }],
  ['data/v2.0/types-own.json', {
    'Common': SIMPLE_STRUCT,
    'OnlyInV2': SIMPLE_STRUCT,
  }],
];

function testPathReader(data: DbData) {
  return async (path: string) => {
    for (const [pattern, json] of data) {
      if (path.match(pattern))  {
        return JSON.stringify(json);
      }
    }
    throw new Error(`no such file: '${path}'`)
  };
}

function pathReaderThatNeverLoads(data: DbData) {
  return async (path: string) => {
    if (path === 'db-head.json') {
      return await testPathReader(data)(path);
    } else {
      return await PROMISE_THAT_NEVER_RESOLVES;
    }
  };
}

const getTestDb = (data: DbData) => new TypeDatabase(testPathReader(data));
const getDbThatNeverLoads = (data: DbData = DEFAULT_DB_DATA) => new TypeDatabase(pathReaderThatNeverLoads(data));

// =============================================================================

const LABEL_STRUCT = 'Type';
const LABEL_VERSION = 'Version';
type Label = typeof LABEL_STRUCT | typeof LABEL_VERSION;
function getUnavailableCheckbox() {
  return screen.getByLabelText('Show unavailable');
}
function getTextInput(labelText: Label): HTMLInputElement {
  const input = screen.getByLabelText(labelText);
  expect(input).toBeTruthy();
  return input as HTMLInputElement;
}
function getClearButton(labelText: Label) {
  // Material UI places the button as a sibling element
  const parent = screen.getByLabelText(labelText)?.parentElement;
  return parent && within(parent).getByTitle("Clear");
}
function getOpenButton(labelText: Label) {
  // Material UI places the button as a sibling element
  const parent = screen.getByLabelText(labelText)?.parentElement;
  return parent && within(parent).getByTitle("Open");
}

function hasLoadIndicator() {
  return screen.queryAllByRole('progressbar').length > 0;
}

function waitForLoad() {
  return new Promise<void>((resolve, reject) => {
    // give progressbar a chance to appear if it's going to
    setTimeout(async () => {
      // now wait for it to be gone
      await waitFor(() => expect(hasLoadIndicator()).toBe(false));
      resolve();
    }, 1);
    setTimeout(() => reject(new Error("timeout waiting for db to load")), 3000);
  });
}

function TestNavigation(props: {
  db?: TypeDatabase,
  history?: History,
  dbData?: DbData,
  versionFromUrl?: string | null,
  structFromUrl?: string | null,
  minLevel?: VersionLevel,
}) {
  const {
    history = createMemoryHistory(),
    versionFromUrl = null,
    structFromUrl = null,
    minLevel = 'primary',
    dbData = DEFAULT_DB_DATA,
    db = getTestDb(dbData),
  } = props;

  const url = urlFromParts(structFromUrl as TypeName | null, versionFromUrl as Version | null);
  history.push(url);
  return <Router history={history}>
    <TestNavigationInner {...{minLevel, db}} />
  </Router>;
}

function TestNavigationInner({minLevel, db}: {minLevel: VersionLevel, db: TypeDatabase}) {
  const {version, setVersion, typeName, setTypeName} = useNavigationPropsFromUrl();
  return <Navigation {...{version, setVersion, typeName, setTypeName, minLevel, db}} />;
}

function urlFromParts(typeName: TypeName | null, version: Version | null) {
  const search = new URLSearchParams();
  if (typeName) search.set('t', typeName);
  if (version) search.set('v', version);
  return `/struct-testpage?${search.toString()}`;
}

// =============================================================================

test('it loads', async () => {
  await act(async () => {
    render(<TestNavigation structFromUrl='Common' versionFromUrl='v2.0'/>);
    await waitForLoad();
  });
  expect(getTextInput(LABEL_STRUCT).value).toBe('Common');
  expect(getTextInput(LABEL_VERSION).value).toBe('v2.0');
});

test('it has a load indicator', async () => {
  await act(async () => {
    render(<TestNavigation db={getDbThatNeverLoads()} structFromUrl='Common' versionFromUrl='v2.0'/>);
  });
  expect(hasLoadIndicator()).toBe(true);
});

test("it doesn't get stuck after clearing something", async () => {
  await act(async () => {
    render(<TestNavigation structFromUrl='Common' versionFromUrl='v2.0'/>);
    await waitForLoad();
  });

  await act(async () => {
    const button = getClearButton(LABEL_VERSION);
    expect(button).toBeTruthy();
    fireEvent.click(button!);
  });
  await new Promise((resolve) => setTimeout(resolve, 10));
  await act(() => waitForLoad());
});

test("input can be cleared", async () => {
  await act(async () => {
    render(<TestNavigation structFromUrl='Common' versionFromUrl='v2.0'/>);
    await waitForLoad();
  });

  await act(async () => {
    const button = getClearButton(LABEL_VERSION);
    expect(button).toBeTruthy();
    fireEvent.click(button!);
  });
  await new Promise((resolve) => setTimeout(resolve, 10));
  await act(() => waitForLoad());
  expect(getTextInput(LABEL_STRUCT).value).toBe('Common');
  expect(getTextInput(LABEL_VERSION).value).toBe('');
});
