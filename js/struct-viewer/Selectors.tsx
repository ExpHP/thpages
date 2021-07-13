import React from 'react';
import clsx from 'clsx';

import {StructDatabase, TypeName, Version, VersionLevel} from './database';

export function Selectors(props: {
  db: StructDatabase,
  setStruct: React.Dispatch<TypeName>,
  setVersion: React.Dispatch<Version>,
  minLevel: VersionLevel,
  struct: TypeName | null,
  version: Version | null,
}) {
  const {setStruct, setVersion, minLevel, db, version, struct} = props;
  const [showUnavailable, setShowUnavailable] = React.useState(false);
  const handleUnavailableCheck = React.useCallback((ev: React.ChangeEvent<HTMLInputElement>) => {
    setShowUnavailable(ev.target.checked)
  }, [setShowUnavailable]);

  return <>
    <div><label>
      <input type="checkbox" checked={showUnavailable} onChange={handleUnavailableCheck}/>
      Show unavailable
    </label></div>
    <StructPicker onChange={setStruct} {...{db, showUnavailable, struct, version}}/>
    <VersionPicker onChange={setVersion} {...{db, showUnavailable, struct, version, minLevel}}/>
  </>;
}

export function StructPicker(props: {
  onChange: React.Dispatch<TypeName>,
  db: StructDatabase,
  showUnavailable: boolean,
  struct: TypeName | null,
  version: Version | null,
}) {
  const {onChange, db, showUnavailable, version, struct} = props;
  const optionsPromise = React.useMemo(() => (
    getStructOptions({db, showUnavailable, version})
  ), [db, showUnavailable, version]);

  return <AsyncSelector onChange={onChange} optionsPromise={optionsPromise} current={struct}/>
}

export function VersionPicker(props: {
  onChange: React.Dispatch<Version>,
  db: StructDatabase,
  showUnavailable: boolean,
  struct: TypeName | null,
  version: Version | null,
  minLevel: VersionLevel,
}) {
  const {onChange, db, showUnavailable, version, struct, minLevel} = props;
  const optionsPromise = React.useMemo(() => (
    getVersionOptions({db, showUnavailable, struct, minLevel})
  ), [db, showUnavailable, struct, minLevel]);

  return <AsyncSelector onChange={onChange} optionsPromise={optionsPromise} current={version}/>
}

type Option<T> = {value: T, available: boolean};
type SelectorProps<T> = {
  onChange: React.Dispatch<T>,
  options: Option<T>[],
  current: T | null,
  placeholderValue?: string,
};

function AsyncSelector<T extends string>(
  props: Omit<SelectorProps<T>, "options"> & {
    optionsPromise: Promise<Option<T>[]>,
  },
) {
  const {optionsPromise} = props;
  // Begin with an empty option list until the promise resolves.
  const [options, setOptions] = React.useState<Option<T>[]>([]);

  React.useEffect(() => {
    const abortController = new AbortController();
    optionsPromise.then((options) => {
      if (!abortController.signal.aborted) {
        setOptions(options);
      }
    });

    return () => abortController.abort();
  }, [optionsPromise])

  return <Selector {...props} options={options} />
}

function Selector<T extends string>(props: SelectorProps<T>) {
  const {onChange, options, current, placeholderValue = ''} = props;
  const handleChange = React.useCallback((ev: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(ev.target.value as T);
  }, [onChange]);

  return <select value={current || placeholderValue} onChange={handleChange}>
    <option key={placeholderValue} value={placeholderValue}></option>
    {options.map((item) => (
      <option key={item.value} value={item.value} className={clsx({'unavailable': !item.available})}>
        {item.value}
      </option>
    ))}
  </select>
}

async function getStructOptions(args: {
  db: StructDatabase,
  showUnavailable: boolean,
  version: Version | null,
}) {
  const {db, showUnavailable, version} = args;
  return getOptions({
    getAll: async () => await db.getAllStructs(),
    getAvailable: async (version) => await db.getStructsForVersion(version),
    filterValue: version,
    showUnavailable,
  });
}

async function getVersionOptions(args: {
  db: StructDatabase,
  showUnavailable: boolean,
  struct: TypeName | null,
  minLevel: VersionLevel,
}) {
  const {db, showUnavailable, struct, minLevel} = args;
  return getOptions({
    getAll: async () => await db.getAllVersions(minLevel),
    getAvailable: async (struct) => await db.getVersionsForStruct(struct, minLevel),
    filterValue: struct,
    showUnavailable,
  });
}

async function getOptions<T, U>(args: {
  getAll: () => Promise<T[]>,
  getAvailable: (filterValue: U) => Promise<T[]>,
  showUnavailable: boolean,
  filterValue: U | null,
}) {
  const {getAll, getAvailable, filterValue, showUnavailable} = args;
  if (!filterValue) {
    // Show all options as available
    const values = await getAll();
    return values.map((value) => ({value, available: true}));
  }

  if (showUnavailable) {
    // Show all options, but indicate some as unavailable
    const availableValues = new Set(await getAvailable(filterValue));
    const values = await getAll();
    return values.map((value) => ({value, available: availableValues.has(value)}));
  } else {
    // Show only available options
    const values = await getAvailable(filterValue);
    return values.map((value) => ({value, available: true}));
  }
}
