[title=Concepts in ANM]
[requireEclmap=17]

<h2 id="why-anm">What is ANM used for?</h2>

LITERALLY EVERYTHING

Bullets? ANM.  The player?  ANM.  Text?  Some rendering system that's built on top of ANM.  The stage background?  *Well okay, the camera is controlled by STD scripts,* but all of the objects in that 3D environment are ANM.  Fireball flames, pause menu animations, 1Ups spinning on creation are all ANM scripts.

Wanna know how the game handles upscaling to resolutions like 1280x960?  **ANM.**

How the game fades to black during gamemode changes?  **ANM.**

How Seija rotates the screen?  **Yes, that's ANM too!**

ANM is how 99% of the game code is able to avoid having to worry about the ugliness of Direct3D APIs.  But it also means that, when you want to make mods for Touhou, you'll inevitably run into ANM at some point.  *It's kind of a big deal,* and that's why this site exists.

<h2 id="jargon">Terminology</h2>

On this site you'll see lots of words used that sound like they have similar meanings, but there are important nuances between them.  Here's an overview:

<!-- FIXME: We should use HTML tags <dl> <dt> <dd> but the default style is balls and I don't want to deal with CSS right now -->

- **ANM file** &mdash; inside the game's `thXX.dat` file are a number of files with a `.anm` extension, which you can extract using `thdat -x` from thtk.
- **texture** &mdash; each ANM file contains many textures, which can be thought of as "source image files" or "spritesheets."  (`entry` blocks in thanm syntax).
- **sprite** &mdash; a sprite is a small region of a texture intended to be displayed as some frame of an animation. (`sprite` blocks in thanm syntax).
- **script** &mdash; a script is a sequence of instructions encoded in an ANM file that determines what sprites an animation should use, how it should move and etc. Much like ECL scripts for enemies, ANM scripts have an internal concept of "time" and pause when they encounter instructions that aren't supposed to run yet. Scripts are not tied down to a single sprite or even to a single texture; but they can only use sprites defined in the same ANM file. (`script` blocks in thanm syntax)
- **virtual machine (VM)** &mdash; a VM is a specific instance of a script running in the game.  It contains all of the data necessary to describe the current state of the animation, as well as the current state of the script (including an instruction pointer, time value, and values of all registers).
- **animation** &mdash; I use this to refer to *the output* of a VM (i.e. the graphical content it draws).  Or I try, at least. Out of habit I tend to use the terms "animation" and "VM" interchangeably.
- **surface** &mdash; Much like how a texture is a thing you draw *from,* a surface is a thing you draw *to.* TH14-17 have three different surfaces, as will be explained in Stages of rendering below.  The destination surface of an animation is determined by its layer (the [ref=anm:layer] instruction).

<h2 id="rng">RNGs</h2>

There are two random number generators available to ANM scripts.  The terms I will use for these are:

* The **animation RNG**, which most scripts use.
* The **replay RNG**, which gets saved to replays.

In modern games the replay RNG is accessed via a separate, dedicated set of variables (e.g. you can use [ref=anmvar:randf-01-replay] instead of [ref=anmvar:randf-01]).  In earlier games, there is a bitflag you can toggle. [wip](how do you toggle it?)[/wip]

<h2 id="uv-coords">Texture coordinates</h2>

Numerous instructions change the region of coordinates in the texture image file that a sprite's image is pulled from.  These include [ref=anm:uVel], [ref=anm:uvScale], and [ref=anm:textureCircle]. To fully understand how these instructions work, you must have a basic understanding of texure addressing.

These instructions operate on uv coordinates.  These are fractional coordinates into the sprite's original image file.  `(u, v) = (0, 0)` lies at the very top left corner of the top left pixel.  `(u, v) = (1, 1)` lies at the very bottom right corner of the bottom right pixel.  In the image below, the little F item occupies the rectangle from `(3/4, 2/3)` to `(1, 1)` in uv-space.

[c=red]TODO: IMAGE: zoomed in image (big pixels) annotating uv 0,0 and 1,1[/c]

Now let's say we start with this little F as our sprite, and then use [ref=anm:uVel] with a negative argument.  This will subtract something from u every frame, causing other images in the texture to be displayed.

[code]
[ref=anm:sprite](littleF);
[ref=anm:uVel](-0.08333333333);  // 1/120
[/code]

[c=red]TODO: IMAGE: scrolling in game[/c]

Observe how, at the left end of the image, it *wraps back* to the F.  This is because **the default behavior of scrolling is to assume that the image repeats infinitely.**  This has many uses, such as making color gradients move along Marisa's laser.  You can also pull from a large region in uv space using [ref=anm:uvScale]; similar behavior is provided by [ref=anm:textureCircle] which can pull from a large vertical region in uv space that includes many copies of the image (for e.g. those "Spell attack" text circles).

Notice how I said "default behavior."  Using [ref=anm:scrollMode], you can configure this.

[c=red]TODO: SCROLL MODES[/c]

## Layers and `on_draw`

COMING SOON (TM)

[/requireEclmap]
