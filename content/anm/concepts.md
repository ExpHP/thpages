[title=Concepts in ANM]
[requireEclmap=17]

## Texture coordinates
Numerous instructions change the region of coordinates in the texture image file that a sprite's image is pulled from.  These include [ref=anm:scrollX], [ref=anm:scaleUV], and [ref=anm:texCircle]. To fully understand how these instructions work, you must have a basic understanding of texure addressing.

These instructions operate on uv coordinates.  These are fractional coordinates into the sprite's original image file.  `(u, v) = (0, 0)` lies at the very top left corner of the top left pixel.  `(u, v) = (1, 1)` lies at the very bottom right corner of the bottom right pixel.  In the image below, the little F item occupies the rectangle from `(7/8, 2/3)` to `(1, 1)` in uv-space.

@@@@@ IMAGE: zoomed in image (big pixels) annotating uv 0,0 and 1,1

Now, this image is not the best example of the kind of image where you'd see these instructions be used. (actually, there are no good examples that are small enough for me to make such a zoomed-in figure... 😅)

Now let's say we start with this little F as our sprite, and then use [ref=anm:scrollY] with a negative argument.  This will subtract something from u every frame, causing other images in the texture to be displayed. @@@@@@@@@

Blah


## Stages of rendering

TODO

@@@@@ Mention @R

[/requireEclmap]
