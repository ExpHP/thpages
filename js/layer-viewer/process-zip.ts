import type JSZip from 'jszip';

import {ANM_INS_TABLE} from "~/js/tables";
import {parseGame, Game} from '~/js/tables/game';
import {readUploadedFile, domOnce} from '~/js/util';
import type {Cancel} from './LayerViewer';

const JSZipPromise = import('jszip'); // big module

export type AnmSpecs = {
  specs: AnmSpec[];
  maxLayer: number;
};

export type AnmSpec = {
  basename: string,
  textures: AnmSpecTexture[];
  sprites: AnmSpecSprite[];
  scripts: AnmSpecScript[];
  textureImages: Promise<HTMLImageElement | null>[];
};
type ParsedAnmSpec = Omit<AnmSpec, 'textureImages' | 'basename'>;
export type AnmSpecScript = {indexInFile: number, sprites: (number | null)[], layers: (number | null)[]};
export type AnmSpecSprite = {indexInFile: number, texture: number, left: number, top: number, width: number, height: number};
export type AnmSpecTexture = {indexInFile: number, path: string, xOffset: number, yOffset: number};

export async function loadAnmZip(cancel: Cancel, file: File): Promise<AnmSpecs> {
  console.log('loadAnmZip');
  const zipBytes = await readUploadedFile(file, 'binary');
  cancel.check();
  const zip = await (await JSZipPromise).loadAsync(zipBytes);
  cancel.check();
  const game = await readGameFromZip(cancel, zip);
  cancel.check();

  const specZipObjs = zip.file(/spec\.spec/);
  // progress.startAnmFiles(specZipObjs.map((obj) => `${specAnmBasename(obj.name)}.anm`));

  const specs = await Promise.all(specZipObjs.map(async (specZipObj) => {
    const text = await specZipObj.async('text');
    cancel.check();
    const parsedSpec = parseAnmSpec(text, game, specZipObj.name);
    const subdir = specAnmBasename(specZipObj.name);
    const textureImages = beginLoadingTexturesFromZip(cancel, parsedSpec, zip, subdir);
    return {...parsedSpec, textureImages, basename: subdir};
  }));

  const maxLayer = findMaxLayer(specs);
  return {specs, maxLayer};
}


function findMaxLayer(specs: AnmSpec[]): number {
  const maxBySpec = specs.map((spec) => Math.max(...spec.scripts.map(
      (script) => Math.max(...script.layers.map((layer) => layer || 0)),
  )));

  return Math.max(...maxBySpec, 0);
}


function specAnmBasename(specPath: string): string {
  return specPath.split('/')[0];
}


async function readGameFromZip(cancel: Cancel, zip: JSZip) {
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
function parseAnmSpec(text: string, game: Game, filename?: string): ParsedAnmSpec {
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
  const out: ParsedAnmSpec = {textures: [], sprites: [], scripts: []};
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


function beginLoadingTexturesFromZip(cancel: Cancel, anmSpec: ParsedAnmSpec, zip: JSZip, subdir: string): Promise<HTMLImageElement | null>[] {
  return anmSpec.textures.map(async ({path}) => {
    if (path.charAt(0) === '@') {
      return null; // dynamic image buffer, not a spritesheet
    }

    const file = zip.file(`${subdir}/${path}`);
    if (!file) {
      throw new Error(`Could not find image file "${path}" in archive`);
    }
    const $textureImg = new Image();
    const textureBytes = await file.async('arraybuffer');
    cancel.check();
    setImageToObjectUrl($textureImg, new Blob([textureBytes], {type: 'image/png'}));

    // Wait for the image to load before using it to create sprites.
    await domOnce($textureImg, 'load');
    cancel.check();

    return $textureImg;
  });
}


// FIXME: Due to SPA design, this probably still leaks memory if the user navigates to another "page" before
//        the image loads, but the process of exacerbating this leak is slow so (a) it's difficult to validate the
//        success of any solution to the problem and (b) the problem will probably never noticeably impact anyone.
/** Sets an image to use an object URL for the given object, automatically revoking the URL once it is loaded. */
export function setImageToObjectUrl($img: HTMLImageElement, object: Blob) {
  $img.src = URL.createObjectURL(object);
  $img.addEventListener('load', () => URL.revokeObjectURL($img.src));
}
