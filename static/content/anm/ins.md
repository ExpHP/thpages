[title=ANM instruction reference]
# ANM instruction reference

Select game version:
<select id='anm-table-game-select'></select>

<div class='ecl-table-wrapper'></div>

[script]
onContentLoad(async function() {
    setupGameSelectorForAnm(document.getElementById('anm-table-game-select'));
    window.setTimeout(function() {
        const target = document.querySelector(".ecl-table-wrapper");
        target.innerHTML = '';
        target.appendChild(generateAnmInsTableHtml());
    }, 1)
});
[/script]
