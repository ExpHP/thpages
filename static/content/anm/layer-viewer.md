[title=UNDER CONSTRUCTION]
# layer viewer

<!-- <style>
    * { box-sizing: border-box; }

body { font-family: sans-serif; }

/* ---- grid ---- */

.outer {
  background: #DDD;
    width: 100%;
  resize: vertical;
  height: 400px;
  overflow-x: hidden;
  overflow-y: scroll;
}
/* ---- .grid-item ---- */

.grid-item {
  background: #C09;
  border: 2px solid hsla(0, 0%, 0%, 0.5);
}
button { font-size: 20px; }

</style> -->

<input type='file' id='layer-viewer-file' accept='.zip'>

<div id='layer-viewer-output'></div>

<!-- <h1>Packery - appended, vanilla JS</h1>
<p><button class="append-button">Append items</button></p>
<div class='outer'><div class="grid"></div> -->
<!--
  <div class="grid-item grid-item--width2"></div>
  <div class="grid-item grid-item--height2"></div>
  <div class="grid-item"></div>
  <div class="grid-item"></div>
  <div class="grid-item grid-item--height2"></div>
-->
</div>




[script]
onContentLoad(buildLayerViewer);
[/script]
