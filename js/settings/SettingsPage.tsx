import React, {forwardRef} from 'react';
import type {ReactNode} from 'react';
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
import Snackbar from '@material-ui/core/Snackbar';
import MenuItem from '@material-ui/core/MenuItem';
import Paper from '@material-ui/core/Paper';
import TextField from '@material-ui/core/TextField';
import FormControl from '@material-ui/core/FormControl';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import InputLabel from '@material-ui/core/InputLabel';
import ListItemText from '@material-ui/core/ListItemText';
import Typography from '@material-ui/core/Typography';
import ScopedCssBaseline from '@material-ui/core/ScopedCssBaseline';
import {makeStyles} from '@material-ui/core/styles';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import RestoreIcon from '@material-ui/icons/Restore';
import DeleteIcon from '@material-ui/icons/Delete';

import {If} from '~/js/XUtil';
import {Game, allGames} from '~/js/tables/game';
import {Ref, getAllTables} from '~/js/tables';
import {SavedSettings, SavedLangSettings, Lang, loadMapFromFile, computeNameSettingsFromLangSettings, NameSettings} from './settings';
import {saveNewSettings} from './local-storage';
import {useSettingsPageStateReducer, newSettingsFromState, LangState, LangAction, CustomMapfileListItem, State} from './settings-page-state';

// (For this thing it's easier to debug "why is this null" when it happens, than it is to deal with the
//  cognitive load of constantly having to think about "what does it mean if this is null?". (hint: it means a bug!)
//
//  In an ideal world, React.createContext would have an overload that takes a lazily computed initial state,
//  where we could simply throw an exception.)
export const NameSettingsContext = React.createContext<NameSettings>(null as any);

export function SettingsPage({settings, onSave}: {settings: SavedSettings, onSave: (s: SavedSettings) => void}) {
  const [state, dispatch] = useSettingsPageStateReducer(settings);

  return <>
    <h1>Settings</h1>
    <SaveButton state={state} onSave={onSave} />
    <h2>anmmap</h2>
    <SingleLangSettings state={state.anm} dispatch={dispatch.anm} />
    <h2>stdmap</h2>
    <SingleLangSettings state={state.std} dispatch={dispatch.std} />
    <h2>msgmap</h2>
    <SingleLangSettings state={state.msg} dispatch={dispatch.msg} />
  </>;
}

function SaveButton({state, onSave}: {state: State, onSave: (s: SavedSettings) => void}) {
  const [snackbarType, setSnackbarType] = React.useState<'success' | 'error' | null>(null);

  function handleClick() {
    const settings = newSettingsFromState(state);
    try {
      saveNewSettings(settings);
      onSave(settings);
      setSnackbarType('success');
    } catch (e) {
      console.error(e);
      setSnackbarType('error');
    }
  }
  return <>
    <p><Button variant='contained' onClick={handleClick}>Save changes</Button></p>
    <Snackbar
      anchorOrigin={{vertical: 'bottom', horizontal: 'center'}}
      open={snackbarType != null}
      autoHideDuration={snackbarType === 'error' ? 4000 : 2000}
      onClose={(ev, reason) => reason === 'clickaway' && setSnackbarType(null)}
    ><div>
      <If cond={snackbarType === 'success'}>Settings saved!</If>
      <If cond={snackbarType === 'error'}>An error occurred! Settings have not been saved.</If>
    </div></Snackbar>
  </>;
}

function SingleLangSettings({state, dispatch}: {state: LangState, dispatch: React.Dispatch<LangAction>}) {
  return <>
    <div className="mapfile-builtin-options">
      <RadioGroup row aria-label="builtin config" value={state.builtin} onChange={(ev: any) => dispatch({type: 'change-builtin', payload: {builtin: ev.target.value}})}>
        <FormControlLabel labelPlacement="end" control={<Radio color="primary" />} value="truth" label="Use mapfiles from truth"/>
        <FormControlLabel labelPlacement="end" control={<Radio color="primary" />} value="raw" label="Use raw syntax"/>
      </RadioGroup>
      <FormControlLabel
        labelPlacement="end" control={<Switch color="primary" />} label="Additionally use custom mapfiles"
        checked={state.customEnabled}
        onChange={(ev: any) => dispatch({type: 'toggle-custom-maps', payload: {customEnabled: ev.target.checked}})}
      />
      <SlidingDrawer open={state.customEnabled}>
        <CustomMapfileList list={state.customMapfileList} dispatch={dispatch} enabled={state.customEnabled}/>
      </SlidingDrawer>
    </div>
  </>;
}

// styles to make sticky header and column work
const useStyles = makeStyles({
  // make a div whose height can change
  slidingDrawerContainer: {
    position: 'relative',
    overflowY: 'hidden',
    // transition: 'height 0.25s ease-out',
    height: 0,
  },
  // anchor the content to the bottom
  slidingDrawerContent: {
    position: 'absolute',
    bottom: 0,
  },
});

function SlidingDrawer({open, children}: {open: boolean, children: ReactNode}) {
  const classes = useStyles();
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [contentHeight, setContentHeight] = React.useState(0);
  console.log(contentHeight, ref.current?.offsetHeight, open);

  React.useLayoutEffect(() => {
    if (ref.current) {
      setContentHeight(ref.current.offsetHeight);
    }
  }, []);

  const drawerInlineStyle = {
    transition: contentHeight > 0 ? 'height 0.1s ease-out' : undefined, // to prevent growing from 0 at the start
    height: open ? contentHeight : 0,
  };

  return <div className={classes.slidingDrawerContainer} style={drawerInlineStyle}>
    <div className={classes.slidingDrawerContent} ref={ref}>
      {children}
    </div>
  </div>;
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
