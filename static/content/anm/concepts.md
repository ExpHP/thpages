[title=Concepts in ANM]
# <span id="why-anm">What's this all about?</span>

In the Windows titles in the Touhou series, all graphical content of the game comes in the form of `.anm` files, which are stored along with everything else inside the `thXX.dat` file for each game.  These ANM files contain spritesheets and tables of sprites within them, as well as numerous bytecode scripts that are responsible for selecting sprites, animating them and applying visual effects.

These scripts are essentially series of instructions; each with an opcode and a variable number of arguments, which are interpreted in real-time by the game on every frame to update the sprites onscreen.  There are many instructions, up to around 120 in some games, and they differ from game to game.  While we understood, say, maybe about 60% of these instructions, many of them have had a completely unknown purpose for years.  Understanding these instructions are in large part the purpose of this website.

**This site will not discuss the actual binary format of `.anm` files.** As far as I am concerned, this problem has been pretty thoroughly solved by `thtk`.

**This site will also assume you have a basic level of familiarity with `thtk` tools.**  Basically, this site assumes you can figure out how to extract anm scripts from game data and recompile them using `thanm`.  If not, you may find some parts of [Priw8's ECL tutorial](https://priw8.github.io/#b=ecl-tutorial/&p=1) useful, because it's very similar.

# <span id="anm-purpose">What is ANM used for?</span>

People often ask, how much of the visual stuff in the game is hardcoded versus how much is controlled by ANM?  Well, *basically all of it* is controlled by ANM.  As in, the game largely never even touches the Direct3D APIs outside of the ANM code, because they are meant to serve as an abstraction around it.

So obviously, there are anm scripts for each sprite in the game... but ANM is also used for a lot more than just that:

* ANM is used to manipulate characters and construct strings from bitmap fonts.
* ANM is used to handle upscaling to resolutions like 1280x960.
* ANM is used to fade to black during gamemode changes.
* ANM is used by Seija to rotate the screen.  (on that note, there is a lot of *incredibly wild stuff* you can do to the game just by editing this one anm script!)
* ...and a lot more!

# <span id="jargon">Terminology</span>

On this site you'll see lots of words used that sound like they have similar meanings, but there are important nuances between them.  Here's an overview:

<!-- FIXME: We should use HTML tags <dl> <dt> <dd> but the default style is balls and I don't want to deal with CSS right now -->

- **ANM file** &mdash; inside the game's `thXX.dat` file are a number of files with a `.anm` extension, which you can extract using `thdat -x` from thtk.
- **texture** &mdash; each ANM file contains many textures, which can be thought of as "source image files" or "spritesheets."  (`entry` blocks in thanm syntax).
- **sprite** &mdash; a sprite is a small region of a texture intended to be displayed as some frame of an animation. (`sprite` blocks in thanm syntax).
- **script** &mdash; a script is a sequence of instructions encoded in an ANM file that determines what sprites a graphic should use, how it should move and etc. Much like ECL scripts for enemies, ANM scripts have an internal concept of "time" and pause when they encounter instructions that aren't supposed to run yet. Scripts are not tied down to a single sprite or even to a single texture; but they can only use sprites defined in the same ANM file. (`script` blocks in thanm syntax)
- **virtual machine (VM)** &mdash; a VM is a specific instance of a script running in the game.  It contains all of the data necessary to describe the current state of the animation, as well as the current state of the script (including an instruction pointer, time value, and values of all registers).
- **graphic** &mdash; I use this to refer to *the output* of a single VM (i.e. the graphical content it draws).  Or I try, at least. Out of habit I tend to use the terms "graphic" and "VM" interchangeably.
- **surface** &mdash; Much like how a texture is a thing you draw *from,* a surface is a thing you draw *to.* TH14-17 have three different surfaces, as will be explained in [stages of rendering](#anm/stages-of-rendering).  The destination surface of a graphic is determined by its layer (the [ref=anm:layer] instruction).

# <span id="versions">Versions</span>

Anm files include version numbers that indicate when breaking changes are made to the format or instruction set.  For the most part `thanm` takes care of this, but you need to be aware of it when using anmmaps.

| Version | Used by | Other notes |
| :---: | ---     | --- |
| v0 | [game=06] | |
| v2 | [game=07] | |
| v3 | [game=08], [game=09] | anmmap-compatible with v2 (only signatures changed) |
| v4 | [game=095], [game=10] | |
| v7 | [game=11], [game=12], [game=125], [game=128] | anmmap-compatible with v4 (only container format changed) |
| v8 | [game=13] onwards | |

# <span id="time">Time labels</span>

Much like ECL and STD, every instruction in an ANM script is labeled with a `time` integer indicating the frame number at which it should run.  As a VM runs, it keeps track of both its current instruction in the script and an internal time counter which increments on each frame.  Every frame when the VM is [ticked](#/anm/ontick-ondraw), it compares the time label of the current instruction to its internal time, and will execute instructions until it encounters one whose time label is too large.

Most of the time, large swathes of code in an ANM script will have equal time labels, so `thtk` doesn't label every line.  It labels the lines where the time changes; and it does so by writing an integer followed by a colon (like code labels, but integers instead of identifiers):

[code]
script script1 {
    foo(0);   // has time label 0
    bar(4);   // has time label 0
30:
    baz(3, 50f);   // has time label 30
50:
    quux(3, 50f);   // has time label 50
}
[/code]

It also supports relative time labels, which begin with `+`, indicating that the label increases by this amount.

[code]
script script1 {
    foo(0);   // has time label 0
    bar(4);   // has time label 0
+30:
    baz(3, 50f);   // has time label 30
+20:
    quux(3, 50f);   // has time label 50
10:
    fazbear(20);  // has time label 10
}
[/code]

Notice with the last label that time labels are also allowed to decrease.  When this happens it must be written as an absolute label, not as `-40:`, which would instead be interpreted as an absolute time label for the time `-40`.  *Speaking of negative time labels...*

## The "minus 1st" frame

Beginning in [game=13], whenever it loads an ANM file, for every script, it will create a VM and run that VM once with time set to `-1`.  Then it saves the resulting VM as a *template* for that script, and copies it each time an instance of that script is created. Basically what this means is that scripts can now have a "minus 1st" frame that only runs once when the file is loaded:

[code]
script script1 {
-1:
    [ref=anm:rand]([ref=anmvar:i0], 0, 5);
0:
    [ref=anm:rand]([ref=anmvar:i1], 0, 5);
    ...
}
[/code]

In the above example, every script created using `script1` will have the same value for [ref=anmvar:i0], but different values for [ref=anmvar:i1].  This is of course a contrived example to help exaggerate the effect; typically this initial frame is used to set the script's layer and a few other important properties.

# <span id="position">Position vectors</span>

<!-- Moved to [its own page](#/anm/position) -->

The position of a graphic is ironically one of the least understood aspects of how ANM works.

Each VM has an **origin.**  For child scripts, the origin is the location of the parent, so that they move with the parent.  For scripts with no parent, the origin is determined by [ref=anm:originMode], which should be chosen appropriately for its [stage of rendering](#anm/stages-of-rendering).  *That's the easy part.*

So how about the position relative to that origin?  Well, as you might imagine, each VM holds a position vector which can be modified using [ref=anm:pos]... but there are also two other vectors!!  The true position of the graphic relative to its origin *is the sum of all three of these vectors.*  These other two vectors are used in all sorts of different, weird places for weird things, and nobody has been able to make any real sense of them yet, so for now I'll just call them `pos_2` and `pos_3` until their purpose is better understood.

# <span id="rng">RNGs</span>

In modern Touhou games there are two random number generators available to ANM scripts.  The terms I will use for these are:

* The **animation RNG**, which is only used by ANM.
* The **replay RNG**, which gets saved to replays.

Different ANM versions access these RNGs in different ways:

* **[game-th=09] and earlier:** Everything uses the replay RNG. (animation RNG doesn't exist)
* **[game-th=095]&ndash;[game-th=128]:**
    - [wip]Not sure, but the general design seems to be: Root VMs for game entities use the replay RNG, children use the animation RNG.[/wip]
    - A VM can change its current RNG using [ref=anm:v4-randMode].
    - [ref=anm:spriteRand] always uses the replay RNG.
* **[game-th=13] and later:**
    - Almost everything uses the animation RNG. (incl. [ref=anm:rand] and [ref=anm:spriteRand])
    - There are dedicated vars for the replay RNG. (e.g. [ref=anmvar:randf-01-replay])
    - [ref=anm:v8-randMode] still exists but has no effect.

# <span id="children">Parent-child relationships</span>

In [game=10] onwards, ANM VMs can create children using [ref=anm:createChild].  Parents affect children in some of the following ways:

* A child's position is always relative to the parent (it moves with the parent).
* A child's scale is relative to its parent. (i.e. scaling a parent scales its children).
* Scaling a parent may scale its children's offsets relative to it.
* Rotating a parent may rotate its children.
* Deleting a parent deletes its children.

**Parent-child relationships can differ significantly from game to game.** Not all of the above properties apply in all games (IIRC nearly every game from [game=10] to [game=16] adds at least one thing to that list.)

### On nested parent hierarchies

Some broad advice: **Don't let child VMs create children.**  The way that children is implemented is pretty janky in most games and, again, changes quite freuquently from game to game.  Though I haven't tested it much, there are many, many things that just look plain "off" to me in the code.  Early games are clearly not meant to have grandchildren, and the latest games have grandchild support that looks buggy and seems unused.

Some examples: The implementation of [ref=anm:createChildPos] is clearly not meant to be used on children.
Many places in early games only look at the first parent.
Even in [game-th=17], [ref=anmvar:rot-z-effective] only cares about the first parent.
While the latest games store two linked-list nodes as required for proper grandchild support, early games only have one.
VMs in [game-th=16] frequently call recursive functions that *appear* like they are designed to e.g. recursively account for the parent's scale, then the grandparent's scale, and etc...
but the "parent" pointer that these functions use actually appears to store the *root* VM of any ancestral tree, not the direct parent, so the recursive part is never used.
*And even then* I don't think it matters, because I took a snapshot of memory in [game-th=16] and found no ancestral trees with grandchildren.

So yeah.  I wouldn't touch grandchild VMs with a 20 foot pole in *any* Touhou game.  You do so at your own risk.

---

# <span id="switch"><span id="interrupt">Interrupts</span></span>

Oftentimes, graphics have special animations associated with certain events.  For instance, menu items may glow when selected, fly away when a different item is chosen, etc.  Or maybe the game just wants to get rid of a graphic for whatever reason, but wants to let it animate out gracefully.  The way these events are handled is by invoking **interrupts** on the ANM, as follows:

* A field on the ANM VM is set to some number representing the type of event.
* The next time the VM is [ticked](#anm/ontick-ondraw),
  it will check this field, and search the script for a matching [ref=anm:case] instruction if it is nonzero.
* When it finds one:
    + It will jump to the matching label and set the current time to its [time label](#anm/concepts&a=time).
    + Right before doing so, it will save the current time and instruction pointer
      so that they can be potentially restored with [ref=anm:caseReturn].
    + It will enable the "visible" bitflag if not already (see [ref=anm:visible]).

### An example

For a detailed example, here's one of the scripts for the season gauge.  (this one draws the "Releasable" icon)

[code]
script script114 {
    // ... ignoring the boring stuff at the beginning ...
    [ref=anm:pos](-344.0f, 884.0f, 0.0f);

    [ref=anm:case](3);
    [ref=anm:alpha](0);
    [ref=anm:stop]();

    [ref=anm:case](2);
    [ref=anm:alphaTime](4, 0, 255);
offset144:
    [ref=anm:rgb](255, 255, 255);
+20: // 20
    [ref=anm:rgb](255, 224, 224);
+20: // 40
    [ref=anm:jmp](offset144, 0);
    [ref=anm:stop]();

    [ref=anm:case](4);
    [ref=anm:alphaTime](5, 0, 255);
    [ref=anm:caseReturn]();

    [ref=anm:case](5);
    [ref=anm:alphaTime](5, 0, 64);
    [ref=anm:caseReturn]();
}
[/code]

This script has four interrupts, which are manually triggered by code in the GUI that watches for the following conditions:

* Label 3 (which also runs immediately) is invoked whenever a release drops season level to 0, making it disappear.
* Label 2 is invoked when season level changes from 0 to 1.  First, it appears, and then it blinks in a loop.
* Label 5 makes it transparent when the player gets too close to the season gauge.
* Label 4 makes it opaque when the player moves away from the gauge.

> An aside: this actually has a silly bug in that, if the player moves near the season gauge at 0 season power,
> "Releasable" suddenly appears.  This shows just how difficult it can be to write good interrupts!

The meaning of these interrupt numbers are obviously specific to the season gauge,
and other parts of the gauge also have interrupts with the same meaning.
(e.g. the "filled" part of the bar uses labels 2 and 3 to toggle between blue at level 0 and yellow-white at levels 1+).
That said, there is one interrupt that has a nearly universal meaning:
Interrupt `1` pretty much always means "disappear forever". I.e. label 1, if it exists, will always be some kind of exit animation like fade-out,
shrinking, or flyout, and will end in [ref=anm:delete].

The vast majority of interrupts are used by hardcoded code in the game, but notably, ECL scripts can invoke [ref=anm:case] labels
on their own sprites by using the `anmSwitch` ECL instruction.
The games seldom use this but it is pretty hecking useful for modders!

### [ref=anm:caseReturn] versus [ref=anm:stop]

Notice that labels 4 and 5 end in [ref=anm:caseReturn] while labels 2 and 3 do not.  The reason for this is because **interrupts can occur at any point where the VM is waiting.**  Oftentimes, this is at a [ref=anm:stop] (since that basically means "wait forever"), but it can also occur at any [ref=anm:wait] instruction, or whenever the time label increases.

So how do we know which one we should use?  Well, think about it this way: The code for label 2 is a loop to make it blink:

<img src="content/anm/img/releasable-blonk.gif" alt="*blonk*">

Even as the player moves around and triggers interrupts 4 and 5, we want it to continue blinking as long as the player has season power.  Therefore, labels 4 and 5 end in [ref=anm:caseReturn] so that the VM can seemlessly return back to the blinking loop.  However, we do *not* want it to continue blinking when the player has season level 0.  Therefore, label 2 ends in a [ref=anm:stop]. [weak](okay, technically it doesn't matter if it keeps blinking since alpha would be 0, but finding examples is hard okay?)[/weak]

There is an important caveat to [ref=anm:caseReturn], which is that only a single return address is stored&mdash;not a stack!  Therefore, **whenever you use [ref=anm:caseReturn], you should avoid any waiting inside that [ref=anm:case] block,** because if the VM receives another interrupt during this time, the script may unexpectedly end up in an infinite loop where [ref=anm:caseReturn] keeps sending it back to a point shortly before the [ref=anm:caseReturn].

### Other miscellaneous notes on interrupts

* The game always searches for [ref=anm:case] labels starting from the *beginning* of the function. (not from the current instruction)
* It is impossible to invoke multiple interrupts on a single frame.
* [wip=2][ref=anm:case](-1) appears to work differently from the others?
  Could it be a default interrupt?
  According to 32th System it is ignored...[/wip]
* [wip=2][ref=anm:case](0) also has a special meaning, and is only used once in both [game=125] and [game=165].[/wip]

---

# <span id="uv-coords">Texture coordinates</span>

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
