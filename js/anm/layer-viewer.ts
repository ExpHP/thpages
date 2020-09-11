import JSZip from 'jszip';
import {readUploadedFile} from '../util';
import {parseGame, Game} from '../game-names';
import {ANM_INS_HANDLERS} from './tables';

type AnmSpec = {
  textures: AnmSpecTexture[],
  sprites: AnmSpecSprite[],
  scripts: AnmSpecScript[],
};
type AnmSpecScript = {sprite: number | null, layer: number | null};
type AnmSpecSprite = {texture: number, left: number, top: number, width: number, height: number};
type AnmSpecTexture = {path: string};


(window as any).buildLayerViewer = buildLayerViewer;
async function buildLayerViewer() {
  const $layerViewer = document.querySelector<HTMLElement>('#layer-viewer-output')!;
  const $fileUpload = document.querySelector<HTMLInputElement>('#layer-viewer-file')!;
  $fileUpload.addEventListener('change', async () => {
    if ($fileUpload.files!.length === 0) return;

    const zipBytes = await readUploadedFile($fileUpload.files![0], 'binary');
    const zip = await JSZip.loadAsync(zipBytes);

    const entry = zip.file('game.txt');
    if (!entry) {
      throw new Error('missing game.txt in archive');
    }

    const gameStr = (await entry.async('text')).trim();
    const game = parseGame(gameStr);
    if (game === null) {
      throw new Error(`unable to parse game number "${game}"`);
    }

    for (const entry of zip.file(/spec\.spec/)) {
      const text = await entry.async('text');
      const parsed = parseAnmSpec(text, game, entry.name);
      const subdir = entry.name.split('/')[0];
      updateLayerViewer($layerViewer, zip, subdir, parsed);
    }
  });
}

// This is a really dumb parser that's easily fooled. Please be nice to it.
function parseAnmSpec(text: string, game: Game, filename?: string): AnmSpec {
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  type EntryState = {state: 'entry', path: string | null};
  type ScriptState = {state: 'script', layer: number | null, sprite: number | null};
  type NoState = {state: null};
  let state: EntryState | ScriptState | NoState = {state: null};

  const layerOpcode = ANM_INS_HANDLERS.reverseTable[game]?.['anm:layer'];
  if (layerOpcode === null) {
    throw new Error(`game ${game} does not have layers, you silly billy`);
  }

  const layerInsRe = new RegExp(`ins_${layerOpcode}\\(([0-9]+)\\)`);
  const readLayerInsDigits = (line: string) => line.match(layerInsRe)?.[1];

  const lines = text.split('\n');
  const out: AnmSpec = {textures: [], sprites: [], scripts: []};
  for (let lineI=0; lineI < lines.length; lineI++) {
    const line = lines[lineI];
    const lineErr = (msg: string) => new Error(`${filename || '<unknown>'}:${lineI}: ${msg}`);

    if (line.startsWith('entry')) {
      if (state.state !== null) {
        throw lineErr(`Expected '}' before 'entry'`);
      }
      state = {state: 'entry', path: null};

    } else if (line.startsWith('script')) {
      if (state.state !== null) {
        throw lineErr(`Expected '}' before 'script'`);
      }
      state = {state: 'script', layer: null, sprite: null};

    } else if (line.startsWith('}')) {
      switch (state.state) {
        case null:
          throw lineErr(`Unexpected '}'`);
        case 'entry':
          if (state.path === null) {
            throw lineErr(`No image filepath found in entry!`);
          }
          out.textures.push({path: state.path});
          state = {state: null};
          break;
        case 'script':
          out.scripts.push({sprite: state.sprite, layer: state.layer});
          state = {state: null};
          break;
      }

    } else if (state.state === 'entry') {
      let match: RegExpMatchArray | null;
      if (match = line.match(/name: "([^"]+)"/)) {
        // no need to unescape anything because thanm itself doesn't escape anything
        state.path = match[1];
      }
      // we rely on the default, sequential sprite names being used for simplicity
      if (match = line.match(/sprite([0-9]+): *(\{.+\})/)) {
        if (Number.parseInt(match[1], 10) !== out.sprites.length) {
          throw lineErr(`Expected to find sprite${out.sprites.length} here!`);
        }

        // the syntax is *almost* valid json
        const json = JSON.parse(match[2].replace(/(\w+):/g, '"$1":'));
        out.sprites.push({
          texture: out.textures.length,
          left: json.x, top: json.y,
          width: json.w, height: json.h,
        });
      }

    } else if (state.state === 'script') {
      let match: RegExpMatchArray | null;
      if (match = line.match(/sprite([0-9]+)/)) {
        state.sprite = Number.parseInt(match[1], 10);
      }

      const layerStr = readLayerInsDigits(line);
      if (layerStr) {
        state.layer = Number.parseInt(layerStr, 10);
      }
    }
  }

  return out;
}

async function updateLayerViewer($layerViewer: HTMLElement, zip: JSZip, subdir: string, specData: AnmSpec) {
  // Add boxes for new layers as needed.
  const maxLayerInFile = specData.scripts.map((script) => script.layer || 0).reduce((a, b) => Math.max(a, b));
  let numLayersListed = $layerViewer.querySelectorAll('.layer-viewer-scripts').length;
  while (numLayersListed <= maxLayerInFile) {
    const thisLayer = numLayersListed;

    const $header = document.createElement('h2');
    $header.innerText = `Layer ${thisLayer}`;
    $layerViewer.appendChild($header);

    const $div = document.createElement('div');
    $div.classList.add('layer-viewer-scripts');
    $layerViewer.appendChild($div);

    numLayersListed += 1;
  }

  // A canvas used to help extract the region of a texture corresponding to a sprite.
  const $clippingCanvas = document.createElement('canvas');
  const clippingCtx = $clippingCanvas.getContext('2d');
  if (!clippingCtx) throw new Error(`Failed to create 2D rendering context`);

  // Do one texture at a time so that the user starts seeing things happen immediately.
  for (let textureI = 0; textureI < specData.textures.length; textureI++) {
    const {path} = specData.textures[textureI];
    if (path.startsWith('@')) {
      // TODO
      continue;
    }

    const file = zip.file(`${subdir}/${path}`);
    if (!file) {
      throw new Error(`Could not find image file "${path}" in archive`);
    }
    const $textureImg = new Image();
    const textureBytes = await file.async('arraybuffer');
    setImageToObjectUrl($textureImg, new Blob([textureBytes], {type: 'image/png'}));

    $textureImg.addEventListener('load', () => {
      // We haven't collected scripts for a texture ahead of time so just filter the list.
      // This technically leads to quadratic complexity but no anm file in any game has THAT many textures...
      for (const script of specData.scripts) {
        if (!script.layer) continue;
        if (!script.sprite) continue;
        const sprite = specData.sprites[script.sprite];
        if (sprite.texture === textureI) {
          $clippingCanvas.width = sprite.width;
          $clippingCanvas.height = sprite.height;
          clippingCtx.clearRect(0, 0, sprite.width, sprite.height);
          clippingCtx.drawImage(
              $textureImg,
              sprite.left, sprite.top, sprite.width, sprite.height, // source rect
              0, 0, sprite.width, sprite.height, // dest rect
          );
          const $spriteImg = new Image();
          $clippingCanvas.toBlob((blob) => {
            if (blob) setImageToObjectUrl($spriteImg, blob);
          });

          $layerViewer.querySelectorAll('.layer-viewer-scripts').item(script.layer).appendChild($spriteImg);
        }
      }
    });
  }
}

// FIXME: Due to SPA design, this probably still leaks memory if the user navigates to another "page" before
//        the image loads, but the process of exacerbating this leak is slow so (a) it's difficult to validate the
//        success of any solution to the problem and (b) the problem will probably never noticeably impact anyone.
/** Sets an image to use an object URL for the given object, automatically revoking the URL once it is loaded. */
function setImageToObjectUrl($img: HTMLImageElement, object: Blob) {
  $img.src = URL.createObjectURL(object);
  $img.addEventListener('load', () => URL.revokeObjectURL($img.src));
}
