import {Game, parseGame} from '~/js/tables/game';

export interface Mapfile {
  ins: Map<number, string>;
  insSignature: Map<number, string>;
  vars: Map<number, string>;
  varType: Map<number, string>;
  timelineIns: Map<number, string>;
  timelineInsSignature: Map<number, string>;
}

export type MapSet = {game: Game, mapfile: Mapfile}[];

/** Read a mapfile. */
export function parseMapfile(text: string, warn: (msg: string) => void): Mapfile {
  const {magic, seqmaps} = parseSeqmapFile(text);
  if (!STANDARD_MAGICS.includes(magic)) {
    throw new Error(`bad magic: ${magic}`);
  }

  const out = {
    ins: popKey(seqmaps, "ins_names") || new Map(),
    insSignature: popKey(seqmaps, "gvar_names") || new Map(),
    vars: popKey(seqmaps, "timeline_ins_names") || new Map(),
    varType: popKey(seqmaps, "ins_signatures") || new Map(),
    timelineIns: popKey(seqmaps, "gvar_types") || new Map(),
    timelineInsSignature: popKey(seqmaps, "timeline_ins_signatures") || new Map(),
  };

  if (seqmaps.size) {
    warn(`invalid sections: ${[...seqmaps.keys()].join(", ")}`);
  }

  return out;
}

/**
 * Read a gamemap that accesses nearby files.
 *
 * For safety, filenames in the gamemap will be required to use only simple characters without path separators.
 */
export async function loadMapSet({gamemapFilename, readFile, warn}: {
    gamemapFilename: string,
    readFile: (filename: string) => Promise<string>,
    warn: (msg: string) => void,
}): Promise<MapSet> {
  function validateFilename(fname: string) {
    if (!fname.match(/^[a-zA-Z0-9._\- ]+$/)) {
      throw new Error(`bad filename: '${fname}'`);
    }
    return fname;
  }

  const gamemapText = await readFile(validateFilename(gamemapFilename));
  const gamemap = parseSeqmapFile(gamemapText);
  if (!GAMEMAP_MAGICS.includes(gamemap.magic)) {
    throw new Error(`bad magic: ${gamemap.magic}`);
  }
  const gameFiles = popKey(gamemap.seqmaps, 'game_files');
  if (!gameFiles) {
    throw new Error('empty gamemap');
  }

  const uniqueFiles = getUniqueFilesFromGameMap(gameFiles, warn);
  return await Promise.all(uniqueFiles.map(async ({game, filename}) => {
    const mapfileText = await readFile(validateFilename(filename));
    const mapfile = parseMapfile(mapfileText, warn);
    return {game, mapfile};
  }));
}

function getUniqueFilesFromGameMap(gameFiles: Map<number, string>, warn: (msg: string) => void): {game: Game, filename: string}[] {
  // get the last game that uses each file
  const games = [...gameFiles.keys()].flatMap((gameNum) => {
    const game = parseGame(`${gameNum}`);
    if (!game) {
      warn(`unknown game: ${gameNum}`);
      return [];
    } else return [game];
  });
  games.sort();
  games.reverse();

  const out = [];
  const seenFiles = new Set();
  for (const game of games) {
    const filename = gameFiles.get(parseInt(game, 10))!;
    if (!seenFiles.has(filename)) {
      seenFiles.add(filename);
      out.push({game, filename});
    }
  }
  return out.reverse();
}

function popKey<K, V>(map: Map<K, V>, key: K): V | undefined {
  const value = map.get(key);
  map.delete(key);
  return value;
}

// =============================================================================
// Parsing a single mapfile

type SeqmapFile = {
  magic: string,
  seqmaps: Map<string, Map<number, string>>,
};

const GAMEMAP_MAGICS = ['gamemap'];
const STANDARD_MAGICS = ['anmmap', 'eclmap', 'stdmap', 'endmap', 'msgmap', 'seqmap'];
const VALID_MAGICS = [...GAMEMAP_MAGICS, ...STANDARD_MAGICS];

function parseSeqmapFile(text: string): SeqmapFile {
  const [firstLine, ...lexedLines] = lexSeqmapFile(text);
  if (!(firstLine)) {
    throw new Error(`empty file`);
  } else if (!(firstLine.type === 'control' && VALID_MAGICS.includes(firstLine.data.key))) {
    throw new Error(`bad magic: ${firstLine}`);
  }

  const seqmaps = new Map<string, Map<number, string>>();
  let currentSeqmap = null;
  for (const line of lexedLines) {
    if (line.type === 'control') {
      const {key} = line.data;
      if (!seqmaps.has(key)) {
        seqmaps.set(key, new Map());
      }
      currentSeqmap = seqmaps.get(key);

    } else if (line.type === 'definition') {
      const {number, value} = line.data;
      if (!currentSeqmap) {
        throw new Error(`missing section header at "${line}"`);
      }
      currentSeqmap.set(number, value);
    }
  }

  return {magic: firstLine.data.key, seqmaps};
}

type LexedLine =
  | {type: 'control', data: {key: string}}
  | {type: 'definition', data: {number: number, value: string}}
  ;

function lexSeqmapFile(text: string): LexedLine[] {
  const lines = text.split(/\r?\n/);

  return lines.flatMap((line) => {
    if (line.match(/^![a-zA-Z_][a-zA-Z0-9_]*$/)) {
      return [{type: 'control', data: {key: line.substring(1)}}];
    } else {
      line = line.split('#')[0].trim(); // comment
      let match;
      if (line.match(/^\s*$/)) {
        return [];
      } else if (match = line.match(/^(?<opcode>(?:0|-?[1-9][0-9]*))[ \t]+(?<value>.*)$/)) {
        const number = parseInt(match.groups!.opcode, 10);
        const value = match.groups!.value;
        return [{type: 'definition', data: {number, value}}];
      } else {
        throw new Error(`bad line in mapfile: "${line}"`);
      }
    }
  });
}
