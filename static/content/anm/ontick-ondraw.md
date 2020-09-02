[title=on_tick and on_draw]
# `on_tick` and `on_draw`

There's quite a decent amount to be said on the subject of how the touhou games update each frame, but the real short of the matter is:

* There's a global list of `on_tick` functions that run in a particular order each frame.
* There's also a global list of `on_draw` functions that run shortly after the `on_tick` functions.

As you can probably imagine, `on_tick` is where all game logic occurs. It is also when all ANM VMs are "ticked;" i.e. this is when they are given a chance to step through their script.  `on_draw` functions on the other hand handle the rendering of everything to the screen.

[wip]I plan to write a page here which dives more deeply into the subject and how it concerns ANM, but in the meanwhile you can look at these:[/wip]

* [`anm_update_funcs.md` in this gist](https://gist.github.com/ExpHP/88bdef8f28f46fe4af6ab2e013b75896#file-2_anm_update_funcs-md)  describes how things work in most modern Touhous
* [This gist](https://gist.github.com/ExpHP/f275e0edc02603580f24a5ba3da952cc) describes changes in TH17 v1.00b
