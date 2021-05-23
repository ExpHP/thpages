[title=ANM stats]
# ANM usage stats

<!--
    The frozen table looks misaligned in some mobile browsers, and I don't have/know the right tools
    to debug why, so give people an opt-out.
-->
<input type='checkbox' id='checkbox-freeze-cells'>
<label for='checkbox-freeze-cells'>Freeze header cells (experimental)</label>

## Instructions

<div id="ins-stats-table"></div>

## Variables

<div id="var-stats-table"></div>

[script]
onContentLoad(async function() {
    makeFrozenStatsTableCheckbox(document.getElementById('checkbox-freeze-cells'));
    buildStatsTable('ins', ANM_INS_HANDLERS, document.getElementById('ins-stats-table'));
    buildStatsTable('var', ANM_VAR_HANDLERS, document.getElementById('var-stats-table'));
});
[/script]
