import {Game, allGames} from '../game-names';

export type AnmVersion = 'v0' | 'v2' | 'v3' | 'v4' | 'v8';
export type SupportedAnmVersion = AnmVersion;
export const SUPPORTED_ANM_VERSIONS: SupportedAnmVersion[] = ['v0', 'v2', 'v3', 'v4', 'v8'];
export const GAME_ANM_VERSIONS: {[k in Game]: AnmVersion} = {
  "06": 'v0',
  "07": 'v2',
  "08": 'v3', "09": 'v3',
  "095": 'v4', "10": 'v4', "11": 'v4',
  "12": 'v4', "125": 'v4', "128": 'v4',
  "13": 'v8', "14": 'v8', "143": 'v8', "15": 'v8',
  "16": 'v8', "165": 'v8', "17": 'v8', "18": 'v8',
};

export type StdVersion = 'eosd' | 'classic' | 'modern';
export const SUPPORTED_STD_VERSIONS: StdVersion[] = ['eosd', 'classic', 'modern'];
export const GAME_STD_VERSIONS: {[k in Game]: StdVersion} = {
  "06": 'eosd',
  "07": 'classic', "08": 'classic', "09": 'classic',
  "095": 'modern', "10": 'modern', "11": 'modern',
  "12": 'modern', "125": 'modern', "128": 'modern',
  "13": 'modern', "14": 'modern', "143": 'modern', "15": 'modern',
  "16": 'modern', "165": 'modern', "17": 'modern', "18": 'modern',
};

// FIXME temp; MSG should not have versions.
export type MsgVersion = Game;
export const SUPPORTED_MSG_VERSIONS: MsgVersion[] = [...allGames()];
export const GAME_MSG_VERSIONS: {[k in Game]: MsgVersion} = {
  "06": '06',
  "07": '07', "08": '08', "09": '09',
  "095": '095', "10": '10', "11": '11',
  "12": '12', "125": '125', "128": '128',
  "13": '13', "14": '14', "143": '143', "15": '15',
  "16": '16', "165": '165', "17": '17', "18": '18',
};

export type VersionData = {
  minGame: Game,
  maxGame: Game,
};

export const ANM_VERSION_DATA: {[k in AnmVersion]: VersionData} = {} as any;
for (const game of allGames()) {
  const version = GAME_ANM_VERSIONS[game];
  if (ANM_VERSION_DATA[version] === undefined) {
    ANM_VERSION_DATA[version] = {minGame: game, maxGame: game};
  }
  ANM_VERSION_DATA[version].maxGame = game;
}

export const STD_VERSION_DATA: {[k in StdVersion]: VersionData} = {} as any;
for (const game of allGames()) {
  const version = GAME_STD_VERSIONS[game];
  if (STD_VERSION_DATA[version] === undefined) {
    STD_VERSION_DATA[version] = {minGame: game, maxGame: game};
  }
  STD_VERSION_DATA[version].maxGame = game;
}

export const MSG_VERSION_DATA: {[k in MsgVersion]: VersionData} = {} as any;
for (const game of allGames()) {
  const version = GAME_MSG_VERSIONS[game];
  if (MSG_VERSION_DATA[version] === undefined) {
    MSG_VERSION_DATA[version] = {minGame: game, maxGame: game};
  }
  MSG_VERSION_DATA[version].maxGame = game;
}