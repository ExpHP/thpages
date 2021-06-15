import React from 'react';
import {Async} from 'react-async';
import clsx from 'clsx';

import {Wip, Title} from '~/js/XUtil';
import {TrustedMarkdown} from '~/js/Markdown';
import {arrayFromFunc} from '~/js/util';
import {Tip} from '~/js/Tip';
import {Err} from '~/js/Error';
import {useProgress, Progress, ProgressDispatch} from './Progress';

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
  // Multiple updates batched into one, because React 17 performs synchronous renders when state is updated from outside of a React event.
  //
  // Hopefully React 18's automatic batching will eliminate the need for this.
  | {type: 'batched', payload: {actions: Action[]}}
  ;

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'add-script': {
      const {layer, gridItem} = action.payload;
      const newState = [...state];
      newState[layer] = [...newState[layer], gridItem]; // FIXME quadratic
      return newState;
    }
    case 'batched': {
      return action.payload.actions.reduce(reducer, state);
    }
  }
}


function LayerViewerFromFile({file}: {file: File}) {
  const [progressState, progress] = useProgress();

  const promiseFn = React.useCallback(async ({}, abort) => {
    const cancel = new Cancel(abort);
    return await cancel.scopeAsync(async () => {
      const specs = await loadAnmZip(cancel, file);

      for (const spec of specs.specs) {
        progress({type: 'spec/begin', payload: {specBasename: spec.basename, numScripts: spec.scripts.length}});
      }
      return specs;
    });
  }, [file, progress]);

  return <Async promiseFn={promiseFn}>
    <Async.Pending><h2>Reading Zip...</h2></Async.Pending>
    <Async.Rejected>{(e) => <Err>{e.message}</Err>}</Async.Rejected>
    <Async.Fulfilled>{(specs) => specs && (<>
      <Progress state={progressState} />
      <LayerViewerFromSpecs specs={specs} progress={progress} />
    </>)}</Async.Fulfilled>
  </Async>;
}


function LayerViewerFromSpecs({specs, progress}: {specs: AnmSpecs, progress: ProgressDispatch}) {
  const [state, dispatch] = React.useReducer(reducer, null, () => arrayFromFunc(specs.maxLayer + 1, () => []));

  React.useEffect(() => {
    const cancel = new Cancel();
    for (const spec of specs.specs.values()) {
      // start each file
      cancel.scopeAsync(async () => addAnmFileToLayerViewer(dispatch, progress, cancel, spec));
    }
    return () => cancel.cancel();
  }, [specs, progress]);

  return <>
    <LayerViewers layers={state} />
  </>;
}


/** Helper used to cancel operations by using an exception to bubble out of a computationally intensive or async task. */
export class Cancel {
  private _abortController: AbortController;
  /** The error type thrown by `check`.  Each instance of `Cancel` has a unique `Error` type. */
  public Error: new () => Error;

  constructor(abortController?: AbortController) {
    this._abortController = abortController || new AbortController();

    class CancelError extends Error {}
    this.Error = CancelError;
  }
  get cancelled() {
    return this._abortController.signal.aborted;
  }
  /** Get an object that implements the AbortController interface.  Multiple calls are guaranteed to return the same object. */
  public asAbortController() {
    return this._abortController;
  }
  public cancel() {
    this._abortController.abort();
  }
  /** Check for cancellation.  If cancellation has occurred, a CancelError is thrown to bubble out of the nearest `scope`. */
  public check() {
    if (this.cancelled) throw new this.Error();
  }
  /** Run an async callback, converting CancelError rejections into "successful" null values. */
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
      {items}
    </Packery>
  </div>;
});

// =============================================================================

/** Asynchronous task that adds all images from an ANM file to the layer viewer. */
async function addAnmFileToLayerViewer(
    dispatch: React.Dispatch<Action>,
    progress: ProgressDispatch,
    cancel: Cancel,
    specData: AnmSpec,
) {
  for (const script of specData.scripts) {
    const dispatchActions = [];
    for (const spriteId of script.sprites) {
      if (spriteId == null) continue;

      const sprite = specData.sprites[spriteId];
      const texture = specData.textures[sprite.texture];
      const $textureImg = await specData.textureImages[sprite.texture];
      await new Promise((resolve) => setTimeout(resolve, 0));
      cancel.check();

      const gridItemBody = await makeGridItemBody($textureImg, specData, sprite, texture);
      cancel.check();

      const gridItemTip = <TipBody anmName={specData.basename} script={script} sprite={sprite}/>;
      const gridItem = <PackeryItem
        key={`${specData.basename}-${script.indexInFile}-${spriteId}`}
        className={clsx({'warn-multiple-layer': script.layers.length > 1})}
      >
        <Tip element="div" tip={gridItemTip}>{gridItemBody}</Tip>
      </PackeryItem>;

      for (const layer of script.layers) {
        if (layer == null) continue;
        dispatchActions.push({type: 'add-script', payload: {layer, gridItem}} as const);
      }
    }
    if (dispatchActions.length) {
      dispatch({type: 'batched', payload: {actions: dispatchActions}});
    }
    progress({type: 'script/finished', payload: {specBasename: specData.basename}});
  }
}

async function makeGridItemBody($textureImg: HTMLImageElement | null, spec: AnmSpec, sprite: AnmSpecSprite, texture: AnmSpecTexture) {
  if ($textureImg) {
    const [nicerWidth, nicerHeight] = nicerImageSize([sprite.width, sprite.height]);
    if (sprite.width === 0 || sprite.height === 0) {
      // bail out with an empty div as toBlob would produce null
      return <div style={{width: 16, height: 16}}></div>;
    }

    const blob = await getCroppedSpriteBlob(texture, sprite, $textureImg);
    return <BlobImg width={nicerWidth} height={nicerHeight} {...{sprite, blob}}/>;
  } else {
    return <DynamicSpriteGridItem {...{anmName: spec.basename, texture, sprite}}/>;
  }
}

async function getCroppedSpriteBlob(texture: AnmSpecTexture, sprite: AnmSpecSprite, $textureImg: HTMLImageElement): Promise<Blob> {
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

  return await canvasToBlobAsync($clippingCanvas);
}

const BlobImg = React.memo(function BlobImg({blob, ...props}: {blob: Blob} & React.ImgHTMLAttributes<HTMLImageElement>) {
  const [imageSrc, setImageSrc] = React.useState<string>(TRANSPARENT_PIXEL_IMAGE_SRC);
  const ref = React.useRef<HTMLImageElement | null>(null);

  React.useEffect(() => {
    const url = URL.createObjectURL(blob);
    setImageSrc(url);
    ref.current!.addEventListener('load', () => URL.revokeObjectURL(url));

    return () => URL.revokeObjectURL(url);
  }, [blob]);

  return <img ref={ref} src={imageSrc} {...props}/>;
});

function DynamicSpriteGridItem(allprops: {anmName: string, texture: AnmSpecTexture, sprite: AnmSpecSprite} & React.HTMLAttributes<HTMLDivElement>) {
  const {anmName, texture, sprite, ...props} = allprops;
  return <div className={'imageless'} {...props}>
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
