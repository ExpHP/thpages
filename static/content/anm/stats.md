[title=ANM stats]
# ANM usage stats

<!--
    The frozen table looks misaligned in some mobile browsers, and I don't have/know the right tools
    to debug why, so give people an opt-out.
-->
<input type='checkbox' id='checkbox-freeze-cells'>
<label for='checkbox-freeze-cells'>Freeze header cells (experimental)</label>

## ANM Instructions

<div id="ins-stats-table"></div>

## ANM Variables

<div id="var-stats-table"></div>

## STD Instructions

<div id="std-stats-table"></div>

## MSG Instructions

<div id="msg-stats-table"></div>

[script]
onContentLoad(async function() {
    makeFrozenStatsTableCheckbox(document.getElementById('checkbox-freeze-cells'));
    buildStatsTable(['anm', 'ins'], ANM_INS_HANDLERS, document.getElementById('ins-stats-table'));
    buildStatsTable(['anm', 'var'], ANM_VAR_HANDLERS, document.getElementById('var-stats-table'));
    buildStatsTable(['std', 'ins'], STD_HANDLERS, document.getElementById('std-stats-table'));
    buildStatsTable(['msg', 'ins'], MSG_HANDLERS, document.getElementById('msg-stats-table'));
});
[/script]
