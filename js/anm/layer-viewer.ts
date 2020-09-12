import JSZip from 'jszip';
import {readUploadedFile} from '../util';
import {parseGame, Game} from '../game-names';
import {ANM_INS_HANDLERS} from './tables';
import Packery from 'packery';
import * as events from 'events';

type AnmSpec = {
  textures: AnmSpecTexture[],
  sprites: AnmSpecSprite[],
  scripts: AnmSpecScript[],
};
type AnmSpecScript = {sprite: number | null, layer: number | null};
type AnmSpecSprite = {texture: number, left: number, top: number, width: number, height: number};
type AnmSpecTexture = {path: string};

type Progress = {anmFilesTotal: number, anmFilesDone: number};

(window as any).buildLayerViewer = buildLayerViewer;
async function buildLayerViewer() {
  const $layerViewer = document.querySelector<HTMLElement>('#layer-viewer-output')!;
  const $fileUpload = document.querySelector<HTMLInputElement>('#layer-viewer-file')!;
  $fileUpload.addEventListener('change', async () => await trapErr(async () => {
    if ($fileUpload.files!.length === 0) return;
    setStatus(`Reading zip file structure...`);

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

    const specs = zip.file(/spec\.spec/);
    const progress = {anmFilesDone: 0, anmFilesTotal: specs.length};
    setStatusFromProgress(progress);

    const layerPackers: Packery[] = [];
    for (const entry of specs) {
      const text = await entry.async('text');
      const parsed = parseAnmSpec(text, game, entry.name);
      const subdir = entry.name.split('/')[0];
      addAnmFileToLayerViewer($layerViewer, layerPackers, zip, subdir, parsed, progress);
    }
  }));
}

async function trapErr<T>(cb: () => Promise<T>): Promise<T> {
  try {
    return await cb();
  } catch (e) {
    const $error = document.querySelector<HTMLElement>('#layer-viewer-error')!;
    if ($error.style.display === 'none') {
      $error.innerText = `An error occurred:\n\n${e}`;
      $error.style.display = 'block';
    }
    throw e;
  }
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

async function addAnmFileToLayerViewer($layerViewer: HTMLElement, layerPackers: Packery[], zip: JSZip, subdir: string, specData: AnmSpec, progress: Progress) {
  // Add boxes for new layers as needed.
  const maxLayerInFile = specData.scripts.map((script) => script.layer || 0).reduce((a, b) => Math.max(a, b));
  while (layerPackers.length <= maxLayerInFile) {
    const thisLayer = layerPackers.length;

    const $header = document.createElement('h2');
    $header.innerText = `Layer ${thisLayer}`;
    $layerViewer.appendChild($header);

    const $div = document.createElement('div');
    $div.classList.add('layer-viewer-scripts');
    $layerViewer.appendChild($div);

    // don't give packery the div itself because it always sets height
    const $inner = document.createElement('div');
    $inner.classList.add('packery-container');
    $div.appendChild($inner);

    layerPackers.push(new Packery($inner, {itemSelector: '.grid-item', gutter: 4}));
  }

  // A canvas used to help extract the region of a texture corresponding to a sprite.
  const $clippingCanvas = document.createElement('canvas');
  const clippingCtx = $clippingCanvas.getContext('2d');
  if (!clippingCtx) throw new Error(`Failed to create 2D rendering context`);

  for (let textureI = 0; textureI < specData.textures.length; textureI++) {
    const texture = specData.textures[textureI];
    const {path} = texture;

    let getGridItem: (sprite: AnmSpecSprite) => Promise<HTMLElement>;
    if (path.startsWith('@')) {
      getGridItem = (sprite) => makeGridItemForDynamicSprite(subdir, texture, sprite);
    } else {
      const file = zip.file(`${subdir}/${path}`);
      if (!file) {
        throw new Error(`Could not find image file "${path}" in archive`);
      }
      const $textureImg = new Image();
      const textureBytes = await file.async('arraybuffer');
      setImageToObjectUrl($textureImg, new Blob([textureBytes], {type: 'image/png'}));

      // FIXME: what's the idiomatic conversion from ErrorEvent to Error? ev.error is experimental...
      const emitter = new events.EventEmitter();
      $textureImg.addEventListener('load', () => emitter.emit('load'));
      $textureImg.addEventListener('error', (ev) => emitter.emit('error', new Error(ev.message)));
      await events.once(emitter, 'load');

      getGridItem = (sprite) => makeGridItemForImageSprite($textureImg, sprite);
    }

    // We haven't collected scripts for a texture ahead of time so just filter the list.
    // This technically leads to quadratic complexity but no anm file in any game has THAT many textures...
    for (const script of specData.scripts) {
      if (!script.layer) continue;
      if (!script.sprite) continue;
      const sprite = specData.sprites[script.sprite];
      if (sprite.texture === textureI) {
        // (TODO: consider getting all of these started and then using Promise.all)
        const $gridItem = await getGridItem(sprite);
        $gridItem.classList.add('grid-item');

        $layerViewer.querySelectorAll('.layer-viewer-scripts .packery-container').item(script.layer).appendChild($gridItem);
        layerPackers[script.layer!].appended($gridItem);
      }
    }
  }
  // Because we awaited all promises we know everything for this anm file is done.
  progress.anmFilesDone += 1;
  setStatusFromProgress(progress);
}

async function makeGridItemForImageSprite($textureImg: HTMLImageElement, sprite: AnmSpecSprite) {
  // create a new <img> whose image is the texture cropped to this sprite.
  const $clippingCanvas = document.createElement('canvas');
  const clippingCtx = $clippingCanvas.getContext('2d');
  if (!clippingCtx) throw new Error(`Failed to create 2D rendering context`);
  $clippingCanvas.width = sprite.width;
  $clippingCanvas.height = sprite.height;
  clippingCtx.clearRect(0, 0, sprite.width, sprite.height);
  clippingCtx.drawImage(
      $textureImg,
      sprite.left, sprite.top, sprite.width, sprite.height, // source rect
      0, 0, sprite.width, sprite.height, // dest rect
  );

  const $spriteImg = new Image();
  const [nicerWidth, nicerHeight] = nicerImageSize([sprite.width, sprite.height]);
  $spriteImg.width = nicerWidth;
  $spriteImg.height = nicerHeight;
  const blob = await canvasToBlobAsync($clippingCanvas);
  setImageToObjectUrl($spriteImg, blob);

  return $spriteImg;
}

async function makeGridItemForDynamicSprite(anmName: string, texture: AnmSpecTexture, sprite: AnmSpecSprite) {
  const $gridItem = document.createElement('div');
  $gridItem.classList.add('imageless');

  $gridItem.innerHTML = /* html */`
    <div class='buffer-type'>${texture.path}</div>
    <div class='sprite-size'>${sprite.width}×${sprite.height}</div>
    <div class='anm-name'>${anmName}</div>
  `;

  return $gridItem;
}
// FIXME: Due to SPA design, this probably still leaks memory if the user navigates to another "page" before
//        the image loads, but the process of exacerbating this leak is slow so (a) it's difficult to validate the
//        success of any solution to the problem and (b) the problem will probably never noticeably impact anyone.
/** Sets an image to use an object URL for the given object, automatically revoking the URL once it is loaded. */
function setImageToObjectUrl($img: HTMLImageElement, object: Blob) {
  $img.src = URL.createObjectURL(object);
  $img.addEventListener('load', () => URL.revokeObjectURL($img.src));
}

function setStatus(text: string) {
  document.getElementById('layer-viewer-status')!.innerText = text;
}

function setStatusFromProgress({anmFilesDone, anmFilesTotal}: Progress) {
  const endPunctuation = anmFilesDone === anmFilesTotal ? '!' : '...';
  setStatus(`Processed ${anmFilesDone} of ${anmFilesTotal} anm files${endPunctuation}`);
}

function nicerImageSize([w, h]: [number, number]): [number, number] {
  // shrink the image down to a maximum dimension of 200 px, unless this would cause the other dimension
  // to be smaller than 16 px
  if (Math.min(w, h) < 16) {
    return [w, h];
  }
  let oversizeFactor = Math.max(1, w/150, h/150);
  if (Math.min(w, h) / oversizeFactor < 16) {
    oversizeFactor = Math.min(1, w/16, h/16);
  }
  return [w / oversizeFactor, h / oversizeFactor];
}

function canvasToBlobAsync($canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    $canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('toBlob() produced null!'));
    });
  });
}
