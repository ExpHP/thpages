[title=MSG instruction reference]
# MSG instruction reference

Select game version:
<select id='msg-table-game-select'></select>

<div class='msg-table-wrapper'></div>

[script]
onContentLoad(async function() {
    setupGameSelector(MSG_HANDLERS, document.getElementById('msg-table-game-select'));
    window.setTimeout(function() {
        const target = document.querySelector(".msg-table-wrapper");
        target.innerHTML = '';
        target.appendChild(buildInsTable(MSG_HANDLERS));
    }, 1)
});
[/script]
