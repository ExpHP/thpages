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
import {makeStyles, createStyles} from '@material-ui/core/styles';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import RestoreIcon from '@material-ui/icons/Restore';
import WarningIcon from '@material-ui/icons/Warning';
import InfoIcon from '@material-ui/icons/InfoOutlined';
import DeleteIcon from '@material-ui/icons/Delete';

import {If} from '~/js/XUtil';
import {Game, allGames} from '~/js/tables/game';
import {Tip} from '~/js/Tip';
import {Ref, getAllTables} from '~/js/tables';
import {SavedSettings, loadMapFromFile, NameSettings, countNamesInLoadedMap} from './settings';
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
      onClose={(ev, reason) => reason !== 'clickaway' && setSnackbarType(null)}
      message={
        snackbarType === 'error'
          ? "An error occurred! Settings have not been saved."
          : "Settings saved!"
      }
    >
    </Snackbar>
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

const useStyles = makeStyles({
  slidingDrawerContainer: {
    position: 'relative',
    overflowY: 'hidden',
    height: 0,
  },
  slidingDrawerContent: {
    transition: 'opacity 0.3s ease-out',
    '&[data-open]': {
      transition: 'opacity 0.3s ease-in',
    },
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
  }, [children]);

  const drawerInlineStyle = {
    transition: contentHeight > 0 ? 'height 0.1s ease-out' : undefined, // to prevent growing from 0 at the start
    height: open ? contentHeight : 0,
  };

  return <div className={classes.slidingDrawerContainer} style={drawerInlineStyle}>
    <div className={classes.slidingDrawerContent} ref={ref} data-open={open || undefined}>
      {children}
    </div>
  </div>;
}

function CustomMapfileList({list, dispatch, enabled}: {list: CustomMapfileListItem[], dispatch: React.Dispatch<LangAction>, enabled: boolean}) {
  const handleFile = (file: File) => {
    const uploadDate = new Date();
    loadMapFromFile(file)
        .then(({mapfile, warnings}) => {
          dispatch({type: 'custom-map/add', payload: {name: file.name, game: null, contents: mapfile, warnings, uploadDate}});
        });
  };

  return <div className="mapfile-list">
    <FlipMove duration={200} >{[
      ...list.map((item) => (
        <CustomMapfileListItem className="mapfile-list-item" key={item.id} {...{item, dispatch, enabled}}/>
      )),

      // Include this button in the same array so that it can keep its key for FlipMove when it turns into a real row.
      <div className="mapfile-list-item" key={list.length}>
        <Tip tip="Upload a mapfile for thtk or truth" tipProps={{placement: "top-start"}}>
          <input type="file" onChange={(ev) => handleFile(ev.target.files![0])} disabled={!enabled} />
        </Tip>
      </div>,
    ]}</FlipMove>
  </div>;
}

type CustomMapfileListItemProps = {
  enabled: boolean,
  item: CustomMapfileListItem;
  dispatch: React.Dispatch<LangAction>;
  className: string;
};

// Bizarrely, Icons don't support color="info", or really, most of the useful colors in the palette.
const useIconStyles = makeStyles((theme) =>
  createStyles({
    success: {color: theme.palette.success.main},
    error: {color: theme.palette.error.main},
    warning: {color: theme.palette.warning.main},
    info: {color: theme.palette.info.main},
  })
);


// The forwardRef is needed by <FlipMove>.
const CustomMapfileListItem = forwardRef(({item, className, dispatch, enabled}: CustomMapfileListItemProps, ref: React.ForwardedRef<any>) => {
  const {id, game, name} = item;

  const MyIconButton = ({dispatchType, Icon, enabled}: {dispatchType: any, Icon: any, enabled: boolean}) => {
    return <IconButton className='mapfile-list-icon-button' size="small" onClick={() => dispatch({type: dispatchType, payload: {id}})} disabled={!enabled}>
      <Icon/>
    </IconButton>;
  };

  return <div ref={ref} className={className}>
    <Typography style={{
      marginRight: "0.5em", // FIXME what's the "right way" to get text here in MUI so we don't have to hack in our own margins?
      display: "inline-block", whiteSpace: "nowrap",
      overflow: "hidden", textOverflow: "ellipsis",
      width: "10em", flexShrink: 3,
    }}>{name}</Typography>
    <GameDropDown
      enabled={enabled}
      chosenGame={game}
      onChange={(ev) => dispatch({type: 'custom-map/change-game', payload: {id, game: ev.target.value as Game}})}
    />
    <Tip tipProps={{enterDelay: 100}} tip={<>Rearrange map order.<br/>Maps near the bottom take priority.</>}><div>
      <MyIconButton dispatchType='custom-map/move-down' Icon={KeyboardArrowDownIcon} enabled={enabled} />
    </div></Tip>
    <Tip tipProps={{enterDelay: 100}} tip={<>Rearrange map order.<br/>Maps near the bottom take priority.</>}><div>
      <MyIconButton dispatchType='custom-map/move-up' Icon={KeyboardArrowUpIcon} enabled={enabled} />
    </div></Tip>
    <Tip tipProps={{enterDelay: 100}} tip={"Delete this map."}><div>
      <MyIconButton dispatchType='custom-map/delete' Icon={DeleteIcon} enabled={enabled} />
    </div></Tip>
    <MapfileInfoIcon item={item}/>
  </div>;
});
CustomMapfileListItem.displayName = 'CustomMapfileListItem';

function MapfileInfoIcon({item}: {item: CustomMapfileListItem}) {
  const iconClasses = useIconStyles();
  const {warnings, contents, uploadDate} = item;
  const numNames = countNamesInLoadedMap(contents);

  return (
    <Tip tipProps={{classes: {tooltip: clsx('mapfile-info-tip', {'warning': warnings.length})}}} tip={<>
      <p>Provides {numNames} names.</p>

      {warnings.length ? <>
        <p>Some warnings occurred while reading the file:</p>
        <ul>{warnings.slice(0, 3).map((msg, index) => <li key={index}>{msg}</li>)}</ul>
      </> : null}

      {uploadDate ? <div className='mapfile-info-datetime'>Uploaded {new Intl.DateTimeFormat([], {dateStyle: 'medium', timeStyle: 'short'}).format(uploadDate)}</div> : null}
    </>}>
      {warnings.length
        ? <WarningIcon className={iconClasses.warning} />
        : <InfoIcon className={iconClasses.info} />}
    </Tip>);
}

function GameDropDown({chosenGame, enabled, onChange}: {chosenGame: Game | null, enabled: boolean, onChange: React.ChangeEventHandler<any>}) {
  return <>
    {/* <FormControl error={chosenGame == null} size='small'> */}
    {/* <InputLabel>Game</InputLabel> */}
    <select value={chosenGame || ''} disabled={!enabled} onChange={onChange} style={{width: "5em"}}>
      <option disabled value=''>Game</option>
      {[...allGames()].map((game) => <option key={game} value={game}>{`TH${game}`}</option>)}
    </select>
    {/* </FormControl> */}
  </>;
}
