import dedent from "../lib/dedent.js";

export const UNASSIGNED = {id: null, wip: 2};

export const GROUPS_V8 = [
  {min: 0, max: 299, title: 'System'},
  {min: 300, max: 499, title: 'General'},
  {min: 500, max: 599, title: 'Child management'},
  {min: 600, max: 699, title: 'Drawing'},
];

const INS_12 = {
  inherit: null,
  ins: {
    67: {id: 'type'},
    68: {id: 'layer'},
    106: {id: 'scaleUV', wip: 1},
    102: {id: 'drawRect', wip: 1},
  },
};

const INS_14 = {
  inherit: null,
  ins: {
    0: UNASSIGNED,
    1: UNASSIGNED,
    2: UNASSIGNED,
    3: UNASSIGNED,
    4: UNASSIGNED,
    5: UNASSIGNED,
    6: UNASSIGNED,
    7: UNASSIGNED,

    100: UNASSIGNED,
    101: UNASSIGNED,
    102: UNASSIGNED,
    103: UNASSIGNED,
    104: UNASSIGNED,
    105: UNASSIGNED,
    106: UNASSIGNED,
    107: UNASSIGNED,
    108: UNASSIGNED,
    109: UNASSIGNED,
    110: UNASSIGNED,
    111: UNASSIGNED,
    112: UNASSIGNED,
    113: UNASSIGNED,
    114: UNASSIGNED,
    115: UNASSIGNED,
    116: UNASSIGNED,
    117: UNASSIGNED,
    118: UNASSIGNED,
    119: UNASSIGNED,
    120: UNASSIGNED,
    121: UNASSIGNED,
    122: UNASSIGNED,
    123: UNASSIGNED,
    124: UNASSIGNED,
    125: UNASSIGNED,
    126: UNASSIGNED,
    127: UNASSIGNED,
    128: UNASSIGNED,
    129: UNASSIGNED,
    130: UNASSIGNED,
    131: UNASSIGNED,

    200: UNASSIGNED,
    201: UNASSIGNED,
    202: UNASSIGNED,
    203: UNASSIGNED,
    204: UNASSIGNED,
    205: UNASSIGNED,
    206: UNASSIGNED,
    207: UNASSIGNED,
    208: UNASSIGNED,
    209: UNASSIGNED,
    210: UNASSIGNED,
    211: UNASSIGNED,
    212: UNASSIGNED,
    213: UNASSIGNED,

    300: {id: 'anm:sprite'},
    301: {id: 'anm:spriteRand'},
    302: {id: 'anm:renderMode'},
    303: UNASSIGNED,
    304: {id: 'anm:layer'},
    305: UNASSIGNED,
    306: UNASSIGNED,
    307: UNASSIGNED,
    308: UNASSIGNED,
    309: UNASSIGNED,
    310: UNASSIGNED,
    311: UNASSIGNED,
    312: UNASSIGNED,
    313: UNASSIGNED,
    314: UNASSIGNED,
    315: UNASSIGNED,

    400: UNASSIGNED,
    401: UNASSIGNED,
    402: UNASSIGNED,
    403: UNASSIGNED,
    404: UNASSIGNED,
    405: UNASSIGNED,
    406: UNASSIGNED,
    407: UNASSIGNED,
    408: UNASSIGNED,
    409: UNASSIGNED,
    410: UNASSIGNED,
    411: UNASSIGNED,
    412: UNASSIGNED,
    413: UNASSIGNED,
    414: UNASSIGNED,
    415: UNASSIGNED,
    416: UNASSIGNED,
    417: UNASSIGNED,
    418: {id: 'anm:v8-418'},
    419: UNASSIGNED,
    420: UNASSIGNED,
    421: UNASSIGNED,
    422: UNASSIGNED,
    423: UNASSIGNED,
    424: UNASSIGNED,
    425: UNASSIGNED,
    426: UNASSIGNED,
    427: UNASSIGNED,
    428: UNASSIGNED,
    429: UNASSIGNED,
    430: UNASSIGNED,
    431: UNASSIGNED,
    432: UNASSIGNED,
    433: UNASSIGNED,
    434: UNASSIGNED,
    435: UNASSIGNED,
    436: UNASSIGNED,
    437: UNASSIGNED,
    438: UNASSIGNED,

    500: UNASSIGNED,
    501: UNASSIGNED,
    502: UNASSIGNED,
    503: UNASSIGNED,
    504: UNASSIGNED,
    505: UNASSIGNED,
    506: UNASSIGNED,
    507: UNASSIGNED,
    508: UNASSIGNED,
    509: UNASSIGNED,

    600: UNASSIGNED,
    601: UNASSIGNED,
    602: UNASSIGNED,
    603: {id: 'anm:drawRect'},
    604: UNASSIGNED,
    605: UNASSIGNED,
    606: {id: 'anm:drawRectGrad'},
    607: {id: 'anm:drawRectShadow'},
    608: {id: 'anm:drawRectShadowGrad'},
    609: UNASSIGNED,
    610: UNASSIGNED,
  },
};

const INS_15 = {
  inherit: INS_14,
  ins: {
  },
};

const INS_16 = {
  inherit: INS_15,
  ins: {
    612: {id: 'anm:drawRectBorder'},
    613: {id: 'anm:drawLine'},
  },
};

const INS_17 = {
  inherit: INS_16,
  ins: {
  },
};

export const ANM_BY_OPCODE = {
  // TODO: point games as e.g. "125"
  "12": INS_12,
  "14": INS_14,
  "15": INS_15,
  "16": INS_16,
  "17": INS_17,
};

// ==========================================================================
// ==========================================================================

export const DUMMY_DATA = {sig: '', args: [], wip: 2, desc: '[wip=2]No data.[/wip]'};

// Lookup table by ref id. (game-independent, anmmap-independent name)
export const ANM_INS_DATA = {
  // =========================
  // ==== RENDER SETTINGS ====
  // =========================
  'sprite': {
    sig: 'S', args: ['id'], desc: dedent`
    Sets the image used by this VM to one of the sprites defined in the ANM file.
    A value of \`-1\` means to not use an image (this is frequently used with shape-drawing instructions).
    thanm also lets you use the sprite's name instead of an index.

    [wip]Under some conditions, these sprite indices are transformed by a "sprite-mapping" function; e.g. many
    bullet scripts use false indices, presumably to avoid repeating the same script for 16 different colors.
    The precise mechanism of this is not yet fully understood.[/wip]
  `},
  // TODO: link to RNG concept page once it exists
  'spriteRand': {
    sig: 'SS', args: ['a', 'b'], desc: dedent`
    Selects a random sprite from %1 (inclusive) to %1 + %2 (exclusive) using the animation RNG.
  `},
  // TODO: Maybe link to RenderType enum.
  'renderMode': {
    sig: 'S', args: ['t'], desc: dedent`
    Determines how the ANM is rendered.

    Mode numbers can change between games, but the most popular modes have pretty stable numbers:

    * Mode 0 is for 2D sprites that do not require rotation.
    * Mode 1 is for 2D sprites that require rotation around the z-axis.
    * Mode 8 is for sprites that need to rotate in 3D space.
    * [wip]Mode 2 is like mode 0, but shifts the position by (-0.5, -0.5) pixels, making it appear ever-so-slightly
        larger and blurrier.[/wip]
    * [wip]Any other modes used in scripts are a total mystery at this time.[/wip]
    * Many mode numbers are not intended for use by ANM scripts, and are instead reserved for instructions
      like [ref=anm:texCircle] and [ref=anm:drawRect] (each one has its own mode).
  `},
  // TODO: link to layer concept.
  // TODO: link to stages of drawing.
  'layer': {
    sig: 'S', args: ['n'], desc: dedent`
    Sets the layer of the ANM.  [wip]This may or may not affect z-ordering? It's weird...[/wip]

    **Different layer numbers may behave differently!** Each game only has a finite number of layers, and certain groups of these layers
    are drawn at different stages in the rendering pipeline.  Be especially careful when porting something from one game to another,
    as the layer groupings may have changed.
  `},

  // =================
  // ==== DRAWING ====
  // =================
  'drawRect': {
    sig: 'ff', args: ['w', 'h'], desc: dedent`
    Draws a filled rectangle with the given dimensions.  No gradients.
    If you want to control the dimensions from ECL, consider passing in \`1.0\` and changing the anm's scale instead.
  `},
  'drawRectGrad': {
    sig: 'ff', args: ['w', 'h'], desc: dedent`
    Same as [ref=anm:drawRect] but supports gradients ([ref=anm:color2]), which go from left to right.
  `},
  // TODO: find a way to "collapse" this by default
  'drawRectShadow': {
    sig: 'ff', args: ['w', 'h'], wip: 1, desc: dedent`
    Don't use this.

    The implementation does the following:
    1. Draw a rectangle like [ref=anm:drawRect] but of size \`(w+1, h+1)\`, and \`0.5 * alpha\`.
    2. Then draw a rectangle exactly like [ref=anm:drawRect].

    This has the visual effect of creating a 1 pixel "shadow" along two of the edges.
    Unfortunately, WHICH sides have shadows is not well-defined with centered anchoring,
    and the shadow will tend to bounce around in an ugly fashion as the object moves.

    You can force the shadow onto a given side by anchoring the opposite side.
    (this works because both rectangles are drawn with the same position and anchoring)
  `},
  'drawRectShadowGrad': {
    sig: 'ff', args: ['w', 'h'], wip: 1, desc: dedent`
    Same as [ref=anm:drawRect] but supports gradients ([ref=anm:color2]), which go from left to right.
  `},
  'drawRectBorder': {
    sig: 'ff', args: ['w', 'h'], desc: dedent`
    Draws a 1-pixel thick outline of a rectangle.  No gradients.

    Just like [ref=anm:drawRect], you can control the dimensions externally using [ref=anm:scale].
    (the border will remain 1 pixel thick even when scaled)
  `},
  'drawLine': {
    sig: 'ff', args: ['len', 'unused'], desc: dedent`
    Draws a 1-pixel thick horizontal line.  The second argument is unused.  No gradients.

    If you want to change its direction, you must use [ref=anm:rotate].
  `},

  // ============================
  // ==== WEIRD-ASS NONSENSE ====
  // ============================
  'v8-418': {
    sig: '', args: [], wip: 1, desc: dedent`
    A bizarre and **unused** (?) instruction that appears to select a new sprite in the image file based on the anm's coordinates.

    The code appears to do the following: [wip](expect inaccuracies!)[/wip]
    * Using the current position, scale, etc. and [ref=anm:renderMode] setting (which must be \`<= 3\`),
      compute the corners of the rectangle that the ANM would occupy on the surface it is being drawn to.
    * Divide each corner's coords by 640x480 (regardless of resolution or original image size).
    * Use those as fractional uv coordinates for a region to pull sprite data from.

    Presumably this lets you do weird things like use a rotated region of a .png file as a sprite.
  `},
};

for (const [key, value] of Object.entries(ANM_INS_DATA)) {
  value.wip = value.wip || 0;
  value.problems = value.problems || [];
  if (value.wip) {
    value.problems.push('docs');
  }
  if (value.sig.length !== value.args.length) {
    window.console.log(`arg count mismatch in anm ins info for ${key}`);
  }
}

// export const INS_17 = {
//   641: {
//     number: 641,
//     game: 14,
//     args: 'S',
//     argnames: ['etId'],
//     description: `Subtracts 1 from the index used by [ins=611,13] and [ins=612,13], unless it's already 0. This basically changes where the next transformation will be appended.`,
//     documented: true,
//   },

//   712: {
//     number: 712,
//     game: 14,
//     args: 'ff',
//     argnames: ["w", "h"],
//     description: "Cancels all bullets in rectangle of width %1 and height %2. The area is affected by rotation set by [ins=564,14].",
//     documented: true,
//   },
// };

export const ARGTYPES = {
  "S": "int",
  "f": "float",
  "m": "string",
  "o": "label",
};
