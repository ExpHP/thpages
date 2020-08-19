# Settings



### anmmap

Here you can upload anmmaps to change the names displayed across the site.

On pages like the instruction table, names from the currently selected game are used.  On game-agnostic pages, names from the latest version will be used.

<div class="map-files" id="upload-anmmaps">
  <div class="rows">
    <div class="row v7">
      <div class='col label'>v7</div>
      <div class='col raw'><input type='radio' id='anmmap-v7-raw' name='anmmap-v7'><label for='anmmap-v7-raw'></label></div>
      <div class='col auto'><input type='radio' id='anmmap-v7-auto' name='anmmap-v7'><label for='anmmap-v7-auto'></label></div>
      <div class='col file'><input type='radio' id='anmmap-v7-file' name='anmmap-v7'><label for='anmmap-v7-file'><input type='file'></label></div>
      <div class='col status'></div>
    </div>
    <div class="row v8">
      <div class='col label'>v8</div>
      <div class='col raw'><input type='radio' id='anmmap-v8-raw' name='anmmap-v8'><label for='anmmap-v8-raw'></label></div>
      <div class='col auto'><input type='radio' id='anmmap-v8-auto' name='anmmap-v8'><label for='anmmap-v8-auto'></label></div>
      <div class='col file'><input type='radio' id='anmmap-v8-file' name='anmmap-v8'><label for='anmmap-v8-file'><input type='file'></label></div>
      <div class='col status'></div>
    </div>
  </div>
  <button class='confirm' disabled='true'></button><div class="save-status"></div>
</div>

[script]
onContentLoad(async function() {
  setupSettingsPage();
});
[/script]
