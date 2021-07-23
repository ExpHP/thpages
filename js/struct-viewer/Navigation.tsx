import React from 'react';
import {useHistory, useLocation} from 'react-router-dom';
import clsx from 'clsx';
import history from 'history';
import type {History} from 'history';
import Checkbox from '@material-ui/core/Checkbox';
import FormLabel from '@material-ui/core/FormLabel';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormHelperText from '@material-ui/core/FormHelperText';
import TextField from '@material-ui/core/TextField';
import CircularProgress from '@material-ui/core/CircularProgress';
import Autocomplete from '@material-ui/lab/Autocomplete';

import {StructDatabase, TypeName, Version, VersionLevel} from './database';

export function useNavigationPropsFromUrl() {
  const history = useHistory();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search.substring(1));
  const struct = searchParams.get('t') as TypeName | null;
  const version = searchParams.get('v') as Version | null;

  const setStruct = React.useCallback((struct: TypeName | null) => navigateToStruct(history, struct), [history]);
  const setVersion = React.useCallback((version: Version | null) => navigateToVersion(history, version), [history]);

  return React.useMemo(() => ({
    struct, version, setStruct, setVersion,
  }), [struct, version, setStruct, setVersion]);
}

export function Navigation(props: {
  db: StructDatabase,
  setStruct: React.Dispatch<TypeName | null>,
  setVersion: React.Dispatch<Version | null>,
  minLevel: VersionLevel,
  struct: TypeName | null,
  version: Version | null,
}) {
  const {setStruct, setVersion, minLevel, db, version, struct} = props;
  const [showUnavailable, setShowUnavailable] = React.useState(false);
  const handleUnavailableCheck = React.useCallback((ev: React.ChangeEvent<HTMLInputElement>) => {
    setShowUnavailable(ev.target.checked)
  }, [setShowUnavailable]);

  // FIXME: Error for incompatible struct/version
  const error = struct === null || version === null;

  return <FormControl component="fieldset" error={error} classes={{root: "struct-nav"}}>
    <FormLabel component="legend">Navigation</FormLabel>
    <FormControlLabel
      control={<Checkbox
        color="primary"
        checked={showUnavailable}
        onChange={handleUnavailableCheck}
      />}
      label="Show unavailable"
      labelPlacement="end"
    />
    <StructPicker onChange={setStruct} {...{db, showUnavailable, struct, version}}/>
    <VersionPicker onChange={setVersion} {...{db, showUnavailable, struct, version, minLevel}}/>
    {error && <FormHelperText>Select a struct and version</FormHelperText>}
  </FormControl>;
}

function navigateToStruct(history: History, struct: TypeName) {
  const location = history.location;
  history.push(setOrDeleteSearchParam(location, 't', struct));
}

function navigateToVersion(history: History, version: Version) {
  const location = history.location;
  history.push(setOrDeleteSearchParam(location, 'v', version));
}

function setOrDeleteSearchParam<S>(location: history.Location<S>, key: string, value: string | null): history.Location<S> {
  const search = new URLSearchParams(location.search.substring(1));
  if (value) {
    search.set(key, value);
  } else {
    search.delete(key);
  }

  const string = search.toString();
  return {...location, search: (string.length ? '?' : '') + string};
}

export function StructPicker(props: {
  onChange: React.Dispatch<TypeName | null>,
  db: StructDatabase,
  showUnavailable: boolean,
  struct: TypeName | null,
  version: Version | null,
}) {
  const {onChange, db, showUnavailable, version, struct} = props;
  const optionsPromise = React.useMemo(() => (
    getStructOptions({db, showUnavailable, version})
  ), [db, showUnavailable, version]);

  return <AsyncSelector
    label="Struct" onChange={onChange} optionsPromise={optionsPromise}
    current={struct}
  />;
}

export function VersionPicker(props: {
  onChange: React.Dispatch<Version | null>,
  db: StructDatabase,
  showUnavailable: boolean,
  struct: TypeName | null,
  version: Version | null,
  minLevel: VersionLevel
}) {
  const {onChange, db, showUnavailable, version, struct, minLevel} = props;
  const optionsPromise = React.useMemo(() => (
    getVersionOptions({db, showUnavailable, struct, minLevel})
  ), [db, showUnavailable, struct, minLevel]);

  return <AsyncSelector
    label="Version" onChange={onChange} optionsPromise={optionsPromise}
    current={version}
  />;
}

type Option<T> = {value: T, available: boolean};
type SelectorProps<T> = {
  onChange: React.Dispatch<T | null>,
  options: Option<T>[],
  current: T | null,
  placeholderValue?: string,
  label: string,
  loading: boolean,
};

type AsyncSelectorProps<T> = Omit<SelectorProps<T>, "options" | "loading"> & {
  optionsPromise: Promise<Option<T>[]>,
};

function AsyncSelector<T extends string>(props: AsyncSelectorProps<T>) {
  const {optionsPromise} = props;

  // Until we can upgrade to React 18 for update batching, we need a single
  // combined State so that our updates can be atomic.
  type State = { options: Option<T>[]; loading: boolean; };

  const [state, setState] = React.useState<State>({
    // Begin with an empty option list until the promise resolves.
    options: [], loading: true,
  });

  React.useEffect(() => {
    const abortController = new AbortController();
    // set loading to true, being careful not to trigger unnecessary rerenders
    setState((state) => state.loading ? state : {...state, loading: true});
    optionsPromise.then((options) => {
      if (!abortController.signal.aborted) {
        setState({loading: false, options});
      }
    });

    return () => abortController.abort();
  }, [optionsPromise])

  return <Selector {...props} {...state} />
}

function Selector<T extends string>(props: SelectorProps<T>) {
  const {onChange, options, current, loading, label} = props;
  const currentOption = useOptionFromLabel(options, ({value}) => value, current);

  const handleChange = React.useCallback((_, option: null | Option<T> | string) => {
    if (typeof option === 'string') {
      // must be in freeSolo. Box is disabled during freeSolo so this call must be spurious.
    } else {
      onChange(option && option.value);
    }
  }, [onChange]);

  const getOptionLabel = React.useCallback((option: Option<T> | string) => {
    if (typeof option === 'string') {
      return option;
    } else {
      return option.value;
    }
  }, [onChange]);

  return (
    <Autocomplete
      // Autocomplete isn't designed to change between 'freeSolo' and normal mode,
      // so change its key when it does.
      key={`${loading}`}
      classes={{root: "thing-selector"}}
      style={{ width: 300 }}
      size="small"
      disabled={loading}
      freeSolo={loading}
      value={loading ? current : currentOption}
      {...(loading ? {inputValue: current || ""} : undefined)}
      getOptionSelected={(s: Option<T>) => s.value === current}
      onChange={handleChange}
      options={options}
      renderOption={({available, value}) => (
        <span className={clsx({'unavailable': !available})}>{value}</span>
      )}
      getOptionLabel={getOptionLabel}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          variant="outlined"
          InputProps={{
            ...params.InputProps,
            endAdornment: <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
            </>,
          }} // InputProps
        ></TextField>
      )} // renderInput
    ></Autocomplete>
  );
}

/** Recover the object for the current option that corresponds to a given label. */
function useOptionFromLabel<T>(options: T[], getLabel: (option: T) => string, label: string | null) {
  const optionLookupFromLabel = React.useMemo(() => {
    return new Map([...options.map((option) => [getLabel(option), option] as const)])
  }, [options])

  const optionForValue = React.useMemo(() => {
    if (!label) return null;
    return optionLookupFromLabel.get(label);
  }, [label, optionLookupFromLabel]);

  return optionForValue;
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
