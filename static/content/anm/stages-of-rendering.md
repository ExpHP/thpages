[title=The stages of rendering in ANM]

# The stages of rendering

The following describes the rendering stages as they exist in [game=14]. Future games (at least up to [game=17]) have the same set of surfaces and rendering stages, though **[wip]layer and script numbers may differ!![/wip]**

## tl;dr

* Different types of objects in the game are drawn at different times.  (astounding, right?)
* Some things are always drawn at 640x480. (the *early* stages in the rendering pipeline)
* Some things are drawn at the current resolution. (the *late* stages)

Understanding this may help you understand at least *some* of the funky business going on behind [ref=anm:layer], [ref=anm:originMode], and [ref=anm:resolutionMode] (though certainly, not all of it!).

## The three surfaces

There are three different surfaces that an ANM may be drawn to when it is rendered.  One of these, of course, is **the Direct3D BackBuffer**. (i.e. the next frame about to be drawn).  But most things are *not* drawn there directly (only the main menu and game border is).  Inside `text.anm`, two of the textures use a special filename `"@R"`:

[code]
// Some fields removed for brevity
entry entry2 {
    name: "@R",
    width: 640,
    height: 480,
    sprites: {
        sprite80: { x: 116, y: 4, w: 408, h: 472 },
        sprite81: { x: 276, y: 124, w: 408, h: 472 },
        sprite82: { x: 436, y: 244, w: 408, h: 472 }
    }
}
[/code]<br> <!-- FIXME why can't code have an empty line inside :/ also why inline-block -->
[code]
entry entry3 {
    name: "@R",
    width: 640,
    height: 480,
    sprites: {
        sprite83: { x: 116, y: 4, w: 408, h: 472 },
        sprite84: { x: 276, y: 124, w: 408, h: 472 },
        sprite85: { x: 436, y: 244, w: 408, h: 472 },
        sprite86: { x: 128, y: 16, w: 384, h: 448 },
        sprite87: { x: 192, y: 24, w: 576, h: 672 },
        sprite88: { x: 256, y: 32, w: 768, h: 896 },
        sprite89: { x: 32, y: 16, w: 384, h: 448 }
    }
}
[/code]

`name: "@R"` has the special effect of telling the game to create a new empty texture; the `R` specifically tells it to ignore the `width` and `height` and instead create a texture with the **current resolution of the game window.**  These textures basically serve as two temporary surfaces for drawing various types of sprites; call these **surface 0** and **surface 1**.  Basically everything drawn inside the game region of the window is drawn to one of these two surfaces at some point in the rendering pipeline.

## The actual stages

<h3 id='stage-1'>Stage 1: 3D Background</h3>

First, surface 0 is cleared to white, and then **the 3D stage background is rendered to a 408x472 region in the center of surface 0.**  During this time, animations with **layers 0-5 and 30-31** (again, these numbers are for [game=14] only!) are also drawn.  At the end of this stage, the surface looks like the following (click for actual size):

<a target="_blank" href="./content/anm/img/pipeline/s1-end.png"><img src="./content/anm/img/pipeline/s1-end.png" height="500px"></a>

"What's that brown border," you ask?  It's not a border&mdash;that's just the portion of the 3D background that isn't covered by Seija's spell wallpaper! You will notice that this region has 12 extra pixels of padding on all sides compared to the game's usual 384x448, which is the size of the spell wallpaper. (To help you see better, <a target="_blank" href="./content/anm/img/pipeline/s1-end-c.png">here's a screenshot taken at a different point in time</a>).  At the very end of this stage, the game uses the following script to **copy this 408x472 region over to surface 1:**

[code]
script script61 {
    [ref=anm:sprite](sprite82);
    [ref=anm:blendMode](3);
    [ref=anm:layer](32);
    [ref=anm:resampleMode](1);
    [ref=anm:anchor](0, 0);
    [ref=anm:pos](640.0f, 480.0f, 0.0f);
    [ref=anm:stop]();
}
[/code]

Notice that sprite82 (defined earlier above) does indeed define the location and size of that 408x472 rectangle on this 1280x960 canvas. There are also two similar scripts 59 and 60 using different sprites and coordinates, which are used when the game is in 640x480 or 960x720 (they have different sprites/scripts because, even though this region is always drawn at 408x472, the size of the temporary surfaces (and therefore the location of their centers) changes.)!

<h3 id='stage-2'>Stage 2: Enemies</h3>

Now **layers 6-11 are drawn**.  As far as I can tell **this is basically just enemies**.... I don't know why they're singled out.

Unlike surface 0 (which is cleared to white every frame) and the back buffer (which is cleared to black every frame), surface 1 is never cleared, so I'm not really sure what its background color is.  Therefore, I took some artistic license here and made it <span style="color:#ff69ba; font-size: 1.2em;"><strong>HOT PANK</strong></span>.  Here's what surface 1 looks like at the end of this stage:

<a target="_blank" href="./content/anm/img/pipeline/s2-end.png"><img src="./content/anm/img/pipeline/s2-end.png" height="500px"></a>

Remember! Right now **we're still only working with that 408x472 region in the very center.**  When you look at the above image, you might see... *ahem*... *other things outside that region...* but those are merely things left over from the previous frame (specifically, stage 4), because surface 1 is never cleared.

Once again, at the end of this stage, a similar script is used to **copy that 408x472 region back to surface 0.**

[code]
script script67 {
    [ref=anm:sprite](sprite85);
    [ref=anm:blendMode](3);
    [ref=anm:layer](33);
    [ref=anm:resampleMode](1);
    [ref=anm:anchor](0, 0);
    [ref=anm:pos](640.0f, 480.0f, 0.0f);
    [ref=anm:stop]();
}
[/code]

<h3 id='stage-3'>Stage 3: Other game elements</h3>

Back on surface 0, all remaining content to be upscaled is drawn.  Specifically, this is **layers 12-19,** as well as **bullets, lasers, items, and the player** (all these regardless of layer).

<a target="_blank" href="./content/anm/img/pipeline/s3-end.png"><img src="./content/anm/img/pipeline/s3-end.png" height="500px"></a>

After this, much like in the first stage, we use sprite82 to copy that 408x472 region onto surface 1, but this time we use a slightly different script:

[code]
script script64 {
    [ref=anm:sprite](sprite82);
    [ref=anm:blendMode](3);
    [ref=anm:layer](33);
    [ref=anm:resampleMode](1);
    [ref=anm:scale](2.0f, 2.0f);  // <-- !!!!!!!
    [ref=anm:anchor](0, 0);
    [ref=anm:pos](640.0f, 480.0f, 0.0f);
    [ref=anm:stop]();
}
[/code]

This script has a very important addition compared to before:  **It scales the image up by 2x** (1.5x for 960x720, 1x for 640x480)!!  That's right, this script handles the upscaling to 1280x960!  Because it also uses [ref=anm:resampleMode]`(1)`, we get a nice pixely effect.

<h3 id='stage-4'>Stage 4: In-game UI</h3>

Back on surface 1, we draw **anything we want to draw at full resolution inside the game region.**  These are **ascii group 1 and layers 20-23.**  In our current example, two things are drawn: The boss name in the upper left, and the boss's HP gauge.

<a target="_blank" href="./content/anm/img/pipeline/s4-end.png"><img src="./content/anm/img/pipeline/s4-end.png" height="500px"></a>

Notice that because the image is larger now, we have to use a different sprite to grab the right region at the end of this stage (`sprite88` instead of `sprite85`).  Also, this time, we finally crop out those extra 12 (well, now it's 24) pixels around the border.  This sprite is used to copy everything to the Direct3D BackBuffer via a pretty large script:

[code]
script script70 {
    [ref=anm:sprite](sprite88);
    [ref=anm:blendMode](3);
    [ref=anm:layer](33);
    // ...
    // ...
    // ...74 more lines of code...
    // ...
    // ...
}
[/code]

77 lines of code?  What could all of that possibly be?  Well.... lemme answer that question with another question:

> *Why do you think I chose this scene as my example?*

Here is what gets drawn to the Direct3D BackBuffer:

<a target="_blank" href="./content/anm/img/pipeline/s5-begin.png"><img src="./content/anm/img/pipeline/s5-begin.png" height="500px"></a>

Basically, script70 handles all of the rotation and mirroring for Seija's effects.  It also handles the placement of the game region in the location where it finally belongs, over on the left side of the screen.

<h3 id='stage-5'>Stage 5: Other UI</h3>

At this point, all remaining rendering occurs by drawing directly to the backbuffer.  This draws **layers 24-29 and 34-35,** as well as **ascii groups 0 and 2.**  It draws the spell name and history, the pause menu, the main menu, the border around the game, your score and lives, etc., all at a full resolution of 1280x960.

<a target="_blank" href="./content/anm/img/pipeline/s5-end.png"><img src="./content/anm/img/pipeline/s5-end.png" height="500px"></a>

### Remaining mysteries

* How does screen shake work?
* The pause blur in [game=14] onwards is basically a screenshot of the game region overlayed over the original, but I'm not when this screenshot is taken, or when it is drawn.  (you'd think something this special would have a dedicated `on_draw` like all of the scripts mentioned above, but... it doesn't)

### How'd you make those images, anyway?

For the curious (and also because I kept screwing it up and had to redo it), I recorded the steps to obtain the relevant screenshots (along with the raw, unedited images) <a href="./content/anm/img/pipeline-raw-images.zip" download>here (ZIP archive)</a>.
