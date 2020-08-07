import dedent from "../lib/dedent.js";

export const UNASSIGNED = {id: null, wip: 2};
export const UNKNOWN_SIG = {};

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
    0: {id: 'anm:nop'},
    1: {id: 'anm:delete'},
    2: {id: 'anm:static'},
    3: {id: 'anm:stop'},
    4: {id: 'anm:stop2'},
    5: {id: 'anm:case'},
    6: {id: 'anm:wait'},
    7: {id: 'anm:v8-7'},

    100: {id: 'anm:set'},
    101: {id: 'anm:setF'},
    102: {id: 'anm:add'},
    103: {id: 'anm:addF'},
    104: {id: 'anm:sub'},
    105: {id: 'anm:subF'},
    106: {id: 'anm:mul'},
    107: {id: 'anm:mulF'},
    108: {id: 'anm:div'},
    109: {id: 'anm:divF'},
    110: {id: 'anm:mod'},
    111: {id: 'anm:modF'},
    112: {id: 'anm:add3'},
    113: {id: 'anm:addF3'},
    114: {id: 'anm:sub3'},
    115: {id: 'anm:subF3'},
    116: {id: 'anm:mul3'},
    117: {id: 'anm:mulF3'},
    118: {id: 'anm:div3'},
    119: {id: 'anm:divF3'},
    120: {id: 'anm:mod3'},
    121: {id: 'anm:modF3'},
    122: {id: 'anm:rand'},
    123: {id: 'anm:randF'},
    124: {id: 'anm:mathSin'},
    125: {id: 'anm:mathCos'},
    126: {id: 'anm:mathTan'},
    127: {id: 'anm:mathAcos'},
    128: {id: 'anm:mathAtan'},
    129: {id: 'anm:mathReduceAngle'},
    130: {id: 'anm:mathCirclePos'},
    131: {id: 'anm:mathCirclePosRand'},

    200: {id: 'anm:jmp'},
    201: {id: 'anm:jmpDec'},
    202: {id: 'anm:jmpEq'},
    203: {id: 'anm:jmpEqF'},
    204: {id: 'anm:jmpNe'},
    205: {id: 'anm:jmpNeF'},
    206: {id: 'anm:jmpLt'},
    207: {id: 'anm:jmpLtF'},
    208: {id: 'anm:jmpLe'},
    209: {id: 'anm:jmpLeF'},
    210: {id: 'anm:jmpGt'},
    211: {id: 'anm:jmpGtF'},
    212: {id: 'anm:jmpGe'},
    213: {id: 'anm:jmpGeF'},

    300: {id: 'anm:sprite'},
    301: {id: 'anm:spriteRand'},
    302: {id: 'anm:renderMode'},
    303: {id: 'anm:blendMode'},
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

export const DUMMY_DATA = {sig: '', args: [], wip: 2, desc: '[wip=2]*No data.*[/wip]'};

// Lookup table by ref id. (game-independent, anmmap-independent name)
export const ANM_INS_DATA = {
  'nop': {sig: '', args: [], desc: "Does nothing."},
  'delete': {sig: '', args: [], desc: "Destroys the animation."},
  'static': {sig: '', args: [], wip: 1, desc: `[wip=1]Chinese wiki says "makes a static texture", sounds straightforward but more investigation wouldn't hurt.[/wip]`},
  'stop': {sig: '', args: [], desc: "Stops executing the script and waits for a switch to occur. (see [ref=anm:case])"},
  'stop2': {sig: '', args: [], wip: 1, desc: "This is [ref=anm:stop] except that it additionally clears an unknown bitflag..."},
  'case': {
    sig: 'S', args: ['n'], desc: dedent`
    A label used to externally control an ANM.

    [wip]TODO: more details, show example code[/wip]

    Enemies can invoke this using the \`anmSwitch\` instruction.  Furthermore, the game internally uses [ref=anm:case] labels for all sorts
    of different purposes.  For instance, it is used to handle animations on the Pause menu and main menu, it is used to make player options
    appear and disappear based on power, and it is even used to make the season gauge go transparent when the player gets near.

    [ref=anm:case](1) is almost universally used to mean "go away permanently." (i.e. it almost always ends in [ref=anm:delete])

    Miscellaneous notes:
    * If multiple switches occur on one frame, only the **last** takes effect.
    * \`[ref=anm:case](0)\` doesn't work due to how pending switch numbers are stored.
    * [wip]\`[ref=anm:case](-1)\` appears to work differently from the others...[/wip]
    * [wip]Can switching interrupt code that is not at a [ins=anm:stop]? Testing needed.[/wip]
  `},
  'wait': {sig: 'S', args: ['t'], desc: 'Wait %1 frames.'},
  'v8-7': {sig: '', args: [], wip: 2, desc: "[wip=2]*dunno but it looks important lol*[/wip]"},
  'jmp': {
    sig: 'SS', args: ['dest', 't'], desc: dedent`
    Jumps to %1 and sets time to %2.  \`thanm\` accepts a label name for %1.

    [wip=2]Chinese wiki says some confusing recommendation about setting a=0, can someone explain to me?[/wip]

    [wip]What is %1 relative to? Beginning of current script?[/wip]
  `},
  'jmpDec': {
    sig: '$SS', args: ['x', 'dest', 't'], desc: dedent`
    Decrement %1 and then jump if it is \`> 0\`.  You can use this to repeat a loop a fixed number of times.

    [code]
      [ref=anm:set]([10000], 3);
    loop:
      // ...
      // anything in this block will be done 3 times
      // ...
      [ref=anm:jmpDec]([10000], loop);
    [/code]
  `},

  'rand': {sig: '$S', args: ['x', 'n'], desc: 'Draw a random integer `0 <= %1 < %2`.'},
  'randF': {sig: '%f', args: ['x', 'r'], desc: 'Draw a random float `0 <= %1 <= %2`.'},

  'mathSin': {sig: '%f', args: ['dest', 'θ'], desc: 'Compute `sin(%1)` (%1 in radians).'},
  'mathCos': {sig: '%f', args: ['dest', 'θ'], desc: 'Compute `cos(%1)` (%1 in radians).'},
  'mathTan': {sig: '%f', args: ['dest', 'θ'], desc: 'Compute `tan(%1)` (%1 in radians).'},
  'mathAcos': {sig: '%f', args: ['dest', 'θ'], desc: 'Compute `acos(%1)` (output in radians).'},
  'mathAtan': {sig: '%f', args: ['dest', 'θ'], desc: 'Compute `atan(%1)` (output in radians).'},
  'mathReduceAngle': {sig: '%', args: ['θ'], desc: 'Reduce an angle modulo `2*PI` into the range `[-PI, +PI]`.'},
  'mathCirclePos': {sig: '%%ff', args: ['x', 'y', 'θ', 'r'], desc: '`%1 = %4*cos(%3); %2 = %4*sin(%3);`'},
  'mathCirclePosRand': {
    sig: '%%ff', args: ['x', 'y', 'rmin', 'rmax'], desc: dedent`
    Uniformly draws a random radius \`r\` in the interval given by %3 and %4, and picks a random angle. (both using the anm RNG)
    Then basically computes [ref=anm:mathCirclePos] on those.

    This isn't the right way to uniformly draw points on a ring shape, but I don't think that's what it's used for anyways.
    (it's more like for just making a random vector with a random magnitude)
  `},

  // =========================
  // ==== RENDER SETTINGS ====
  // =========================
  'sprite': {
    sig: 'S', args: ['id'], desc: dedent`
    Sets the image used by this VM to one of the sprites defined in the ANM file.
    A value of \`-1\` means to not use an image (this is frequently used with shape-drawing instructions).
    thanm also lets you use the sprite's name instead of an index.

    [wip]Under some unknown conditions[/wip], these sprite indices are transformed by a "sprite-mapping"
    function; e.g. many bullet scripts use false indices, presumably to avoid repeating the same script
    for 16 different colors.  [wip]The precise mechanism of this is not yet fully understood.[/wip]
  `},
  // TODO: link to RNG concept page once it exists
  'spriteRand': {
    sig: 'SS', args: ['a', 'b'], desc: dedent`
    Selects a random sprite from %1 (inclusive) to %1 + %2 (exclusive) using the animation RNG.
  `},
  'blendMode': {
    sig: 'S', args: ['mode'], desc: dedent`
    Set color blending mode.

    Modes for [game=14]DDC[/game]: (other games may be different)

    | Mode | \`SRCBLEND\` | \`DESTBLEND\` | \`BLENDOP\` | Meaning |
    | ---         | ---           | --- | --- | --- |
    | 0 | \`SRCALPHA\` | \`INVSRCALPHA\` | \`ADD\` | Normal |
    | 1 | \`SRCALPHA\` | \`ONE\` | \`ADD\` | Add |
    | 2 | \`SRCALPHA\` | \`ONE\` | \`REVSUBTRACT\` | Subtract (but weird?)† |
    | 3 | \`ONE\` | \`ZERO\` | \`ADD\` | Replace |
    | 4 | \`INVDESTCOLOR\` | \`INVSRCCOLOR\` | \`ADD\` | Screen? (S + D - SD) |
    | 5 | \`DESTCOLOR\` | \`ZERO\` | \`ADD\` | Multiply, I guess? |
    | 6 | \`INVSRCCOLOR\` | \`INVSRCALPHA\` | \`ADD\` | *uh.*  (S(1-S) + D(1-alpha)) |
    | 7 | \`DESTALPHA\` | \`INVDESTALPHA\` | \`ADD\` | Normal but src is drawn *behind* dest |
    | 8 | \`SRCALPHA\` | \`ONE\` | \`MIN\` | Darken only? |
    | 9 | \`SRCALPHA\` | \`ONE\` | \`MAX\` | Lighten only? |

    [wip]These are all untested, I only looked at assembly.[/wip]

    † Weird because it seems this would also subtract alpha. (so if the thing you're drawing is fully opaque,
    the result will be fully transparent, deleting even the background...)
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
  'flipX': {sig: '', args: [], desc: "Toggles mirroring on the x axis.  [wip](sounds straightforward, but which things are affected?[/wip]"},
  'flipY': {sig: '', args: [], desc: "Toggles mirroring on the y axis.  [wip](sounds straightforward, but which things are affected?[/wip]"},
  'resampleMode': {
    sig: 'S', args: ['n'], desc: dedent`
    Determines how a sprite is resampled when scale is greater or less than 1f.

    0 - \`D3DTEXF_LINE\` (linear interpolation; blurry)
    1 - \`D3DTEXF_POINT\` (nearest-point sampling; big pixels)

    [c=red]TODO: image[/c]
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
    sig: 'ff', args: ['w', 'h'], desc: dedent`
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
    sig: 'ff', args: ['w', 'h'], desc: dedent`
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

const OPERATOR_DATA = {set: "=", add: "+=", sub: "-=", mul: "*=", div: "/=", mod: "%="};
for (const [mnemonic, operator] of Object.entries(OPERATOR_DATA)) {
  for (const [suffix, refTy, valTy] of [['', '$', 'S'], ['F', '%', 'f']]) {
    ANM_INS_DATA[`${mnemonic}${suffix}`] = {
      sig: `${refTy}${valTy}`,
      args: ['a', 'b'],
      desc: `Does \`a ${operator} b\`.`,
    };
  }
}

const OPERATOR_3_DATA = {add: "+", sub: "-", mul: "*", div: "/", mod: "%"};
for (const [mnemonic, operator] of Object.entries(OPERATOR_3_DATA)) {
  for (const [suffix, refTy, valTy] of [['', '$', 'S'], ['F', '%', 'f']]) {
    ANM_INS_DATA[`${mnemonic}${suffix}3`] = {
      sig: `${refTy}${valTy}${valTy}`,
      args: ['x', 'a', 'b'],
      desc: `Does \`a = b ${operator} c\`.`,
    };
  }
}

const JUMP_DATA = {jmpEq: "==", jmpNe: "!=", jmpLt: "<", jmpLe: "<=", jmpGt: ">", jmpGe: ">="};
for (const [mnemonic, operator] of Object.entries(JUMP_DATA)) {
  for (const [suffix, ty] of [['', 'S'], ['F', 'f']]) {
    ANM_INS_DATA[`${mnemonic}${suffix}`] = {
      sig: `${ty}${ty}SS`,
      args: ['a', 'b', 'dest', 't'],
      desc: `Jumps if \`a ${operator} b\`.`,
    };
  }
}

// Validate
for (const [key, value] of Object.entries(ANM_INS_DATA)) {
  value.wip = value.wip || 0;
  value.problems = value.problems || [];
  if (value.desc === undefined) window.console.error(`TABLE CORRUPT: anm ref ${key} has no 'desc'`);
  if (value.sig === undefined) window.console.error(`TABLE CORRUPT: anm ref ${key} has no 'sig'`);
  if (value.sig != null && value.args === undefined) window.console.error(`TABLE CORRUPT: anm ref ${key} has no 'args'`);
  if (value.sig && value.sig.length !== value.args.length) {
    window.console.error(`TABLE CORRUPT: anm ref ${key} has arg count mismatch`);
  }

  if (value.wip) value.problems.push('docs');
}
