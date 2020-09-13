[title=ANM Layer Viewer]
# Layer Viewer

<!-- FIXME: should really be trying to make use of 'figure' elements and try to make the styling responsive -->
<img height="350" style="border: solid 2px white; float: right; margin: 10px;" src="content/anm/img/layer-viewer-example.png">

This page can show you can show you all of the sprites whose ANM scripts explicitly use each layer in a Touhou game.

1. Make sure thtk binaries (particularly `thdat` and `thanm`) are available on your PATH. **IMPORTANT: even the latest release of thtk is not recent enough;** you will need a development version of thanm from the [`thanm-new-spec-format`](https://github.com/thpatch/thtk/tree/thanm-new-spec-format) branch.  Windows builds of this branch are available in the `#thtk-builds` channel on the [ZUNcode Discord](https://discord.gg/fvPJvHJ). (commit `b7321bb` should do fine)
2. Use [dl=this python script](content/anm/make-layer-viewer-zip.py) to repackage the anm files from `thXX.dat` into a zip file:
   ```
   py -3 make-layer-viewer-zip.py --game 125 th125.dat -o th125-anms.zip
   ```
3. Click the button below and select the zip you created.
4. The page should begin to populate.

If you have problems/ideas/requests, go `@` me on the [ZUNcode discord](https://discord.gg/fvPJvHJ).

<input type='file' id='layer-viewer-file' accept='.zip'>

<hr style="clear:both;"/>

<h2 id='layer-viewer-status'></h2>

<div id='layer-viewer-error' class='error-box' style='display: none;'></div>

<div id='layer-viewer-output'></div>

[script]
onContentLoad(buildLayerViewer);
[/script]
