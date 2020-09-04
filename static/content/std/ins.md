[title=STD instruction reference]
# STD instruction reference

Select game version:
<select id='std-table-game-select'></select>

<div class='std-table-wrapper'></div>

[script]
onContentLoad(async function() {
    setupGameSelectorForStdIns(document.getElementById('std-table-game-select'));
    window.setTimeout(function() {
        const target = document.querySelector(".std-table-wrapper");
        target.innerHTML = '';
        target.appendChild(generateStdInsTableHtml());
    }, 1)
});
[/script]
