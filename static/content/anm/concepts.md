[title=Concepts in ANM]

<h1 id="why-anm">What is ANM used for?</h1>

LITERALLY EVERYTHING

Bullets? ANM.  The player?  ANM.  Text?  Some rendering system that's built on top of ANM.  The stage background?  *Well okay, the camera is controlled by STD scripts,* but all of the objects in that 3D environment are ANM.  Fireball flames, pause menu animations, 1Ups spinning on creation are all ANM scripts.

Wanna know how the game handles upscaling to resolutions like 1280x960?  **ANM.**

How the game fades to black during gamemode changes?  **ANM.**

How Seija rotates the screen?  **Yes, that's ANM too!**

ANM is how 99% of the game code is able to avoid having to worry about the ugliness of Direct3D APIs.  But it also means that, when you want to make mods for Touhou, you'll inevitably run into ANM at some point.  *It's kind of a big deal,* and that's why this site exists.

<h1 id="jargon">Terminology</h1>

On this site you'll see lots of words used that sound like they have similar meanings, but there are important nuances between them.  Here's an overview:

<!-- FIXME: We should use HTML tags <dl> <dt> <dd> but the default style is balls and I don't want to deal with CSS right now -->

- **ANM file** &mdash; inside the game's `thXX.dat` file are a number of files with a `.anm` extension, which you can extract using `thdat -x` from thtk.
- **texture** &mdash; each ANM file contains many textures, which can be thought of as "source image files" or "spritesheets."  (`entry` blocks in thanm syntax).
- **sprite** &mdash; a sprite is a small region of a texture intended to be displayed as some frame of an animation. (`sprite` blocks in thanm syntax).
- **script** &mdash; a script is a sequence of instructions encoded in an ANM file that determines what sprites an animation should use, how it should move and etc. Much like ECL scripts for enemies, ANM scripts have an internal concept of "time" and pause when they encounter instructions that aren't supposed to run yet. Scripts are not tied down to a single sprite or even to a single texture; but they can only use sprites defined in the same ANM file. (`script` blocks in thanm syntax)
- **virtual machine (VM)** &mdash; a VM is a specific instance of a script running in the game.  It contains all of the data necessary to describe the current state of the animation, as well as the current state of the script (including an instruction pointer, time value, and values of all registers).
- **animation** &mdash; I use this to refer to *the output* of a VM (i.e. the graphical content it draws).  Or I try, at least. Out of habit I tend to use the terms "animation" and "VM" interchangeably.
- **surface** &mdash; Much like how a texture is a thing you draw *from,* a surface is a thing you draw *to.* TH14-17 have three different surfaces, as will be explained in [stages of rendering](#anm/stages-of-rendering).  The destination surface of an animation is determined by its layer (the [ref=anm:layer] instruction).

<h1 id="time-labels">Time labels</h1>

COMING SOON (TM)

<h1 id="position">Position vectors</h1>

The position of a graphic is ironically one of the least understood aspects of how ANM works.

Each VM has an **origin.**  For child scripts, the origin is the location of the parent, so that they move with the parent.  For scripts with no parent, the origin is determined by [ref=anm:originMode], which should be chosen appropriately for its [stage of rendering](#anm/stages-of-rendering).  *That's the easy part.*

So how about the position relative to that origin?  Well, as you might imagine, each VM holds a position vector which can be modified using [ref=anm:pos]... but there are also two other vectors!!  The true position of the graphic relative to its origin *is the sum of all three of these vectors.*  These other two vectors are used in all sorts of different, weird places for weird things, and nobody has been able to make any real sense of them yet, so for now I'll just call them `pos_2` and `pos_3` until their purpose is better understood.

<h1 id="rng">RNGs</h1>

There are two random number generators available to ANM scripts.  The terms I will use for these are:

* The **animation RNG**, which most scripts use.
* The **replay RNG**, which gets saved to replays.

In modern games the replay RNG is accessed via a separate, dedicated set of variables (e.g. you can use [ref=anmvar:randf-01-replay] instead of [ref=anmvar:randf-01]).  In earlier games, there is instead a bitflag you can toggle using [ref=anm:v7-randMode] that decides which RNG is used.  This bitflag and instruction still exist in modern games, but they appear to no longer have any legitimate effect...

<h1 id="switch">Switching</h1>

Oftentimes, animations have special, well, *animations* associated with certain events.  For instance, menu items may glow when selected, fly away when a different item is chosen, etc.  Or maybe the game just wants to get rid of a graphic for whatever reason, but wants to let it animate out gracefully.  The way these events are handled is called **switching** and is basically done as follows:

* A field on the ANM VM is set to some number representing the event.
* The next time the VM is [ticked](#anm/ontick-ondraw),
  it will check this field, look for a matching [ref=anm:case] instruction, and start executing from there.

For a detailed example, here's one of the scripts for the season gauge.  (this one draws the outer border)

[code]
script script114 {
    // ... ignoring the boring stuff at the beginning ...
    [ref=anm:drawRectBorder](102.0f, 10.0f);
    [ref=anm:rgb](80, 80, 80);
    [ref=anm:alpha](0);
+20: // 20
    [ref=anm:alphaTime](20, 0, 255);
    [ref=anm:stop]();
    [ref=anm:case](4);  // <-------
    [ref=anm:alphaTime](5, 0, 255);
    [ref=anm:caseReturn]();
    [ref=anm:case](5);  // <-------
    [ref=anm:alphaTime](5, 0, 64);
    [ref=anm:caseReturn]();
    [ref=anm:case](1);  // <-------
    [ref=anm:alphaTime](20, 0, 0);
+20: // 40
    [ref=anm:delete]();
}
[/code]

This script has four animations.  The first is that it fades in on creation.  The other three are labeled by [ref=anm:case] instructions:

* Label 5 here is used to make it become transparent when the player gets too close.
* Label 4 is used to make it become opaque when the player leaves.
* Label 1 will make it fade away permanently.  I'm not sure if this is ever used for the season gauge in the finished game, but is extremely common for Label 1 to make something disappear permanently. (i.e. label 1 pretty much always ends in [ref=anm:delete])

Notice that labels 4 and 5 end in [ref=anm:caseReturn], causing the script to go back to the [ref=anm:stop] and wait for another switch.

Mind, you can't just put label 5 on any script and expect it to run when the player gets close.
This one runs because there's a line somewhere in the GUI code that specifically watches for the player to
enter the lower left corner and then invokes this label on the season gauge.  Most switching is hardcoded like this.

ECL scripts can invoke [ref=anm:case] labels on their own sprites by using the `anmSwitch` ECL instruction.
The games seldom use this but it is pretty hecking useful for modders!

**Miscellaneous notes:**
* The game always searches for [ref=anm:case] labels starting from the *beginning* of the function. (not from the [ref=anm:stop])
* If multiple switches occur on one frame, only the **last** takes effect.
* [ref=anm:case](0) doesn't work due to how pending switch numbers are stored.
* [wip=2][ref=anm:case](-1) appears to work differently from the others?
  According to 32th System it is ignored...[/wip]
* [wip]Can switching interrupt code that is not at a [ref=anm:stop]? Testing needed.[/wip]

<h1 id="uv-coords">Texture coordinates</h1>

Numerous instructions change the region of coordinates in the texture image file that a sprite's image is pulled from.  These include [ref=anm:uVel], [ref=anm:uvScale], and [ref=anm:textureCircle]. To fully understand how these instructions work, you must have a basic understanding of texure addressing.

These instructions operate on uv coordinates.  These are fractional coordinates into the sprite's original image file.  `(u, v) = (0, 0)` lies at the very top left corner of the top left pixel.  `(u, v) = (1, 1)` lies at the very bottom right corner of the bottom right pixel.  In the image below, the little F item occupies the rectangle from `(3/4, 2/3)` to `(1, 1)` in uv-space.

<img src="./content/anm/img/concept-uv-corners.png">

Now let's say we start with this little F as our sprite, and then use [ref=anm:uVel] with a negative argument.  This will subtract something from u every frame, causing other images in the texture to be displayed.

[code]
[ref=anm:sprite](littleF);
[ref=anm:uVel](-0.008333333333);  // 1/120
[/code]

<img src="./content/anm/img/concept-uv-scroll-x.gif">

Observe how, at the left end of the image, it *wraps back* to the F.  This is because **the default behavior of scrolling is to assume that the texture repeats infinitely.**  This has many uses, such as making color gradients move along Marisa's laser.  You can also pull from a large region in uv space using [ref=anm:uvScale]; similar behavior is provided by [ref=anm:textureCircle] which can pull from a large vertical region in uv space that includes many copies of the image. This is used for e.g. those circles of the "Spell attack" text.

Notice how I said "default behavior."  Using [ref=anm:scrollMode], you can configure this.  In particular, you can choose to have every other periodic copy be mirrored.
