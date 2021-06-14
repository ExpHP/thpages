import React from 'react';
import {Async} from 'react-async';
import clsx from 'clsx';

import {Wip, Title} from '~/js/XUtil';
import {TrustedMarkdown} from '~/js/Markdown';
import {arrayFromFunc, debugId, debugTimesSeen} from '~/js/util';
import {Tip} from '~/js/Tip';
import {Err} from '~/js/Error';

import {loadAnmZip, AnmSpecs, AnmSpec, AnmSpecTexture, AnmSpecScript, AnmSpecSprite} from './process-zip';
import {Packery, PackeryItem} from './Packery';

export function LayerViewerPage() {
  const [file, setFile] = React.useState<File | undefined>();

  return <>
    <Title>ANM Layer Viewer</Title>
    <PageText/>
    <p><input type='file' accept='.zip' onChange={(event) => setFile(event.target.files![0])} /></p>
    <hr style={{clear: 'both'}} />
    {file
      ? <LayerViewerFromFile file={file}/>
      : <h2>No file loaded</h2>
    }
  </>;
}

function PageText() {
  return <TrustedMarkdown>{/* md */`
# Layer Viewer

<!-- FIXME: should really be trying to make use of 'figure' elements and try to make the styling responsive -->
<img height="350" style="border: solid 2px white; float: right; margin: 10px;" src="content/anm/img/layer-viewer-example.png" />

This page can show you can show you all of the sprites whose ANM scripts explicitly use each layer in a Touhou game.

1. Make sure thtk binaries (particularly \`thdat\` and \`thanm\`) are available on your PATH.
   **IMPORTANT: even the latest release of thtk is not recent enough;**
   you will need a development version of thanm from the [\`thanm-new-spec-format\`](https://github.com/thpatch/thtk/tree/thanm-new-spec-format) branch.
   Windows builds of this branch are available in the \`#thtk-builds\` channel on the [ZUNcode Discord](https://discord.gg/fvPJvHJ).
   (commit \`b7321bb\` should do fine)
2. Use :dl[this python script]{href="content/anm/make-layer-viewer-zip.py"} to repackage the anm files from \`thXX.dat\` into a zip file:
   ~~~
   py -3 make-layer-viewer-zip.py --game 125 th125.dat -o th125-anms.zip
   ~~~
3. Click the button below and select the zip you created.
4. The page should begin to populate.

If you have problems/ideas/requests, go \`@\` me on the [ZUNcode discord](https://discord.gg/fvPJvHJ).
`}</TrustedMarkdown>;
}

type State = React.ReactElement[][];
type Action =
  | {type: 'add-script', payload: {layer: number, gridItem: React.ReactElement}}
  ;

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'add-script': {
      const {layer, gridItem} = action.payload;
      const newState = [...state];
      newState[layer] = [...newState[layer], gridItem]; // FIXME quadratic
      return newState;
    }
  }
}


function LayerViewerFromFile({file}: {file: File}) {
  const promiseFn = React.useCallback(({}, abort) => loadAnmZip(new Cancel(), file), [file]); // FIXME: abort to Cancel

  return <Async promiseFn={promiseFn}>
    <Async.Pending>Reading Zip...</Async.Pending>
    <Async.Rejected>{(e) => <Err>{e.message}</Err>}</Async.Rejected>
    <Async.Fulfilled>{(specs) => <LayerViewerFromSpecs specs={specs} />}</Async.Fulfilled>
  </Async>;
}


function LayerViewerFromSpecs({specs}: {specs: AnmSpecs}) {
  const [state, dispatch] = React.useReducer(reducer, null, () => arrayFromFunc(specs.maxLayer + 1, () => []));

  React.useEffect(() => {
    const cancel = new Cancel();
    for (const spec of specs.specs) {
      // start each file (this is async)
      addAnmFileToLayerViewer(dispatch, cancel, spec);
    }

    return () => cancel.cancel();
  }, [specs]);

  return <>
    {/* <Status /> */}
    {/* <ErrorDisplay /> */}
    <LayerViewers layers={state} />
  </>;
}


/** Helper used to cancel async operations on an error by using an exception to bubble out of cancelable operations. */
export class Cancel {
  public cancelled: boolean;
  public Error: new () => Error;
  constructor() {
    class CancelError extends Error {}
    this.cancelled = false;
    this.Error = CancelError;
  }
  public cancel() {
    this.cancelled = true;
  }
  /** Check for cancellation.  If cancellation has occurred, a CancelError is thrown to bubble out of the nearest `scope`. */
  public check() {
    if (this.cancelled) throw new this.Error();
  }
  /** Run a callback, catching CancelError.  This effectively sets a boundary for what gets canceled. */
  public scope<T>(cb: () => T): T | null {
    if (this.cancelled) return null;
    try {
      return cb();
    } catch (e) {
      if (e instanceof this.Error) return null;
      throw e;
    }
  }
  public async scopeAsync<T>(cb: () => Promise<T>): Promise<T | null> {
    if (this.cancelled) return null;
    try {
      return await cb();
    } catch (e) {
      if (e instanceof this.Error) return null;
      throw e;
    }
  }
}


function LayerViewers({layers}: {
    layers: React.ReactElement[][],
}) {
  return <>{layers.map((layer, index) => (
    <React.Fragment key={index}>
      <h2>Layer {index}</h2>
      <LayerViewer items={layer}/>
    </React.Fragment>
  ))}</>;
}

const LayerViewer = React.memo(function LayerViewer({items}: {
    items: React.ReactElement[],
}) {
  const packeryOptions = React.useMemo(() => ({gutter: 4}), []);

  // the outer div is because packery always sets height
  return <div className='layer-viewer-scripts'>
    <Packery className='packery-container' packeryOptions={packeryOptions}>
      {items.map((child, index) => <PackeryItem key={index}>{child}</PackeryItem>)}
    </Packery>
  </div>;
});


/** Add all images from an ANM file to the layer viewer. */
async function addAnmFileToLayerViewer(
    dispatch: React.Dispatch<Action>,
    cancel: Cancel,
    specData: AnmSpec,
) {
  for (const script of specData.scripts) {
    for (const layer of script.layers) {
      if (layer == null) continue;
      for (const spriteId of script.sprites) {
        if (spriteId == null) continue;

        const sprite = specData.sprites[spriteId];
        const texture = specData.textures[sprite.texture];
        const $textureImg = await specData.textureImages[sprite.texture];
        await new Promise((resolve) => setTimeout(resolve, 0));
        cancel.check();
        const className = clsx({'warn-multiple-layer': script.layers.length > 1});
        const gridItem = (
          <Tip tip={<TipBody anmName={specData.basename} script={script} sprite={sprite}/>}>
            {$textureImg
              ? <ImageSpriteGridItem className={className} {...{cancel, $textureImg, texture, sprite}}/>
              : <DynamicSpriteGridItem className={className} {...{anmName: specData.basename, texture, sprite}}/>}
          </Tip>
        );
        dispatch({type: 'add-script', payload: {layer, gridItem}});
      }
    }
  }
}

const ImageSpriteGridItem = React.memo(function ImageSpriteGridItem(allprops: {cancel: Cancel, texture: AnmSpecTexture, sprite: AnmSpecSprite, $textureImg: HTMLImageElement} & React.HTMLAttributes<HTMLElement>) {
  const {cancel, texture, sprite, $textureImg, ...props} = allprops;

  const [nicerWidth, nicerHeight] = nicerImageSize([sprite.width, sprite.height]);
  const promiseFn = React.useCallback(() => getCroppedSpriteBlob(cancel, texture, sprite, $textureImg), [cancel, texture, sprite, $textureImg]);

  if (sprite.width === 0 || sprite.height === 0) {
    return <div style={{width: 16, height: 16}}></div>;
  }

  return <Async promiseFn={promiseFn}>
    <Async.Pending><img width={nicerWidth} height={nicerHeight} src={TRANSPARENT_PIXEL_IMAGE_SRC} /></Async.Pending>
    <Async.Fulfilled>{(blob) => (
      <BlobImg width={nicerWidth} height={nicerHeight} blob={blob as Blob} {...props} />
    )}</Async.Fulfilled>
    <Async.Rejected><Err>img</Err></Async.Rejected>
  </Async>;
});

async function getCroppedSpriteBlob(cancel: Cancel, texture: AnmSpecTexture, sprite: AnmSpecSprite, $textureImg: HTMLImageElement): Promise<Blob> {
  // create a new <img> whose image is the texture cropped to this sprite.
  const $clippingCanvas = document.createElement('canvas');
  const clippingCtx = $clippingCanvas.getContext('2d');
  if (!clippingCtx) throw new Error(`Failed to create 2D rendering context`);
  $clippingCanvas.width = sprite.width;
  $clippingCanvas.height = sprite.height;
  clippingCtx.clearRect(0, 0, sprite.width, sprite.height);
  clippingCtx.drawImage(
      $textureImg,
      sprite.left + texture.xOffset, // source rect
      sprite.top + texture.yOffset,
      sprite.width, sprite.height,
      0, 0, sprite.width, sprite.height, // dest rect
  );

  let out;
  try {
    out = await canvasToBlobAsync($clippingCanvas);
  } catch (e) {
    console.error(sprite);
    throw e;
  }

  // need to check after every await (and we can't do this inside of the try, or the CancelError would be caught there)
  cancel.check();
  return out;
}

function BlobImg({blob, ...props}: {blob: Blob} & React.ImgHTMLAttributes<HTMLImageElement>) {
  const [objectUrl, setObjectUrl] = React.useState<string | undefined>();
  const ref = React.useRef<HTMLImageElement | null>(null);

  React.useEffect(() => {
    const url = URL.createObjectURL(blob);
    setObjectUrl(url);
    ref.current!.addEventListener('load', () => URL.revokeObjectURL(url));

    return () => URL.revokeObjectURL(url);
  }, [blob]);

  return <img ref={ref} src={objectUrl} {...props}/>;
}

function DynamicSpriteGridItem(allprops: {anmName: string, texture: AnmSpecTexture, sprite: AnmSpecSprite, className: string} & React.HTMLAttributes<HTMLDivElement>) {
  const {anmName, texture, sprite, className, ...props} = allprops;
  return <div className={clsx('imageless', className)} {...props}>
    <div className='buffer-type'>{texture.path}</div>
    <div className='sprite-size'>{sprite.width}×{sprite.height}</div>
    <div className='anm-name'>{anmName}</div>
  </div>;
}

function TipBody({anmName, script, sprite}: {anmName: string, script: AnmSpecScript, sprite: AnmSpecSprite}) {
  return <>
    <strong>{anmName}.anm</strong>
    <br/>entry{sprite.texture}
    <br/>sprite{sprite.indexInFile}
    <br/>script{script.indexInFile}
    <br/>{sprite.width}×{sprite.height}
    {script.layers.length > 1 ? (<>
      <br/><Wip>Layer uncertain! Might belong to: {script.layers.join(", ")}</Wip>
    </>) : null}
  </>;
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

const TRANSPARENT_PIXEL_IMAGE_SRC = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQYV2NgAAIAAAUAAarVyFEAAAAASUVORK5CYII=";
