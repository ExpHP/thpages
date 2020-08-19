## ANM instruction reference

Currently **all documentation here is for ANM version 8.**  That is [game=13] to [game=17].

Support for other game versions and custom anmmaps is currently being worked on.

<!--
Select game version:
<select class='anm-table-game-select'>
    <option value="08">08 (Imperishable Night)</option>
    <option value="13">13 (Ten Desires)</option>
    <option value="14">14 (Double Dealing Character)</option>
    <option value="14.3">14.3 (Impossible Spell Card)</option>
    <option value="15">15 (Legacy of Lunatic Kingdom)</option>
    <option value="16">16 (Hidden Star in Four Seasons)</option>
    <option value="16.5">16.5 (Violent Disease)</option>
    <option selected value="17">17 (Wily Beast and Weakest Creature)</option>
</select>

Eclmap for instruction names:<br><br>
<input type="radio" id="radio-eclmap-default" name="eclmap-radio" value="1" checked>
<label for="radio-eclmap-default">Use default</label>

<input type="radio" id="radio-eclmap-custom" name="eclmap-radio" value="0">
<label for="radio-eclmap-custom"><input type="file" id="eclmap-file"></label>

<button class="ecl-table-btt">Get table</button>
-->
<div class='ecl-table-wrapper'></div>

[script]
onContentLoad(async function() {
    window.setTimeout(function() {
        const target = document.querySelector(".ecl-table-wrapper");
        target.innerHTML = '';
        target.appendChild(generateOpcodeTable('17'));
    }, 1)
});
[/script]
