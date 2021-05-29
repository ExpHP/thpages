# za warudo mods

::title[za warudo mods]

**Available through thcrap:**

* **Main mod:** `ExpHP/nopause_enm`  (supports :tip[TH10]{tip="but you can&#39;t see anything"}, TH11-TH17 and DS)
* **Recommended addition:** `ExpHP/nopauseblur`  (supports TH15-TH17 and VD)

[Gameplay video](https://youtu.be/pekM4K793Tg)

Makes enemies continue to run even while the game is paused, producing giant waves of bullets when you unpause.

* Future support for VD, GFW, and ISC in `nopause_enm` is possible, I just haven't reversed them yet.  It also supports TH10 but it's impossible to see.
* Unfortunately, the pause blur works differently in TH11-TH14, and even more differently in TH10. I haven't figured out how to support those games in `nopauseblur` yet.

## How?

Because we stands.

:::more
...ok so, Touhou has a set of update functions that run each frame.  There's one for updating enemies, one for updating the player, one for navigating the Pause menu, etc.  Each one of these functions also has a number associated with it, called its **priority.**  The ones with lower priorities always run first.

One of these functions has the special responsibility of *preventing the rest of the functions after it from running* while the game is paused.  All this patch does is adjust the priorities of some update funcs to run before that special function.

(on that note, TH08 cannot be supported because the same update func that prevents things from running on pause (priority 0x02) is also the one that crucially prevents them from running while the stage is still being loaded!)
:::
