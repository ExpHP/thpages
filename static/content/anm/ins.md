[title=ANM instruction reference]
# ANM instruction reference

Select game version:
<select id='anm-table-game-select'></select>

<div class='ecl-table-wrapper'></div>

[script]
onContentLoad(async function() {
    setupGameSelector(ANM_INS_HANDLERS, document.getElementById('anm-table-game-select'));
    window.setTimeout(function() {
        const target = document.querySelector(".ecl-table-wrapper");
        target.innerHTML = '';
        target.appendChild(buildInsTable(ANM_INS_HANDLERS));
    }, 1)
});
[/script]
