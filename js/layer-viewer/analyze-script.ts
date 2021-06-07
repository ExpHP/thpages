import type JSZip from 'jszip';

import {ANM_INS_TABLE} from "~/js/tables";
import {parseGame, Game} from '~/js/tables/game';

export type AnmSpec = {
  textures: AnmSpecTexture[],
  sprites: AnmSpecSprite[],
  scripts: AnmSpecScript[],
};
export type AnmSpecScript = {indexInFile: number, sprites: (number | null)[], layers: (number | null)[]};
export type AnmSpecSprite = {indexInFile: number, texture: number, left: number, top: number, width: number, height: number};
export type AnmSpecTexture = {indexInFile: number, path: string, xOffset: number, yOffset: number};


async function runLayerViewer(status: Status, cancel: Cancel, zip: JSZip, $layerViewer: HTMLElement): Promise<void> {
  // clear any existing stuff
  $layerViewer.innerHTML = '';
  LVIEWER_TIP_RESOLVER = new PrefixResolver();
  globalTips.registerPrefix('layer-viewer', LVIEWER_TIP_RESOLVER);

  const specZipObjs = zip.file(/spec\.spec/);
  const progress = {
    anmFilesDone: 0,
    anmFilesTotal: specZipObjs.length,
    remainingFilenames: specZipObjs.map((obj) => `${obj.name.split('/')[0]}.anm`),
  };
  status.setFromProgress(progress);

  const helpers = {status, cancel, progress};
  const game = await readGameFromZip(helpers, zip);

  const promises = specZipObjs.map(async (specZipObj) => {
    const text = await specZipObj.async('text');
    cancel.check();
    const parsedSpec = parseAnmSpec(text, game, specZipObj.name);
    const subdir = specZipObj.name.split('/')[0];
    const anmBasename = subdir;

    return addAnmFileToLayerViewer(helpers, $layerViewer, layerPackers, zip, subdir, parsedSpec);
  });

  // Work is now occurring on all anm files concurrently.
  // To properly trap errors though we need to await everything.
  await Promise.all(promises);
}


async function readGameFromZip({cancel}: Helpers, zip: JSZip) {
  const gameZipObj = zip.file('game.txt');
  if (!gameZipObj) {
    throw new Error('missing game.txt in archive');
  }

  const gameStr = (await gameZipObj.async('text')).trim();
  const game = parseGame(gameStr);
  cancel.check();
  if (game === null) {
    throw new Error(`unable to parse game number "${game}"`);
  }

  return game;
}


// This is a really dumb parser that's easily fooled. Please be nice to it.
export function parseAnmSpec(text: string, game: Game, filename?: string): AnmSpec {
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  type EntryState = {state: 'entry', path: string | null, xOffset: number, yOffset: number};
  type ScriptState = {state: 'script', layers: (number | null)[], sprites: (number | null)[]};
  type NoState = {state: null};
  let state: EntryState | ScriptState | NoState = {state: null};

  const layerOpcode = ANM_INS_TABLE.reverseTable.get(game)?.get('anm:layer');
  if (layerOpcode == null) {
    throw new Error(`game ${game} does not have layers, you silly billy`);
  }

  const layerInsRe = new RegExp(`ins_${layerOpcode}\\(([0-9]+)\\)`);
  const readLayerInsDigits = (line: string) => line.match(layerInsRe)?.[1];

  const lines = text.split('\n');
  const out: AnmSpec = {textures: [], sprites: [], scripts: []};
  for (let lineI = 0; lineI < lines.length; lineI++) {
    const line = lines[lineI];
    const lineErr = (msg: string) => new Error(`${filename || '<unknown>'}:${lineI}: ${msg}`);

    if (line.startsWith('entry')) {
      if (state.state !== null) {
        throw lineErr(`Expected '}' before 'entry'`);
      }
      state = {state: 'entry', path: null, xOffset: 0, yOffset: 0};

    } else if (line.startsWith('script')) {
      if (state.state !== null) {
        throw lineErr(`Expected '}' before 'script'`);
      }
      state = {state: 'script', layers: [], sprites: []};

    } else if (line.startsWith('}')) {
      switch (state.state) {
        case null:
          throw lineErr(`Unexpected '}'`);
        case 'entry': {
          // end of entry
          if (state.path === null) {
            throw lineErr(`No image filepath found in entry!`);
          }
          const {path, xOffset, yOffset} = state;
          out.textures.push({indexInFile: out.textures.length, path, xOffset, yOffset});
          state = {state: null};
          break;
        }
        case 'script': {
          // end of script
          const unnullify = (a: number | null) => a == null ? -1 : a;

          state.sprites = [...new Set(state.sprites)];
          state.sprites.sort((a, b) => unnullify(a) - unnullify(b));
          state.layers = [...new Set(state.layers)];
          state.layers.sort((a, b) => unnullify(a) - unnullify(b));
          out.scripts.push({indexInFile: out.scripts.length, sprites: state.sprites, layers: state.layers});
          state = {state: null};
          break;
        }
      }

    } else if (state.state === 'entry') {
      let match: RegExpMatchArray | null;
      if (match = line.match(/name: "([^"]+)"/)) {
        // no need to unescape anything because thanm itself doesn't escape anything
        state.path = match[1];
      } else if (match = line.match(/xOffset: ([0-9]+),/)) {
        state.xOffset = Number.parseInt(match[1]);
      } else if (match = line.match(/yOffset: ([0-9]+),/)) {
        state.yOffset = Number.parseInt(match[1]);
      }
      // we rely on the default, sequential sprite names being used for simplicity
      if (match = line.match(/sprite([0-9]+): *(\{.+\})/)) {
        if (Number.parseInt(match[1], 10) !== out.sprites.length) {
          throw lineErr(`Expected to find sprite${out.sprites.length} here!`);
        }

        // the syntax is *almost* valid json
        const json = JSON.parse(match[2].replace(/(\w+):/g, '"$1":'));
        out.sprites.push({
          indexInFile: out.sprites.length,
          texture: out.textures.length,
          left: json.x, top: json.y,
          width: json.w, height: json.h,
        });
      }

    } else if (state.state === 'script') {
      let match: RegExpMatchArray | null;
      if (match = line.match(/sprite([0-9]+)/)) {
        state.sprites.push(Number.parseInt(match[1], 10));
      }

      const layerStr = readLayerInsDigits(line);
      if (layerStr) {
        state.layers.push(Number.parseInt(layerStr, 10));
      }
    }
  } // for (let lineI = ...)

  return out;
}
