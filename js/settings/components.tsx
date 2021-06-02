import React, {forwardRef} from 'react';
import clsx from 'clsx';
import FlipMove from 'react-flip-move';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import Switch from '@material-ui/core/Switch';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';
import Select from '@material-ui/core/Select';
import Table from '@material-ui/core/Table';
import TableRow from '@material-ui/core/TableRow';
import TableHead from '@material-ui/core/TableHead';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import MenuItem from '@material-ui/core/MenuItem';
import Paper from '@material-ui/core/Paper';
import TextField from '@material-ui/core/TextField';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import InputLabel from '@material-ui/core/InputLabel';
import ListItemText from '@material-ui/core/ListItemText';
import Typography from '@material-ui/core/Typography';
import ScopedCssBaseline from '@material-ui/core/ScopedCssBaseline';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import RestoreIcon from '@material-ui/icons/Restore';
import DeleteIcon from '@material-ui/icons/Delete';

import {Game, allGames} from '../game-names';
import {getAllTables} from '../anm/tables';

import {Ref} from '../ref';
import {getNameSettingsFromLocalStorage} from './local-storage';
import {SavedSettings, SavedLangSettings, Lang, loadMapFromFile, computeNameSettingsFromLangSettings, NameSettings} from './settings';
import {getLangReducer, initializeLangStateFromSettings, newSettingsFromLangState, LangAction, CustomMapfileListItem} from './settings-page-state';

/** This should be called in the root of the application, above everything else that needs settings. */
export function useSettings() {
  return React.useState(getNameSettingsFromLocalStorage);
}

// (For this thing it's easier to debug "why is this null" when it happens, than it is to deal with the
//  cognitive load of constantly having to think about "what does it mean if this is null?". (hint: it means a bug!)
//
//  In an ideal world, React.createContext would have an overload that takes a lazily computed initial state,
//  where we could simply throw an exception.)
export const NameSettingsContext = React.createContext<NameSettings>(null as any);

export function SettingsPage({settings, onSave}: {settings: SavedSettings, onSave: (s: SavedSettings) => void}) {
  return <>
    <h1>Settings</h1>
    <h2>anmmap</h2>
    <SingleLangSettings lang="anm" savedSettings={settings.anm} />
    <h2>stdmap</h2>
    <SingleLangSettings lang="std" savedSettings={settings.std} />
    <h2>msgmap</h2>
    <SingleLangSettings lang="msg" savedSettings={settings.msg} />
  </>;
}

function SingleLangSettings({savedSettings, lang}: {savedSettings: SavedLangSettings, lang: Lang}) {
  // Create runtime state for a language on the settings page, based off of the saved settings data (the 'settings' prop).
  //
  // The runtime state is maintained through the reducer pattern.
  const reducer = React.useMemo(() => getLangReducer(lang), [lang]);
  const stateInit = React.useCallback(() => initializeLangStateFromSettings(lang, savedSettings), [lang, savedSettings]);
  const [optionsState, dispatch] = React.useReducer(reducer, null, stateInit);

  const oldNames = React.useMemo(() => computeNameSettingsFromLangSettings(lang, savedSettings), [lang, savedSettings]);
  const newSettings = React.useMemo(() => newSettingsFromLangState(optionsState), [optionsState]);
  const newNames = React.useMemo(() => computeNameSettingsFromLangSettings(lang, newSettings), [lang, newSettings]);
  const allRefs = React.useMemo(() => allRefsForLang(lang), [lang]);

  console.log(newSettings, oldNames, newNames);

  return <>
    <div className="mapfile-builtin-options">
      <RadioGroup row aria-label="builtin config" value={optionsState.builtin} onChange={(ev: any) => dispatch({type: 'change-builtin', payload: {builtin: ev.target.value}})}>
        <FormControlLabel labelPlacement="end" control={<Radio color="primary" />} value="truth" label="Use mapfiles from truth"/>
        <FormControlLabel labelPlacement="end" control={<Radio color="primary" />} value="raw" label="Use raw syntax"/>
      </RadioGroup>
      <FormControlLabel
        labelPlacement="end" control={<Switch color="primary" />} label="Additionally use custom mapfiles"
        checked={optionsState.customEnabled}
        onChange={(ev: any) => dispatch({type: 'toggle-custom-maps', payload: {customEnabled: ev.target.checked}})}
      />
      <CustomMapfileList list={optionsState.customMapfileList} dispatch={dispatch} enabled={optionsState.customEnabled}/>
      <NameTable oldNames={oldNames} newNames={newNames} allRefs={allRefs} />
    </div>
  </>;
}

function CustomMapfileList({list, dispatch, enabled}: {list: CustomMapfileListItem[], dispatch: React.Dispatch<LangAction>, enabled: boolean}) {
  return <div className="mapfile-list">
    <FlipMove duration={100}>
      {list.map((item) => <CustomMapfileListItem key={item.id} {...{item, dispatch, enabled}}/>)}
      <CustomMapfileListItem dispatch={dispatch} enabled={enabled}/>
    </FlipMove>
  </div>;
}

type CustomMapfileListItemProps = {
  enabled: boolean,
  item?: CustomMapfileListItem;
  dispatch: React.Dispatch<LangAction>;
};

// The forwardRef is needed by <FlipMove>.
const CustomMapfileListItem = forwardRef(({item, dispatch, enabled}: CustomMapfileListItemProps, ref: React.ForwardedRef<any>) => {
  let content;

  const handleFile = (file: File) => {
    loadMapFromFile(file)
        .then((loadedMap) => dispatch({type: 'custom-map/add', payload: {name: file.name, game: null, uploadedContents: loadedMap, savedContents: null}}));
  };

  if (item == null) {
    content = <Button variant="contained" component="label" disabled={!enabled}>
      Upload
      <input type="file" hidden onChange={(ev) => handleFile(ev.target.files![0])} />
    </Button>;
  } else {
    const {id, game, savedContents, uploadedContents} = item;

    const MyIconButton = ({dispatchType, Icon, enabled}: {dispatchType: any, Icon: any, enabled: boolean}) => {
      return <IconButton style={{flexShrink: 0}} size="small" onClick={() => dispatch({type: dispatchType, payload: {id}})} disabled={!enabled}>
        <Icon/>
      </IconButton>;
    };
    content = <>
      <span style={{
        marginRight: "0.5em", // FIXME what's the "right way" to get text here in MUI so we don't have to hack in our own margins?
        display: "inline-block", whiteSpace: "nowrap",
        overflow: "hidden", textOverflow: "ellipsis",
        width: "10em", flexShrink: 3,
      }}>{item.name}</span>
      <GameDropDown
        enabled={enabled && (savedContents == null)}
        chosenGame={game}
        onChange={(ev) => dispatch({type: 'custom-map/change-game', payload: {id, game: ev.target.value as Game}})}
      />
      <MyIconButton dispatchType='custom-map/move-down' Icon={KeyboardArrowDownIcon} enabled={enabled} />
      <MyIconButton dispatchType='custom-map/move-up' Icon={KeyboardArrowUpIcon} enabled={enabled} />
      <MyIconButton dispatchType='custom-map/delete' Icon={DeleteIcon} enabled={enabled} />
      <MyIconButton dispatchType='custom-map/restore-saved' Icon={RestoreIcon} enabled={enabled && savedContents != null && uploadedContents != null} />
    </>;
  }

  return <div ref={ref} className="mapfile-list-item" style={{display: 'flex', flexDirection: 'row', alignItems: 'center', marginLeft: "1em"}}>
    {content}
  </div>;
});
CustomMapfileListItem.displayName = 'CustomMapfileListItem';

function GameDropDown({chosenGame, enabled, onChange}: {chosenGame: Game | null, enabled: boolean, onChange: React.ChangeEventHandler<any>}) {
  return <FormControl error={chosenGame == null} size='small'>
    <InputLabel>Game</InputLabel>
    <Select value={chosenGame || ''} disabled={!enabled} onChange={onChange} style={{width: "5em"}}>
      <MenuItem disabled value=''></MenuItem>
      {[...allGames()].map((game) => <MenuItem key={game} value={game}>{`TH${game}`}</MenuItem>)}
    </Select>
  </FormControl>;
}

// =============================================================================

function NameTable({oldNames, newNames, allRefs}: {oldNames: NameSettings, newNames: NameSettings, allRefs: Ref[]}) {
  return <TableContainer component={Paper} style={{marginLeft: "0.75em", marginTop: "0.2em", maxWidth: "30rem", maxHeight: 440}}>
    <Typography variant="h6" component="div">
      Names
    </Typography>
    <Table stickyHeader size="small" aria-label="">
      <TableHead>
        <TableRow>
          <TableCell align="right">Internal name</TableCell>
          <TableCell>Old name</TableCell>
          <TableCell>New name</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {allRefs.map((ref) => {
          const oldName = oldNames.dataByRef.get(ref)?.name || null;
          const newName = newNames.dataByRef.get(ref)?.name || null;
          return <TableRow key={ref}>
            <TableCell component="th" scope="row" align="right"><code>{ref}</code></TableCell>
            <TableCell><code>{oldName || ''}</code></TableCell>
            <TableCell><code>{newName || ''}</code></TableCell>
          </TableRow>;
        })}
      </TableBody>
    </Table>
  </TableContainer>;
}

function allRefsForLang(lang: Lang) {
  const allRefs = new Set<Ref>();
  for (const table of getAllTables()) {
    if (table.nameSettingsPath.lang === lang) {
      const {mainPrefix, dataTable} = table;
      for (const id of Object.keys(dataTable)) {
        allRefs.add(`${mainPrefix}:${id}`);
      }
    }
  }
  return [...allRefs];
}
