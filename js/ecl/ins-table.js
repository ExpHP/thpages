import dedent from "../lib/dedent.js";

export const UNASSIGNED = {id: null, wip: 2};
export const UNKNOWN_SIG = {};

// ==========================================================================
// ==========================================================================
// ===================    LOOKUP TABLE BY OPCODE    =========================

export const GROUPS_V8 = [
  {min: 0, max: 99, title: 'System'},
  {min: 100, max: 199, title: 'Math'},
  {min: 200, max: 299, title: 'Jumps'},
  {min: 300, max: 499, title: 'General'},
  {min: 500, max: 599, title: 'Child management'},
  {min: 600, max: 699, title: 'Drawing'},
];

const INS_12 = {
  // FIXME: rename id to ref to avoid confusion (we use 'id' to refer to the part after 'anm:')
  67: {id: 'anm:type'},
  68: {id: 'anm:layer'},
  106: {id: 'anm:scaleUV', wip: 1},
  102: {id: 'anm:drawRect', wip: 1},
};

const INS_14 = {
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
  308: {id: 'anm:flipX'},
  309: {id: 'anm:flipY'},
  310: UNASSIGNED,
  311: {id: 'anm:resampleMode'},
  312: {id: 'anm:scrollMode'},
  313: {id: 'anm:resolutionMode'},
  314: UNASSIGNED,
  315: UNASSIGNED,

  400: {id: 'anm:pos'},
  401: {id: 'anm:rotate'},
  402: {id: 'anm:scale'},
  403: {id: 'anm:alpha'},
  404: {id: 'anm:rgb'},
  405: {id: 'anm:alpha2'},
  406: {id: 'anm:rgb2'},
  407: {id: 'anm:posTime'},
  408: {id: 'anm:rgbTime'},
  409: {id: 'anm:alphaTime'},
  410: {id: 'anm:rotateTime'},
  411: {id: 'anm:rotateTime2D'},
  412: {id: 'anm:scaleTime'},
  413: {id: 'anm:rgb2Time'},
  414: {id: 'anm:alpha2Time'},
  415: {id: 'anm:angleVel'},
  416: {id: 'anm:scaleGrowth'},
  417: {id: 'anm:alphaTime2'},
  418: {id: 'anm:v8-418'},
  419: UNASSIGNED,
  420: {id: 'anm:posBezier'},
  421: {id: 'anm:anchor'},
  422: UNASSIGNED,
  423: {id: 'anm:colorMode'},
  424: {id: 'anm:rotateAuto'},
  425: {id: 'anm:uVel'},
  426: {id: 'anm:vVel'},
  427: {id: 'anm:uVelTime'},
  428: {id: 'anm:vVelTime'},
  429: {id: 'anm:uvScale'},
  430: {id: 'anm:uvScaleTime'},
  431: UNASSIGNED,
  432: UNASSIGNED,
  433: UNASSIGNED,
  434: {id: 'anm:scale2'},
  435: {id: 'anm:scale2Time'},
  436: {id: 'anm:anchorOffset'},
  437: UNASSIGNED,
  438: {id: 'anm:originMode'},

  500: UNASSIGNED,
  501: UNASSIGNED,
  502: UNASSIGNED,
  503: UNASSIGNED,
  504: UNASSIGNED,
  505: UNASSIGNED,
  506: UNASSIGNED,
  507: UNASSIGNED,
  508: UNASSIGNED,
  509: {id: 'anm:copyParentVars'},

  600: {id: 'anm:textureCircle'},
  601: {id: 'anm:textureArcEven'},
  602: {id: 'anm:textureArc'},
  603: {id: 'anm:drawRect'},
  604: {id: 'anm:drawPoly'},
  605: {id: 'anm:drawPolyBorder'},
  606: {id: 'anm:drawRectGrad'},
  607: {id: 'anm:drawRectShadow'},
  608: {id: 'anm:drawRectShadowGrad'},
  609: {id: 'anm:textureCylinder3D'},
  610: {id: 'anm:textureRing3D'},
};

const INS_15 = Object.assign({}, INS_14, {
  316: UNASSIGNED,
  317: UNASSIGNED,
  611: {id: 'anm:drawRing'},
});

const INS_16 = Object.assign({}, INS_15, {
  612: {id: 'anm:drawRectBorder'},
  613: {id: 'anm:drawLine'},
});

const INS_17 = Object.assign({}, INS_16, {
  // nothing was added
});

export const ANM_BY_OPCODE = {
  // TODO: point games as e.g. "125"
  "12": INS_12,
  "14": INS_14,
  "15": INS_15,
  "16": INS_16,
  "17": INS_17,
};

// // ==========================================================================
// // ==========================================================================
// // ==================    REVERSE LOOKUP TABLE     ===========================

// // This table gets an opcode from a ref, so that the name can be looked up in an eclmap.

// export const ANM_OPCODE_REVERSE = {};
// for (const [game, inner] of Object.entries(ANM_BY_OPCODE)) {
//   ANM_OPCODE_REVERSE[game] = {};
//   for (const [opcodeStr, {id}] of Object.entries(inner)) {
//     if (id === null) continue; // no associated data entry yet

//     if (!id.startsWith('anm:')) {
//       window.console.error(`wrong prefix in anm lookup table: (game ${game}, opcode ${opcodeStr}): ${id}`);
//       continue;
//     }

//     const opcode = parseInt(opcodeStr, 10);
//     if (Number.isNaN(opcode)) {
//       window.console.error(`bad opcode: (game ${game}, opcode ${opcodeStr})`);
//       continue;
//     }
//     ANM_OPCODE_REVERSE[id] = opcode;
//   }
// }

// ==========================================================================
// ==========================================================================
// =====================    INSTRUCTION DATA    =============================

export const DUMMY_DATA = {sig: '', args: [], wip: 2, desc: '[wip=2]*No data.*[/wip]'};

// Lookup table by ref id. (game-independent, anmmap-independent name)
export const ANM_INS_DATA = {};

// ==============
// ==== CORE ====
// ==============
Object.assign(ANM_INS_DATA, {
  'nop': {sig: '', args: [], desc: "Does nothing."},
  'delete': {sig: '', args: [], desc: "Destroys the animation."},
  'static': {sig: '', args: [], wip: 1, desc: `[wip=1]Chinese wiki says "makes a static texture", sounds straightforward but more investigation wouldn't hurt.[/wip]`},
  'stop': {sig: '', args: [], desc: "Stops executing the script and waits for a switch to occur. (see [ref=anm:case])"},
  'stop2': {sig: '', args: [], wip: 1, desc: "This is [ref=anm:stop] except that it additionally clears an unknown bitflag..."},
  'case': {
    sig: 'S', args: ['n'], desc: `
    A label used to externally control an ANM.

    [tiphide]
    [wip]TODO: show example code[/wip]

    <!-- FIXME: use eclmap for anmSwitch or link to something -->
    Enemies can invoke this using the \`anmSwitch\` ECL instruction.  The game also internally uses [ref=anm:case] labels for all sorts
    of different purposes.  For instance, it is used to handle animations on the Pause menu and main menu, it is used to make player options
    appear and disappear based on power, and it is even used to make the season gauge go transparent when the player gets near.

    [ref=anm:case](1) is almost universally used to mean "go away permanently." (i.e. it almost always ends in [ref=anm:delete])

    Miscellaneous notes:
    * If multiple switches occur on one frame, only the **last** takes effect.
    * [ref=anm:case](0) doesn't work due to how pending switch numbers are stored.
    * [wip][ref=anm:case](-1) appears to work differently from the others...[/wip]
    * [wip]Can switching interrupt code that is not at a [ref=anm:stop]? Testing needed.[/wip]
    [/tiphide]
  `},
  'wait': {sig: 'S', args: ['t'], desc: `Wait %1 frames.`},
  'v8-7': {sig: '', args: [], wip: 2, desc: `[wip=2]*dunno but it looks important lol*[/wip]`},
});

// =====================
// ==== OPS N JUMPS ====
// =====================
Object.assign(ANM_INS_DATA, {
  'jmp': {
    sig: 'SS', args: ['dest', 't'], desc: `
    Jumps to %1 and sets time to %2.  \`thanm\` accepts a label name for %1.

    [tiphide]
    [wip=2]Chinese wiki says some confusing recommendation about setting a=0, can someone explain to me?[/wip]

    [wip]What is %1 relative to? Beginning of current script?[/wip]
    [/tiphide]
  `},
  'jmpDec': {
    sig: '$SS', args: ['x', 'dest', 't'], desc: `
    Decrement %1 and then jump if it is \`> 0\`.  You can use this to repeat a loop a fixed number of times.

    [tiphide]
    [code]
      [ref=anm:set]([ref=anmvar:i0], 3);
    loop:
      // ...
      // anything in this block will be done 3 times
      // ...
      [ref=anm:jmpDec]([ref=anmvar:i0], loop);
    [/code]
    [/tiphide]
  `},
});

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

// TODO: Strip out parameter tooltips, they're easy to mess up anyways.
Object.assign(ANM_INS_DATA, {
  'rand': {sig: '$S', args: ['x', 'n'], desc: 'Draw a random integer `0 <= x < n`.'},
  'randF': {sig: '%f', args: ['x', 'r'], desc: 'Draw a random float `0 <= x <= r`.'},

  'mathSin': {sig: '%f', args: ['dest', 'θ'], desc: 'Compute `sin(θ)` (%2 in radians).'},
  'mathCos': {sig: '%f', args: ['dest', 'θ'], desc: 'Compute `cos(θ)` (%2 in radians).'},
  'mathTan': {sig: '%f', args: ['dest', 'θ'], desc: 'Compute `tan(θ)` (%2 in radians).'},
  'mathAcos': {sig: '%f', args: ['dest', 'θ'], desc: 'Compute `acos(θ)` (output in radians).'},
  'mathAtan': {sig: '%f', args: ['dest', 'θ'], desc: 'Compute `atan(θ)` (output in radians).'},
  'mathReduceAngle': {sig: '%', args: ['θ'], desc: 'Reduce an angle modulo `2*PI` into the range `[-PI, +PI]`.'},
  'mathCirclePos': {sig: '%%ff', args: ['x', 'y', 'θ', 'r'], desc: '%1` = `%4`* cos(`%3`);`<br>%2` = `%4`* sin(`%3`);`'},
  'mathCirclePosRand': {
    sig: '%%ff', args: ['x', 'y', 'rmin', 'rmax'], desc: `
    Uniformly draws a random radius \`r\` in the interval given by %3 and %4, and picks a random angle. (both using the anm RNG)
    Then basically computes [ref=anm:mathCirclePos] on those.

    This isn't the right way to uniformly draw points on a ring shape, but I don't think that's what it's used for anyways.
    (it's more like for just making a random vector with a random magnitude)
  `},
});

// =========================
// ==== RENDER SETTINGS ====
// =========================
Object.assign(ANM_INS_DATA, {
  'sprite': {
    sig: 'S', args: ['id'], desc: `
    Sets the image used by this VM to one of the sprites defined in the ANM file.
    A value of \`-1\` means to not use an image (this is frequently used with shape-drawing instructions).
    thanm also lets you use the sprite's name instead of an index.

    [wip]Under some unknown conditions[/wip], these sprite indices are transformed by a "sprite-mapping"
    function; e.g. many bullet scripts use false indices, presumably to avoid repeating the same script
    for 16 different colors.  [wip]The precise mechanism of this is not yet fully understood.[/wip]
  `},
  // TODO: link to RNG concept page once it exists
  'spriteRand': {
    sig: 'SS', args: ['a', 'b'], desc: `
    Selects a random sprite from %1 (inclusive) to %1 + %2 (exclusive) using the animation RNG.
  `},
  'blendMode': {
    sig: 'S', args: ['mode'], desc: `
    Set color blending mode.

    [tiphide]
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
    [/tiphide]
  `},
  // TODO: Maybe link to RenderType enum.
  'renderMode': {
    sig: 'S', args: ['t'], desc: `
    Determines how the ANM is rendered.

    [tiphide]
    Mode numbers can change between games, but the most popular modes have pretty stable numbers:

    * Mode 0 is for 2D sprites that do not require rotation.
    * Mode 1 is for 2D sprites that require rotation around the z-axis.
    * Mode 8 is for sprites that need to rotate in 3D space.
    * [wip]Mode 2 is like mode 0, but shifts the position by (-0.5, -0.5) pixels, making it appear ever-so-slightly
        larger and blurrier.[/wip]
    * [wip]Any other modes used in scripts are a total mystery at this time.[/wip]
    * Many mode numbers are not intended for use by ANM scripts, and are instead reserved for instructions
      like [ref=anm:texCircle] and [ref=anm:drawRect] (each one has its own mode).
    [/tiphide]
  `},
  // TODO: link to layer concept.
  // TODO: link to stages of drawing.
  'layer': {
    sig: 'S', args: ['n'], desc: `
    Sets the layer of the ANM.  [tiphide][wip]This may or may not affect z-ordering? It's weird...[/wip][/tiphide]

    [tiphide]**Different layer numbers may behave differently!** Each game only has a finite number of layers, and certain groups of these layers
    are drawn at different stages in the rendering pipeline.  Be especially careful when porting something from one game to another,
    as the layer groupings may have changed.[/tiphide]
  `},
  'flipX': {sig: '', args: [], desc: "Toggles mirroring on the x axis.  [wip](sounds straightforward, but which things are affected?[/wip]"},
  'flipY': {sig: '', args: [], desc: "Toggles mirroring on the y axis.  [wip](sounds straightforward, but which things are affected?[/wip]"},
  'resampleMode': {
    sig: 'S', args: ['n'], desc: `
    Determines how a sprite is resampled when scale is greater or less than 1f.

    [tiphide]
    | Mode | D3D constant | Meaning | Layman's terms |
    | ---  | --- | --- | ---
    | 0    | \`D3DTEXF_LINE\` | linear interpolation | blurry |
    | 1    | \`D3DTEXF_POINT\` | nearest-point sampling | big pixels |

    As an example, Reimu's sprite in [game=14]DDC[/game] uses [ref-notip=anm:resampleMode]\`(1)\`, while her hitbox animation does not.
    Here you can see the effect of enabling it on the hitbox during Shinmyoumaru's survival spell.<br>
    <img src="./content/anm/img/ins-v8-311.png" height="200px">
    [/tiphide]
  `},
  // TODO: link to stages of drawing.
  'originMode': {
    sig: 'S', args: ['mode'], wip: 1, desc: `
    Determines the origin used by the sprite.

    [tiphide]
    | Value | Origin | Appropriate for |
    | ---   | ---    | --- |
    | 0     | Top left of target surface. | Border around the game. |
    | 1     | Location of ECL's (0,0) in early rendering stages | Game elements always drawn at 640x480. |
    | 2     | Location of ECL's (0,0) in late rendering stages | Game elements drawn at full res (e.g. boss HP). |

    **If your sprite is correctly positioned at 640x480 resolution but not at larger resolutions,
    you may want to check this setting.** (as well as [ref=anm:resolutionMode])
    [/tiphide]

    Typically, [ref=anm:layer] will automatically set this to a good default.
    [wip]Clear guidelines are not yet known for when you are required to override that default.[/wip]

    [tiphide]
    This only has an effect on root animations. (for child animations, the origin is always the parent's position)
    [/tiphide]
  `},
  'resolutionMode': {
    sig: 'S', args: ['n'], wip: 1, desc: `
    Determines how certain aspects of the game are scaled to the current resolution.

    [c=red]TODO: details[/c]

    Typically, [ref=anm:layer] will automatically set this to a good default.
    [wip]Clear guidelines are not yet known for when you are required to override that default.[/wip]

    [tiphide]
    **If your sprite is correctly positioned at 640x480 resolution but not at larger resolutions,
    you may want to check this setting.** (as well as [ref=anm:originMode])
    [/tiphide]
  `},
});

// ==================
// ==== DA BASICS ===
// ==================
Object.assign(ANM_INS_DATA, {
  'pos': {
    sig: 'fff', args: ['x', 'y', 'z'], desc: `
    Sets the position of the animation.

    [tiphide]
    Believe it or not, even this instruction still has some mysteries!
    There is a bit flag that, when activated, causes [ref=anm:pos] to write to a *different* vector.
    These two vectors are typically added together at the end, like ECL's absolute and relative positions.
    [wip]The method of setting this bitflag, and its purpose, is unknown.[/wip]
    [/tiphide]
  `},
  'rotate': {
    sig: 'fff', args: ['rx', 'ry', 'rz'], desc: `
    Set the animation's rotation.  For 2D objects, only the z rotation matters.
    [tiphide]
    In some rare cases, x rotation has a special meaning for special drawing instructions.
    Animations rotate around their anchor point (see [ref=anm:anchor]).

    (if nothing seems to be happening when you call this, check your [ref=anm:renderMode] setting!)
    [/tiphide]
  `},
  'rotateAuto': {
    sig: 'b', args: ['mode'], desc: `
    Sets the auto-rotate flag, which causes sprites to rotate to face their direction of motion.
  `},
  'rotationSystem': {
    sig: 'S', args: ['mode'], desc: `
    Sets the conventions for 3D rotation (e.g. XYZ, ZYX, etc.).
    [wip]TODO: Define the modes.[/wip]
  `},
  'scale': {
    sig: 'ff', args: ['sx', 'sy'], desc: `
    Scales the ANM independently along the x and y axis.
    Animations grow around their anchor point (see [ref=anm:anchor]).
    Some special drawing instructions give the x and y scales special meaning.
  `},
  'scale2': {
    sig: 'ff', args: ['sx', 'sy'], desc: `
    *As far as we know,* this is just an extra set of scale factors that apply separately (multiplicatively)
    to [ref=anm:scale].

    All special drawing instructions ignore this (which is a shame, because it means you still can't
    draw ellipses...).
  `},
  'rgb': {
    sig: 'SSS', args: ['r', 'g', 'b'], desc: `
    Set a color which gets blended with this sprite.
    Set white (255, 255, 255) to eliminate the effect.

    ([wip]what's the blend operation?[/wip] Probably multiply, since white is the identity...)
  `},
  'alpha': {
    sig: 'S', args: ['alpha'], desc: `
    Set alpha (opacity) to a value 0-255.
  `},
  // TODO: link special drawing instructions
  'rgb2': {
    sig: 'SSS', args: ['r', 'g', 'b'], desc: `
    Set a second color for gradients.  Gradients are used by certain special drawing instructions, and can be enabled
    on regular sprites using [ref=anm:colorMode].
  `},
  'alpha2': {sig: 'S', args: ['alpha'], desc: `
    Set a second alpha for gradients.  Gradients are used by certain special drawing instructions, and can be enabled
    on regular sprites using [ref=anm:colorMode].
  `},
  'colorMode': {
    sig: 'S', args: ['mode'], desc: `
    Lets you enable gradients on regular sprites.

    [tiphide]
    | Value | Effect |
    |  ---  |   ---  |
    |   0   | Only use color set by [ref=anm:rgb] and [ref=anm:alpha]. |
    |   1   | Only use color set by [ref=anm:rgb2] and [ref=anm:alpha2]. |
    |   2   | Horizontal gradient. |
    |   3   | Vertical gradient. |

    This has no effect on special drawing instructions.

    For some strange reason, [ref=anm:rgb2Time] and [ref=anm:alpha2Time] automatically do [ref-notip=anm:colorMode](1).
    Therefore, if you use those instructions, you must call this *afterwards,* not before.
    [/tiphide]
  `},
  'angleVel': {sig: 'fff', args: ['ωx', 'ωy', 'ωz'], desc: `Set a constant angular velocity, in radians per frame.`},
  'scaleGrowth': {sig: 'ff', args: ['gx', 'gy'], desc: `
    Every frame, it increases the values of [ref=anm:scale] as \`sx -> sx + gx\` and \`sy -> sy + gy\`.
    Basically, [ref=anm:scaleGrowth] is to [ref=anm:scale] as [ref=anm:angleVel] is to [ref=anm:rotate].
    (they even share implemenation details...)
  `},
  // TODO: link to texture coordinates concept
  'uVel': {sig: 'f', args: ['vel'], desc: `
    Add %1 to the texture u coordinate every frame (in units of \`1 / total_image_width\`),
    causing the displayed sprite to scroll horizontally through the image file.
  `},
  'vVel': {sig: 'f', args: ['vel'], desc: `
    Add %1 to the texture v coordinate every frame (in units of \`1 / total_image_height\`),
    causing the displayed sprite to scroll vertically through the image file.
  `},
  'uvScale': {sig: 'ff', args: ['uscale', 'vscale'], desc: "Scales texture uv coordinates. [wip]TODO: link to uv tutorial[/wip]"},
  'anchor': {sig: 'ss', args: ['h', 'v'], desc: `
    Set the horizontal and vertical anchoring of the sprite.  Notice the args are each two bytes.
    For further fine-tuning see [ref=anm:anchorOffset].

    [tiphide]
    | Args  |  0     |  1   | 2      |
    | ---   | ---    | ---  | ---    |
    |  %1   | Center | Left | Right  |
    |  %2   | Center | Top  | Bottom |
    [/tiphide]
  `},
  'anchorOffset': {sig: 'ss', args: ['dx', 'dy'], desc: `
    Nudge the anchor point of the sprite right by %1 pixels and down by %2 pixels in the source image.
    The anchor position serves as the center point for rotation and scaling.

    [wip]TODO: image[/wip]
  `},
});

// more timely basics
Object.assign(ANM_INS_DATA, {
  'posTime': {sig: 'SSfff', args: ['t', 'mode', 'x', 'y', 'z'], desc: `Over the next %1 frames, changes [ref=anm:pos] to the given values using interpolation mode %2.`},
  'rotateTime': {sig: 'SSfff', args: ['t', 'mode', 'rx', 'ry', 'rz'], desc: `Over the next %1 frames, changes [ref=anm:rotate] to the given values using interpolation mode %2.`},
  'scaleTime': {sig: 'SSff', args: ['t', 'mode', 'sx', 'sy'], desc: `Over the next %1 frames, changes [ref=anm:scale] to the given values using interpolation mode %2.`},
  'scale2Time': {sig: 'SSff', args: ['t', 'mode', 'sx', 'sy'], desc: `Over the next %1 frames, changes [ref=anm:scale2] to the given values using interpolation mode %2.`},
  'uvScaleTime': {sig: 'SSff', args: ['t', 'mode', 'uscale', 'vscale'], desc: `Over the next %1 frames, changes [ref=anm:uvScale] to the given values using interpolation mode %2.`},
  'alphaTime': {sig: 'SSS', args: ['t', 'mode', 'alpha'], desc: `Over the next %1 frames, changes [ref=anm:alpha] to the given values using interpolation mode %2.`},
  'alpha2Time': {sig: 'SSS', args: ['t', 'mode', 'alpha'], desc: `
    Over the next %1 frames, changes [ref=anm:alpha2] to the given value using interpolation mode %2.

    [tiphide]For some reason, this also does [ref=anm:colorMode](1), which can be a mild inconvenience.[/tiphide]
  `},
  'rgbTime': {sig: 'SSSSS', args: ['t', 'mode', 'r', 'g', 'b'], desc: `Over the next %1 frames, changes [ref=anm:rgb] to the given value using interpolation mode %2.`},
  'rgb2Time': {sig: 'SSSSS', args: ['t', 'mode', 'r', 'g', 'b'], desc: `
    Over the next %1 frames, changes [ref=anm:rgb2] to the given value using interpolation mode %2.

    [tiphide]For some reason, this also does [ref=anm:colorMode](1), which can be a mild inconvenience.[/tiphide]
  `},
  'uVelTime': {sig: 'SSf', args: ['t', 'mode', 'vel'], wip: 1, desc: `[wip]Based on the code this is clearly a time version of [ref=anm:uVel], but it didn't work when I tested it...[/wip]`},
  'vVelTime': {sig: 'SSf', args: ['t', 'mode', 'vel'], wip: 1, desc: `[wip]Based on the code this is clearly a time version of [ref=anm:vVel], but it didn't work when I tested it...[/wip]`},
  'rotateTime2D': {
    sig: 'SSf', args: ['t', 'mode', 'rz'], desc: `
    A compact version of [ref=anm:rotateTime] that only interpolates the z rotation.

    [tiphide]
    (note: [ref=anm:rotateTime2D] and [ref=anm:rotateTime] are tracked separately, but judging from the code, they **are not** meant
    to be used together and their effects do not stack properly. [wip]somebody test plz[/wip])
    [/tiphide]
  `},
  'alphaTime2': {
    sig: 'SS', args: ['alpha', 'time'], wip: 1, desc: `
    [wip]This is, uh, similar to but different from [ref=anm:alphaTime] somehow.[/wip]
  `},
  'posBezier': {
    sig: 'Sfffffffff', args: ['t', 'x1', 'y1', 'z1', 'x2', 'y2', 'z2', 'x3', 'y3', 'z3'],
    desc: `
    In %1 frames, moves to (%5,%6,%7) using Bezier interpolation.

    <!--
    according to images by @rue#1846 on the zuncode discord it looks like the last two numbers for floatTime mode 8
    are proportional to initial/final velocities; these may correspond to xyz1 and xyz3 but I'm too lazy to verify right now.
    -->
    [wip]I am too lazy to document this right now.[/wip]  [See the chinese wiki](https://thwiki.cc/脚本对照表/ANM/第四世代).
  `},
});

// =================
// ==== DRAWING ====
// =================

// 2D texture circles
Object.assign(ANM_INS_DATA, {
  'textureCircle': {
    sig: 'S', args: ['nmax'], desc: `
    Wraps a texture into a thin ring (annulus).  The argument determines the size of an internal buffer.

    [tiphide]
    First, the texture is repeated an integer number of times along the y axis.
    Then, it is stretched and wrapped into an annular shape as follows:

    * The x-scale from [ref=anm:scale] is the **width** of the annulus (R2-R1).
    * The y-scale is the **radius** of the "middle" of the texture. (0.5*(R1+R2))
    * [ref=anmvar:i0] is the **number of points** to create along this arc section.
    * [ref=anmvar:i1] is the **number of times the texture is repeated**.

    After calling this command you can **change these parameters in real-time** simply by
    modifying [ref=anm:scale], [ref=anmvar:i0] and [ref=anmvar:i1]. Further notes:

    * **[ref=anmvar:i0] MUST be \`<=\` %1 at all times!**
    * For this command, the last point is equal to the first point, so n points makes an (n-1)gon.
    * The repeating of the texture is done in a manner affected by [ref=anm:scrollMode],
      and the sprite is assumed to span the full height of its image file.
    * The image is reversed; use a negative x-scale to make it normal.

    [wip]Out of all five 600-series instructions that contort textures, this instruction is unique in that it
    appears to support gradients whenever [ref=anm:colorMode] is nonzero, but I haven't tested this.[/wip]

    Comparison image of the two-dimensional texture circle instructions in TH17:<br>
    ![600, 601, 602 comparison](./content/anm/img/ins-v8-texCircle.png)
    [/tiphide]
  `},
  'textureArc': {
    sig: 'S', args: ['nmax'], desc: `
    Similar to [ref=anm:textureCircle], but creates an arc segment beginning from an angle of zero and running clockwise.
    In addition to all of the settings [ref=anm:textureCircle], this has one additional parameter:
    * The x rotation from [ref=anm:rotate] defines **the angle subtended by the arc.**

    Note that the shape will always contain [ref=anmvar:i1] full copies of the image. (they stretch and shrink with
    \`rotx\` rather than being cut off).
  `},
  'textureArcEven': {
    sig: 'S', args: ['nmax'], desc: `
    Identical to [ref=anm:textureArc] but awkwardly centered around angle 0 rather than starting at 0.
  `},
  'textureCylinder3D': {
    sig: 'S', args: ['nmax'], desc: `
    Wraps a texture into the 3D surface of a cylindrical section.
    The argument determines the size of an internal buffer.

    [tiphide]
    First, the texture is repeated an integer number of times along the y axis.
    (this is done in a manner affected by [ref=anm:scrollMode],
    and the sprite is assumed to span the full height of its image file).
    Then, it is turned on its side in 3D space, stretched and wrapped into a section
    of a cylinder as follows:

    * [ref=anmvar:f0] is the **total angle** subtended by the arc section.  (\`2PI\` = a full cylinder)
    * [ref=anmvar:f1] is the **height**.
    * [ref=anmvar:f2] is the **radius**.
    * [ref=anmvar:f3] is the **center angle** of the arc section, measured towards +z from the x-axis (see image).
    * [ref=anmvar:i0] is the **number of points** to create along this arc section.  (this MUST be <= the argument %1 at all times!)
    * [ref=anmvar:i1] is the **number of times the texture is repeated**.

    After calling this command you can modify these variables to change the shape in real-time.

    <img src="./content/anm/img/ins-v8-609.png" height="250px">
    [/tiphide]
  `},
  'textureRing3D': {
    sig: 'S', args: ['nmax'], desc: `
    Wraps a texture into a thin ring (annulus) positioned in 3D space (i.e. the stage background).
    The argument determines the size of an internal buffer.

    [tiphide]
    First, the texture is repeated an integer number of times along the y axis.
    (this is done in a manner affected by [ref=anm:scrollMode],
    and the sprite is assumed to span the full height of its image file).
    Then, it is laid flat on the xz-plane in 3D space, and then
    stretched and wrapped into an annular shape as follows:

    * [ref=anmvar:f0] is the **total angle** subtended by the arc section.  (\`2PI\` = a full cylinder)
    * [ref=anmvar:f1] is the **width** of the annulus. (R2 - R1)
    * [ref=anmvar:f2] is the **radius of the "middle"** of the texture.  (1/2 * (R1 + R2))
    * [ref=anmvar:f3] is the **center angle** of the arc section, measured towards +z from the x-axis (see image).
    * [ref=anmvar:i0] is the **number of points** to create along this arc section.  (this MUST be <= the argument %1 at all times!)
    * [ref=anmvar:i1] is the **number of times the texture is repeated**.

    After calling this command you can modify these variables to change the shape in real-time.

    <img src="./content/anm/img/ins-v8-610.png" height="250px">
    [/tiphide]
  `},
});

// Circle-drawing family
Object.assign(ANM_INS_DATA, {
  'drawPoly': {
    sig: 'fS', args: ['radius', 'nInit'], desc: `
    Draws a filled regular n-gon with a gradient going from center to edge.
    [tiphide]
    %2 will be stored in the integer variable [ref=anmvar:i0], where you can change it at any time.
    If you want to change the radius in real-time or from ECL, you can adjust the x-scale from [ref=anm:scale]
    (which gets multiplied into the %1 argument).
    [/tiphide]
  `},
  'drawPolyBorder': {
    sig: 'fS', args: ['radius', 'nInit'], desc: `
    Like [ref=anm:drawPoly] but draws a 1-pixel border. No gradients.
  `},
  'drawRing': {
    sig: 'ffS', args: ['radius', 'thickness', 'nInit'], desc: `
    Draws a filled ring (annulus) with n sides.  No gradients.
    [tiphide]
    %3 is stored in $I0 like [ref=anm:drawPoly] and [ref=anm:drawPolyBorder].
    %1 is mean radius (0.5*(R1+R2)), %2 is (R2 - R1).
    If you want to change the parameters in real-time or from ECL,
    use the [ref=anm:scale] instruction; x-scale is multiplied into radius,
    y-scale is multiplied into thickness.
    [/tiphide]
  `},
});

// Rectangle-drawing family
Object.assign(ANM_INS_DATA, {
  'drawRect': {
    sig: 'ff', args: ['w', 'h'], desc: `
    Draws a filled rectangle with the given dimensions.  No gradients.
    If you want to control the dimensions from ECL, consider passing in \`1.0\` and changing the anm's scale instead.

    [tiphide]
    Image of the rectangle-drawing family of instructions in TH17:<br>
    ![Overview of rectangle-drawing instructions in TH17.](./content/anm/img/ins-v8-drawRect.png)
    [/tiphide]
  `},
  'drawRectGrad': {
    sig: 'ff', args: ['w', 'h'], desc: `
    Same as [ref=anm:drawRect] but supports gradients ([ref=anm:rgb2]), which go from left to right.
  `},
  // TODO: find a way to "collapse" this by default
  'drawRectShadow': {
    sig: 'ff', args: ['w', 'h'], desc: `
    Don't use this.

    [tiphide]
    The implementation does the following:
    1. Draw a rectangle like [ref=anm:drawRect] but of size \`(w+1, h+1)\`, and \`0.5 * alpha\`.
    2. Then draw a rectangle exactly like [ref=anm:drawRect].

    This has the visual effect of creating a 1 pixel "shadow" along two of the edges.
    Unfortunately, WHICH sides have shadows is not well-defined with centered anchoring,
    and the shadow will tend to bounce around in an ugly fashion as the object moves.

    You can force the shadow onto a given side by anchoring the opposite side.
    (this works because both rectangles are drawn with the same position and anchoring)
    [/tiphide]
  `},
  'drawRectShadowGrad': {
    sig: 'ff', args: ['w', 'h'], desc: `
    Same as [ref=anm:drawRect] but supports gradients ([ref=anm:rgb2]), which go from left to right.
  `},
  'drawRectBorder': {
    sig: 'ff', args: ['w', 'h'], desc: `
    Draws a 1-pixel thick outline of a rectangle.  No gradients.

    Just like [ref=anm:drawRect], you can control the dimensions externally using [ref=anm:scale].
    (the border will remain 1 pixel thick even when scaled)
  `},
  'drawLine': {
    sig: 'ff', args: ['len', 'unused'], desc: `
    Draws a 1-pixel thick horizontal line.  The second argument is unused.  No gradients.

    If you want to change its direction, you must use [ref=anm:rotate].
  `},
});

// ============================
// ==== WEIRD-ASS NONSENSE ====
// ============================
Object.assign(ANM_INS_DATA, {
  'v8-418': {
    sig: '', args: [], wip: 1, desc: `
    A bizarre and **unused** (?) instruction that appears to select a new sprite in the image file based on the anm's coordinates.

    [tiphide]
    The code appears to do the following: [wip](expect inaccuracies!)[/wip]
    * Using the current position, scale, etc. and [ref=anm:renderMode] setting (which must be \`<= 3\`),
      compute the corners of the rectangle that the ANM would occupy on the surface it is being drawn to.
    * Divide each corner's coords by 640x480 (regardless of resolution or original image size).
    * Use those as fractional uv coordinates for a region to pull sprite data from.

    Presumably this lets you do weird things like use a rotated region of a .png file as a sprite.
    [/tiphide]
  `},
  'copyParentVars': {
    sig: '', args: [], desc: `
    When called on a child animation, copies over a number of variables from its parent.

    [tiphide]
    [headless-table]
    | | | | |
    | --- | --- | --- | --- |
    | [ref=anmvar:i0] | [ref=anmvar:f0] | [ref=anmvar:i4]             | [ref=anmvar:rand-param-int] |
    | [ref=anmvar:i1] | [ref=anmvar:f1] | [ref=anmvar:i5]             | [ref=anmvar:mystery-angle-x]  |
    | [ref=anmvar:i2] | [ref=anmvar:f2] | [ref=anmvar:rand-param-one] | [ref=anmvar:mystery-angle-y]  |
    | [ref=anmvar:i3] | [ref=anmvar:f3] | [ref=anmvar:rand-param-pi]  | [ref=anmvar:mystery-angle-z]  |
    [/headless-table]

    [wip](example use case? the game uses it a lot...)[/wip]

    ![copyParentVars demonstration](./content/anm/img/ins-v8-509.gif)
    [/tiphide]
  `},
});

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

  value.desc = dedent(value.desc);

  if (value.wip) value.problems.push('docs');
}
