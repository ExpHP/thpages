import {Game, allGames} from '../game-names';

export type AnmVersion = 'v0' | 'v2' | 'v3' | 'v4' | 'v8';
export type SupportedAnmVersion = 'v2' | 'v3' | 'v4' | 'v8';
export const SUPPORTED_ANM_VERSIONS: SupportedAnmVersion[] = ['v2', 'v3', 'v4', 'v8'];
export const GAME_ANM_VERSIONS: {[k in Game]: AnmVersion} = {
  "06": 'v0',
  "07": 'v2',
  "08": 'v3', "09": 'v3',
  "095": 'v4', "10": 'v4', "11": 'v4',
  "12": 'v4', "125": 'v4', "128": 'v4',
  "13": 'v8', "14": 'v8', "143": 'v8', "15": 'v8',
  "16": 'v8', "165": 'v8', "17": 'v8',
};

export type AnmVersionData = {
  minGame: Game,
  maxGame: Game,
};

export const ANM_VERSION_DATA: {[k in AnmVersion]: AnmVersionData} = {} as any;
for (const game of allGames()) {
  const version = GAME_ANM_VERSIONS[game];
  if (ANM_VERSION_DATA[version] === undefined) {
    ANM_VERSION_DATA[version] = {minGame: game, maxGame: game};
  }
  ANM_VERSION_DATA[version].maxGame = game;
}
