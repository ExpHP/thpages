[title=debug_counters patch]

# `ExpHP/debug_counters`

**Available through thcrap.**

**Supports:** TH08, TH10-TH17 (incl. point titles).

Adds debug counters so you can see how much your dank memes are tormenting the game

![Debug counters example image](./content/mods/img/debug-counters.png)

Legend:

* `itemN`: Number of normal items onscreen.
* `itemC`: Number of cancel items onscreen (includes season items in TH16).  These have their own count because they live in a separate, *significantly larger* array.
* `laser`: Number of lasers onscreen.
* `etama`: Number of bullets onscreen.
* `anmid`: Number of automatically-managed ANM VMs.  This counts certain types of sprites that the game refers to by ID rather than storing them directly on a game object.
* `lgods`: (TH13) Number of divine spirits onscreen.
* `eff.1`: (early games) Counts effects, which are a predecessor to automatically-managed ANM VMs in early games.
* `eff.2`: (early games) A second array of effects, which is a fair bit smaller than the first.
* `eff.3`: (early games) A third, very short array of effects.  Each index in here seems to be reserved for a specific thing.

The numbers are colored orange when within 75% of maximum capacity, and red when they hit the max.  (`anmid` doesn't really have a maximum, but it is colored red when the count exceeds the length of the "fast VM" array, which is expected to impact performance).
