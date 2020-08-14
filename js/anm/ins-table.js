import dedent from "../lib/dedent.js";

export const UNASSIGNED = {ref: null, wip: 2};
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

// ---- V7 ----
const INS_12 = {
  63: {ref: 'anm:stop'},
  67: {ref: 'anm:type'},
  68: {ref: 'anm:layer'},
  69: {ref: 'anm:stop2'},
  81: {ref: 'anm:caseReturn'},
  106: {ref: 'anm:scaleUV', wip: 1},
  102: {ref: 'anm:drawRect', wip: 1},
};

// ---- V8 ----
const INS_13 = {
  0: {ref: 'anm:nop'},
  1: {ref: 'anm:delete'},
  2: {ref: 'anm:static'},
  3: {ref: 'anm:stop'},
  4: {ref: 'anm:stop2'},
  5: {ref: 'anm:case'},
  6: {ref: 'anm:wait'},
  7: {ref: 'anm:caseReturn'},

  100: {ref: 'anm:set'},
  101: {ref: 'anm:setF'},
  102: {ref: 'anm:add'},
  103: {ref: 'anm:addF'},
  104: {ref: 'anm:sub'},
  105: {ref: 'anm:subF'},
  106: {ref: 'anm:mul'},
  107: {ref: 'anm:mulF'},
  108: {ref: 'anm:div'},
  109: {ref: 'anm:divF'},
  110: {ref: 'anm:mod'},
  111: {ref: 'anm:modF'},
  112: {ref: 'anm:add3'},
  113: {ref: 'anm:addF3'},
  114: {ref: 'anm:sub3'},
  115: {ref: 'anm:subF3'},
  116: {ref: 'anm:mul3'},
  117: {ref: 'anm:mulF3'},
  118: {ref: 'anm:div3'},
  119: {ref: 'anm:divF3'},
  120: {ref: 'anm:mod3'},
  121: {ref: 'anm:modF3'},
  122: {ref: 'anm:rand'},
  123: {ref: 'anm:randF'},
  124: {ref: 'anm:mathSin'},
  125: {ref: 'anm:mathCos'},
  126: {ref: 'anm:mathTan'},
  127: {ref: 'anm:mathAcos'},
  128: {ref: 'anm:mathAtan'},
  129: {ref: 'anm:mathReduceAngle'},
  130: {ref: 'anm:mathCirclePos'},
  131: {ref: 'anm:mathCirclePosRand'},

  200: {ref: 'anm:jmp'},
  201: {ref: 'anm:jmpDec'},
  202: {ref: 'anm:jmpEq'},
  203: {ref: 'anm:jmpEqF'},
  204: {ref: 'anm:jmpNe'},
  205: {ref: 'anm:jmpNeF'},
  206: {ref: 'anm:jmpLt'},
  207: {ref: 'anm:jmpLtF'},
  208: {ref: 'anm:jmpLe'},
  209: {ref: 'anm:jmpLeF'},
  210: {ref: 'anm:jmpGt'},
  211: {ref: 'anm:jmpGtF'},
  212: {ref: 'anm:jmpGe'},
  213: {ref: 'anm:jmpGeF'},

  300: {ref: 'anm:sprite'},
  301: {ref: 'anm:spriteRand'},
  302: {ref: 'anm:renderMode'},
  303: {ref: 'anm:blendMode'},
  304: {ref: 'anm:layer'},
  305: {ref: 'anm:noZBuffer'},
  306: {ref: 'anm:v8-306'},
  307: {ref: 'anm:v8-flag-307'},
  308: {ref: 'anm:flipX'},
  309: {ref: 'anm:flipY'},
  310: {ref: 'anm:v8-flag-310'},
  311: {ref: 'anm:resampleMode'},
  312: {ref: 'anm:scrollMode'},

  400: {ref: 'anm:pos'},
  401: {ref: 'anm:rotate'},
  402: {ref: 'anm:scale'},
  403: {ref: 'anm:alpha'},
  404: {ref: 'anm:rgb'},
  405: {ref: 'anm:alpha2'},
  406: {ref: 'anm:rgb2'},
  407: {ref: 'anm:posTime'},
  408: {ref: 'anm:rgbTime'},
  409: {ref: 'anm:alphaTime'},
  410: {ref: 'anm:rotateTime'},
  411: {ref: 'anm:rotateTime2D'},
  412: {ref: 'anm:scaleTime'},
  413: {ref: 'anm:rgb2Time'},
  414: {ref: 'anm:alpha2Time'},
  415: {ref: 'anm:angleVel'},
  416: {ref: 'anm:scaleGrowth'},
  417: {ref: 'anm:alphaTime2'},
  418: {ref: 'anm:v8-418'},
  419: {ref: 'anm:v8-flag-419'},
  420: {ref: 'anm:posBezier'},
  421: {ref: 'anm:anchor'},
  422: {ref: 'anm:posAdopt'},
  423: {ref: 'anm:colorMode'},
  424: {ref: 'anm:rotateAuto'},
  425: {ref: 'anm:uVel'},
  426: {ref: 'anm:vVel'},
  427: {ref: 'anm:uVelTime'},
  428: {ref: 'anm:vVelTime'},
  429: {ref: 'anm:uvScale'},
  430: {ref: 'anm:uvScaleTime'},
  431: {ref: 'anm:v8-flag-431'},
  432: {ref: 'anm:v8-flag-432'},
  433: {ref: 'anm:posTime2D'},
  434: {ref: 'anm:scale2'},
  435: {ref: 'anm:scale2Time'},
  436: {ref: 'anm:anchorOffset'},
  437: {ref: 'anm:rotationSystem'},
  438: {ref: 'anm:originMode'},

  500: {ref: 'anm:createChild'},
  501: {ref: 'anm:prependChild'},
  502: {ref: 'anm:createChildUi'},
  503: {ref: 'anm:prependChildUi'},
  504: {ref: 'anm:create-504'},
  505: {ref: 'anm:create-505'},
  506: {ref: 'anm:create-506'},
  507: {ref: 'anm:ignoreParent'},
  508: {ref: 'anm:createEffect'},

  600: {ref: 'anm:textureCircle'},
  601: {ref: 'anm:textureArcEven'},
  602: {ref: 'anm:textureArc'},
  603: {ref: 'anm:drawRect'},
  604: {ref: 'anm:drawPoly'},
  605: {ref: 'anm:drawPolyBorder'},
  606: {ref: 'anm:drawRectGrad'},
  607: {ref: 'anm:drawRectShadow'},
  608: {ref: 'anm:drawRectShadowGrad'},
};

const INS_14 = Object.assign({}, INS_13, {
  313: {ref: 'anm:resolutionMode'},
  314: {ref: 'anm:attached'},
  315: {ref: 'anm:colorizeChildren'},
  509: {ref: 'anm:copyParentVars'},
  609: {ref: 'anm:textureCylinder3D'},
  610: {ref: 'anm:textureRing3D'},
});

const INS_15 = Object.assign({}, INS_14, {
  316: {ref: 'anm:v8-flag-316'},
  317: {ref: 'anm:v8-flag-317'},
  611: {ref: 'anm:drawRing'},
});

const INS_16 = Object.assign({}, INS_15, {
  612: {ref: 'anm:drawRectBorder'},
  613: {ref: 'anm:drawLine'},
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

// ==========================================================================
// ==========================================================================
// ==================    REVERSE LOOKUP TABLE     ===========================

// This table gets an opcode from a ref, so that the name can be looked up in an eclmap.

export const ANM_OPCODE_REVERSE = {};
for (const [game, inner] of Object.entries(ANM_BY_OPCODE)) {
  ANM_OPCODE_REVERSE[game] = {};
  for (const [opcodeStr, {ref}] of Object.entries(inner)) {
    if (ref === null) continue; // no associated data entry yet

    if (!ref.startsWith('anm:')) {
      window.console.error(`wrong prefix in anm lookup table: (game ${game}, opcode ${opcodeStr}): ${ref}`);
      continue;
    }

    const opcode = parseInt(opcodeStr, 10);
    if (Number.isNaN(opcode)) {
      window.console.error(`bad opcode: (game ${game}, opcode ${opcodeStr})`);
      continue;
    }
    ANM_OPCODE_REVERSE[game][ref] = opcode;
  }
}

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
  'static': {
    sig: '', args: [], desc: `
    Freezes the animation until it is destroyed externally.

    [tiphide]
    Any interpolation instructions like [ref=anm:posTime] will no longer advance.
    No [ref=anm:case] labels will run.
    [/tiphide]
  `},
  'stop': {sig: '', args: [], desc: "Stops executing the script and waits for a switch to occur. (see [ref=anm:case])"},
  'stop2': {sig: '', args: [], wip: 2, desc: "[wip=2]This is [ref=anm:stop] except that it additionally clears an unknown bitflag...[/wip]"},
  'case': {
    sig: 'S', args: ['n'], desc: `
    A label used to externally control an ANM.  You can read more about this on the [ANM concepts page](#anm/concepts&a=switch).

    [tiphide]Mind that this instruction only acts as a label. When executed, it does nothing. (it is a no-op)[/tiphide]
  `},
  'wait': {sig: 'S', args: ['t'], desc: `Wait \`t\` frames.`},
  'caseReturn': {sig: '', args: [], wip: 1, desc: `
    Used at the end of a [ref=anm:case] to return back to the moment just before it
    last executed the [ref=anm:stop] instruction.

    [tiphide]
    The difference between this and simply executing [ref=anm:stop] again is that it
    restores the original time as well.

    [wip=1]Example use case?[/wip]
    [/tiphide]
  `},
});

// =====================
// ==== OPS N JUMPS ====
// =====================
Object.assign(ANM_INS_DATA, {
  'jmp': {
    sig: 'SS', args: ['dest', 't'], desc: `
    Jumps to byte offset \`dest\` from the script's beginning and sets the time to \`t\`.
    \`thanm\` accepts a label name for \`dest\`.

    [tiphide]
    [wip=2]Chinese wiki says some confusing recommendation about setting a=0, can someone explain to me?[/wip]
    [/tiphide]
  `},
  'jmpDec': {
    sig: '$SS', args: ['x', 'dest', 't'], desc: `
    Decrement \`x\` and then jump if \`x > 0\`.  You can use this to repeat a loop a fixed number of times.

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

Object.assign(ANM_INS_DATA, {
  'rand': {sig: '$S', args: ['x', 'n'], desc: 'Draw a random integer `0 <= x < n` using the [animation RNG](#anm/concepts&a=rng).'},
  'randF': {sig: '%f', args: ['x', 'r'], desc: 'Draw a random float `0 <= x <= r` using the [animation RNG](#anm/concepts&a=rng).'},

  'mathSin': {sig: '%f', args: ['dest', 'θ'], desc: 'Compute `sin(θ)` (`θ` in radians).'},
  'mathCos': {sig: '%f', args: ['dest', 'θ'], desc: 'Compute `cos(θ)` (`θ` in radians).'},
  'mathTan': {sig: '%f', args: ['dest', 'θ'], desc: 'Compute `tan(θ)` (`θ` in radians).'},
  'mathAcos': {sig: '%f', args: ['dest', 'x'], desc: 'Compute `acos(x)` (output in radians).'},
  'mathAtan': {sig: '%f', args: ['dest', 'm'], desc: 'Compute `atan(m)` (output in radians).'},
  'mathReduceAngle': {sig: '%', args: ['θ'], desc: 'Reduce an angle modulo `2*PI` into the range `[-PI, +PI]`.'},
  'mathCirclePos': {sig: '%%ff', args: ['x', 'y', 'θ', 'r'], desc: '`x = r*cos(θ);`<br>`y = r*sin(θ);`'},
  'mathCirclePosRand': {
    sig: '%%ff', args: ['x', 'y', 'rmin', 'rmax'], desc: `
    Uniformly draws a random radius \`r\` in the interval given by \`rmin\` and \`rmax\`, and picks a random angle
    (both using the [animation RNG](#anm/concepts&a=rng)).
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
    [tiphide]
    A value of \`-1\` means to not use an image (this is frequently used with [special drawing instructions](#anm/ins&a=group-600)).
    thanm also lets you use the sprite's name instead of an index.

    [wip=2]Under some unknown conditions, these sprite indices are transformed by a "sprite-mapping"
    function; e.g. many bullet scripts use false indices, presumably to avoid repeating the same script
    for 16 different colors.  The precise mechanism of this is not yet fully understood.[/wip]
    [/tiphide]
  `},
  'spriteRand': {
    sig: 'SS', args: ['a', 'b'], desc: `
    Selects a random sprite from \`a\` (inclusive) to \`a + b\` (exclusive) using the [animation RNG](#anm/concepts&a=rng).
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
    * Mode 1 is for 2D sprites that require rotation around the z-axis. <br>
      [wip]When you activate mode 1, things may suddenly become a bit blurry.  Visually it looks identical to
      mode 2 at zero rotation, but the cause seems different based on the code?[/wip]
    * Mode 8 is for sprites that need to rotate in 3D space.
    * [wip]Mode 2 is like mode 0, but shifts the position by (-0.5, -0.5) pixels, making it appear ever-so-slightly
        larger and blurrier.[/wip]
    * [wip]Any other modes used in scripts are a total mystery at this time.[/wip]
    * Many mode numbers are not intended for use by ANM scripts, and are instead reserved for instructions
      like [ref=anm:textureCircle] and [ref=anm:drawRect] (each one has its own mode).
    [/tiphide]
  `},
  'layer': {
    sig: 'S', args: ['n'], desc: `
    Sets the layer of the ANM.  [tiphide][wip]This may or may not affect z-ordering? It's weird...[/wip][/tiphide]

    [tiphide]
    **Different layer numbers may behave differently!** Each game only has a finite number of layers,
    and certain groups of these layers are drawn at different stages [in the rendering pipeline](#anm/stages-of-rendering).
    Be especially careful when porting something from one game to another, as the layer groupings may have changed.
    [/tiphide]
  `},
  'flipX': {sig: '', args: [], desc: "Toggles mirroring on the x axis.  [wip](sounds straightforward, but which things are affected?[/wip]"},
  'flipY': {sig: '', args: [], desc: "Toggles mirroring on the y axis.  [wip](sounds straightforward, but which things are affected?[/wip]"},
  'resampleMode': {
    sig: 'S', args: ['n'], desc: `
    Determines how a sprite is resampled when scale is greater or less than 1f.

    [tiphide]
    | Mode | D3D constant | Meaning | Layman's terms |
    | ---  | --- | --- | --- |
    | 0    | \`D3DTEXF_LINE\` | linear interpolation | blurry |
    | 1    | \`D3DTEXF_POINT\` | nearest-point sampling | big pixels |

    As an example, Reimu's sprite in [game=14]DDC[/game] uses [ref-notip=anm:resampleMode]\`(1)\`, while her hitbox animation does not.
    Here you can see the effect of enabling it on the hitbox during Shinmyoumaru's survival spell.<br>
    <img src="./content/anm/img/ins-v8-311.png" height="200px">
    [/tiphide]
  `},
  'scrollMode': {
    sig: 'SS', args: ['xmode', 'ymode'], desc: `
    Determines how a sprite pulls image data when an instruction like [ref=anm:uvScale], [ref=anm:uVel],
    or [ref=anm:textureCircle] causes it to pull from [uv coords outside the \`(0,0)-(1,1)\` rectangle](#anm/concepts&a=uv-coords).

    [tiphide]
    | Mode | D3D constant | Meaning |
    | ---  | --- | --- |
    | 0    | \`D3DTADDRESS_WRAP\` | texture repeats infinitely |
    | 1    | \`D3DTADDRESS_CLAMP\` | pixels at the edge extend to infinity |
    | 2    | \`D3DTADDRESS_MIRROR\` | like 0 but every other image is mirrored |
    [/tiphide]
  `},
  'originMode': {
    sig: 'S', args: ['mode'], wip: 1, desc: `
    Determines the origin used by the sprite.

    [tiphide]
    | Value | Origin | Appropriate for |
    | ---   | ---    | --- |
    | 0     | Top left of target surface. | Border around the game. |
    | 1     | Location of ECL's (0, 0) in [rendering stages 1 to 3](#anm/stages-of-rendering&a=stage-1) | Game elements always drawn at 640x480. |
    | 2     | Location of ECL's (0, 0) in [rendering stage 4](#anm/stages-of-rendering&a=stage-4) | Game elements drawn at full res (e.g. boss HP). |

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
    In some rare cases, x rotation has a special meaning for [special drawing instructions](#anm/ins&a=group-600).
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
    Some [special drawing instructions](#anm/ins&a=group-600) give the x and y scales special meaning.
  `},
  'scale2': {
    sig: 'ff', args: ['sx', 'sy'], desc: `
    *As far as we know,* this is just an extra set of scale factors that apply separately (multiplicatively)
    to [ref=anm:scale].

    [tiphide]
    All [special drawing instructions](#anm/ins&a=group-600) ignore this (which is a shame, because it means you still can't
    draw ellipses...).
    [/tiphide]
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
  'rgb2': {
    sig: 'SSS', args: ['r', 'g', 'b'], desc: `
    Set a second color for gradients.  Gradients are used by certain [special drawing instructions](#anm/ins&a=group-600), and can be enabled
    on regular sprites using [ref=anm:colorMode].
  `},
  'alpha2': {
    sig: 'S', args: ['alpha'], desc: `
    Set a second alpha for gradients.  Gradients are used by certain [special drawing instructions](#anm/ins&a=group-600), and can be enabled
    on regular sprites using [ref=anm:colorMode].
  `},
  'colorMode': {
    sig: 'S', args: ['mode'], desc: `
    Lets you enable gradients on regular sprites.

    [tiphide]
    | Value | Effect |
    |  ---  |   ---  |
    |   0   | Only use the color set by [ref=anm:rgb] and [ref=anm:alpha]. |
    |   1   | Only use the color set by [ref=anm:rgb2] and [ref=anm:alpha2]. |
    |   2   | Horizontal gradient. |
    |   3   | Vertical gradient. |

    This has no effect on [special drawing instructions](#anm/ins&a=group-600).

    For some strange reason, [ref=anm:rgb2Time] and [ref=anm:alpha2Time] automatically do [ref-notip=anm:colorMode](1).
    Therefore, if you use those instructions, you must call this *afterwards,* not before.

    **ECL modders beware:** The game may interfere with the use of [ref=anm:rgb2], [ref=anm:alpha2] and [ref=anm:colorMode]
    on the VM in slot 0 of an enemy, because it uses them to make enemies blink when they take damage.
    [/tiphide]
  `},
  'colorizeChildren': {
    sig: 'b', args: ['enable'], desc: `
    Sets a bitflag that causes colorization (see [ref=anm:rgb]) to affect children as well.

    [tiphide]
    The game uses this on yin-yang orb enemies to ensure that their satellites also flash on damage taken.
    In the following image, the damage flash was significantly exaggerated to make the difference easy to see.

    <img src="content/anm/img/ins-colorize-children.png">

    Notes:
    * Must be called *before* the children are created. (the bitflag is copied on child creation)
    * Not supported by [special drawing instructions](#anm/ins&a=group-600).
    * Both parent and child must not be using gradients (i.e. they must have [ref=anm:colorMode] 0 or 1).
    [/tiphide]
  `},
  'angleVel': {sig: 'fff', args: ['ωx', 'ωy', 'ωz'], desc: `Set a constant angular velocity, in radians per frame.`},
  'scaleGrowth': {sig: 'ff', args: ['gx', 'gy'], desc: `
    Every frame, it increases the values of [ref=anm:scale] as \`sx -> sx + gx\` and \`sy -> sy + gy\`.
    Basically, [ref-notip=anm:scaleGrowth] is to [ref=anm:scale] as [ref=anm:angleVel] is to [ref=anm:rotate].
    (they even share implemenation details...)
  `},
  'uVel': {sig: 'f', args: ['vel'], desc: `
    Add \`vel\` to the [texture u coordinate](#anm/concepts&a=uv-coords) every frame (in units of \`1 / total_image_width\`),
    causing the displayed sprite to scroll horizontally through the image file.

    [tiphide]
    This image shows [ref=anm:uVel] used with a negative argument:

    <img src="content/anm/img/ins-u-vel.gif">
    [/tiphide]
  `},
  'vVel': {sig: 'f', args: ['vel'], desc: `
    Add \`vel\` to the [texture v coordinate](#anm/concepts&a=uv-coords) every frame (in units of \`1 / total_image_height\`),
    causing the displayed sprite to scroll vertically through the image file.
  `},
  'uvScale': {sig: 'ff', args: ['uscale', 'vscale'], desc: `
    Scales [texture uv coordinates](#anm/concepts&a=uv-coords).  [tiphide]Values greater than 1 means that a larger
    region of the texture (spritesheet) is shown.  Typically used to make a texture repeat multiple times, but you
    can also use [ref=anm:scrollMode] to change what happens.
    [/tiphide]

    [tiphide]
    Here is a demonstration using [ref=anm:uvScaleTime] to change \`uscale\` to 3 on the left,
    and \`vscale\` to 3 on the right.  (in this case, the sprite occupies the full texture)

    <img src="content/anm/img/ins-uv-scale.gif" height="200px">
    [/tiphide]
  `},
  'anchor': {sig: 'ss', args: ['h', 'v'], desc: `
    Set the horizontal and vertical anchoring of the sprite.  Notice the args are each two bytes.
    For further fine-tuning see [ref=anm:anchorOffset].

    [tiphide]
    | Args  |  0     |  1   | 2      |
    | ---   | ---    | ---  | ---    |
    | \`h\` | Center | Left | Right  |
    | \`v\` | Center | Top  | Bottom |
    [/tiphide]
  `},
  'anchorOffset': {sig: 'SS', args: ['dx', 'dy'], desc: `
    Nudge the anchor point of the sprite right by \`dx\` pixels and down by \`dy\` pixels in the source image.
    Important for asymmetric bullet sprites because the anchor position is the center point for rotation and scaling.

    [tiphide]
    In the image below, both hearts are rotating using [ref=anm:angleVel]\`(0f, 0f, rad(3))\`,
    but the pink heart additionally has:

    [code]
      [ref=anm:anchor](1, 1);
      [ref=anm:anchorOffset](9.5f, 25f);
    [/code]

    ![anchorOffset demo](./content/anm/img/ins-v8-436.gif)
    [/tiphide]
  `},
});

// more timely basics
Object.assign(ANM_INS_DATA, {
  'posTime': {sig: 'SSfff', args: ['t', 'mode', 'x', 'y', 'z'], desc: `Over the next \`t\` frames, changes [ref=anm:pos] to the given values using [interpolation mode](#anm/interpolation) \`mode\`.`},
  'rotateTime': {sig: 'SSfff', args: ['t', 'mode', 'rx', 'ry', 'rz'], desc: `Over the next \`t\` frames, changes [ref=anm:rotate] to the given values using [interpolation mode](#anm/interpolation) \`mode\`.`},
  'scaleTime': {sig: 'SSff', args: ['t', 'mode', 'sx', 'sy'], desc: `Over the next \`t\` frames, changes [ref=anm:scale] to the given values using [interpolation mode](#anm/interpolation) \`mode\`.`},
  'scale2Time': {sig: 'SSff', args: ['t', 'mode', 'sx', 'sy'], desc: `Over the next \`t\` frames, changes [ref=anm:scale2] to the given values using [interpolation mode](#anm/interpolation) \`mode\`.`},
  'uvScaleTime': {sig: 'SSff', args: ['t', 'mode', 'uscale', 'vscale'], desc: `Over the next \`t\` frames, changes [ref=anm:uvScale] to the given values using [interpolation mode](#anm/interpolation) \`mode\`.`},
  'alphaTime': {sig: 'SSS', args: ['t', 'mode', 'alpha'], desc: `Over the next \`t\` frames, changes [ref=anm:alpha] to the given values using [interpolation mode](#anm/interpolation) \`mode\`.`},
  'alpha2Time': {sig: 'SSS', args: ['t', 'mode', 'alpha'], desc: `
    Over the next \`t\` frames, changes [ref=anm:alpha2] to the given value using [interpolation mode](#anm/interpolation) \`mode\`.

    [tiphide]For some reason, this also does [ref=anm:colorMode](1), which can be a mild inconvenience.[/tiphide]
  `},
  'rgbTime': {sig: 'SSSSS', args: ['t', 'mode', 'r', 'g', 'b'], desc: `Over the next \`t\` frames, changes [ref=anm:rgb] to the given value using [interpolation mode](#anm/interpolation) \`mode\`.`},
  'rgb2Time': {sig: 'SSSSS', args: ['t', 'mode', 'r', 'g', 'b'], desc: `
    Over the next \`t\` frames, changes [ref=anm:rgb2] to the given value using [interpolation mode](#anm/interpolation) \`mode\`.

    [tiphide]For some reason, this also does [ref=anm:colorMode](1), which can be a mild inconvenience.[/tiphide]
  `},
  'uVelTime': {sig: 'SSf', args: ['t', 'mode', 'vel'], desc: `
    Over the next \`t\` frames, changes [ref=anm:uVel] to the given value using [interpolation mode](#anm/interpolation) \`mode\`.

    [tiphide]
    Remember that [ref=anm:uVel] is scroll *velocity,* not position.
    [/tiphide]
  `},
  'vVelTime': {sig: 'SSf', args: ['t', 'mode', 'vel'], desc: `
    Over the next \`t\` frames, changes [ref=anm:vVel] to the given value using [interpolation mode](#anm/interpolation) \`mode\`.

    [tiphide]
    Remember that [ref=anm:vVel] is scroll *velocity,* not position.
    [/tiphide]
  `},
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
    In \`t\` frames, moves to \`(x2, y2, z2)\` using Bezier interpolation.

    [tiphide]
    * The graphic starts at its current position.
    * \`(x1/t, y1/t, z1/t)\` is the **initial velocity.**
    * \`(x2, y2, z2)\` is the **final position.**
    * \`(x3/t, y3/t, z3/t)\` is the **final velocity.**
    [/tiphide]
  `},
  'posTime2D': {
    sig: 'SSff', args: ['t', 'mode', 'x', 'y'], wip: 1, desc: `
    Looks like a 2D version of [ref=anm:posTime]?  ([wip]Is that all? Seems pointless[/wip])
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

    * **[ref=anmvar:i0] MUST be \`<= nmax\` at all times!**
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
    [tiphide]
    In addition to all of the settings [ref=anm:textureCircle], this has one additional parameter:
    * The x rotation from [ref=anm:rotate] defines **the angle subtended by the arc.**

    Note that the shape will always contain [ref=anmvar:i1] full copies of the image. (they stretch and shrink with
    \`rotx\` rather than being cut off).
    [/tiphide]
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
    * [ref=anmvar:i0] is the **number of points** to create along this arc section.  (this MUST be \`<= nmax\` at all times!)
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
    * [ref=anmvar:i0] is the **number of points** to create along this arc section.  (this MUST be \`<= nmax\` at all times!)
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
    \`nInit\` will be stored in the integer variable [ref=anmvar:i0], where you can change it at any time.
    If you want to change the radius in real-time or from ECL, you can adjust the x-scale from [ref=anm:scale]
    (which gets multiplied into the \`radius\` argument).
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
    \`nInit\` is stored in $I0 like [ref=anm:drawPoly] and [ref=anm:drawPolyBorder].
    \`radius\` is mean radius (0.5*(R1+R2)), \`thickness\` is (R2 - R1).
    If you want to change the parameters in real-time or from ECL,
    use the [ref=anm:scale] instruction; x-scale is multiplied into \`radius\`,
    y-scale is multiplied into \`thickness\`.
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

// ==================
// ==== CHILDREN ====
// ==================
Object.assign(ANM_INS_DATA, {
  'createChild': {
    sig: 'S', args: ['script'], desc: `
    The standard way to create a child animation.  The new VM is inserted at the back of the [world list](#anm/ontick-ondraw).
  `},
  'prependChild': {
    sig: 'S', args: ['script'], wip: 1, desc: `
    Create a child animation, but insert it **at the front** of the [world list](#anm/ontick-ondraw).
  `},
  'createChildUi': {
    sig: 'S', args: ['script'], desc: `
    Create a child animation, but insert it at the back **of the [UI list](#anm/ontick-ondraw)** instead.

    UI ANMs are ticked even while the game is paused.
  `},
  'prependChildUi': {
    sig: 'S', args: ['script'], wip: 1, desc: `
    Create a child animation, but insert it **at the front of the [UI list](#anm/ontick-ondraw)****.
  `},
  'attached': {
    sig: 'S', args: ['enable'], wip: 1, desc: `
    Sets a bitflag.  When the bitflag is enabled, the animation will move as its parent rotates.
    (picture a person holding a shield; as the person rotates, the shield moves around them)

    [wip]Where is it used? Are there other effects?[/wip]
  `},
  'createEffect': {
    sig: 'S', args: ['kind'], wip: 1, desc: `
    Creates a special child animation that may have additional hardcoded behavior.

    [tiphide]
    [wip]Haven't gotten to playing around with this or reverse engineering any of those hardcoded behaviors yet.[/wip]
    [/tiphide]
  `},
  'create-504': {
    sig: 'S', args: ['script'], wip: 2, desc: `
    Creates a child and puts it in the back of the world list (same as [ref=anm:createChild]), but copies more state from the parent than normal.
    [wip]What gets copied? Why?[/wip]
  `},
  'create-505': {
    sig: 'Sff', args: ['script', 'x', 'y'], wip: 2, desc: `
    Creates a child and puts it in the back of the world list (same as [ref=anm:createChild]), and then... welllllll....

    [tiphide]
    [wip]You know that mysterious "alternate position" vector mentioned in the entry for [ref=anm:pos]?
    That's where the \`x\` and \`y\` args get written.  WHAT IS THAT THING[/wip]
    [/tiphide]
  `},
  'create-506': {
    sig: 'Sff', args: ['script', 'x', 'y'], wip: 2, desc: `
    Combines the effects of [ref=anm:create-504] and [ref=anm:create-505].
  `},
  'ignoreParent': {
    sig: 'S', args: ['ignore'], wip: 2, desc: `
    Sets a bitflag.  If the bitflag is 1, then in many different contexts, the ANM will e.g. ignore the
    parent's scale and rotation and it will be allowed to use [ref=anm:originMode] as though it were root, etc.

    [tiphide]
    Completely unused in games with ANM version 8.  Well, it's used, but only by one thing (I think it's the
    copyright logo in TH15-17?) to set [ref-notip=anm:ignoreParent]\`(0)\`, which is unnecessary because
    the flag is already zero by default.
    [/tiphide]
  `},
  'copyParentVars': {
    sig: '', args: [], desc: `
    When called on a child animation, copies over a number of variables from its parent.

    [tiphide]
    They are:
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
  'noZBuffer': {
    sig: 'S', args: ['disable'], wip: 1, desc: `
    If \`disable\` is 1, writing to the z-buffer is disabled.  Otherwise, it is enabled.
    This can matter in cases where z-testing is used to filter writes.
    ([wip]under what conditions are z-testing enabled, anyway?[/wip])
    [wip]This seems strange. Are there other, unknown effects?[/wip]

    [tiphide]
    It is extremely difficult to find examples where this has any noticeable effect,
    but there's an example in stage 4:

    <a href="./content/anm/img/ins-v8-305.png" target="_blank"><img src="./content/anm/img/ins-v8-305.png" style="max-width:100%;"></a>
    [/tiphide]
  `},
  'v8-306': {
    sig: 'S', args: ['enable'], wip: 2, desc: `
    [wip=2]Sets the state of a bitflag.  When this flag is enabled, some unknown vector from the stage background
    camera data is added to some poorly-understood position-related vector on the ANM, for an even more
    unknown purpose.[/wip]
  `},
  'posAdopt': {
    sig: '', args: [], wip: 2, desc: `
    [wip=2]Takes one of the three vectors related to position <!-- the one I used to name true_final_pos... -->,
    copies it into the vector that's normally controlled by [ref=anm:pos], and then zeros out the original vector.[/wip]
  `},
  'v8-flag-307': {sig: 'b', args: ['enable'], wip: 2, desc: `[wip=2]Sets the state of an unknown bitflag.[/wip]`},
  'v8-flag-310': {sig: 'b', args: ['enable'], wip: 2, desc: `[wip=2]Sets the state of an unknown bitflag.[/wip]`},
  'v8-flag-316': {sig: '', args: [], wip: 2, desc: `[wip=2]Enables an unknown bitflag. Clear with [ref=anm:v8-flag-317].[/wip]`},
  'v8-flag-317': {sig: '', args: [], wip: 2, desc: `[wip=2]Clears the bitflag from [ref=anm:v8-flag-316].[/wip]`},
  'v8-flag-419': {sig: 'S', args: ['enable'], wip: 2, desc: `[wip=2]Sets the state of an unknown bitflag.[/wip]`},
  'v8-flag-431': {sig: 'S', args: ['enable'], wip: 2, desc: `[wip=2]Sets the state of an unknown bitflag.[/wip]`},
  'v8-flag-432': {sig: 'S', args: ['enable'], wip: 2, desc: `[wip=2]Sets the state of an unknown bitflag.[/wip]`},
});

// Validate
for (const [key, value] of Object.entries(ANM_INS_DATA)) {
  value.wip = value.wip || 0;
  if (value.desc === undefined) window.console.error(`TABLE CORRUPT: anm ref ${key} has no 'desc'`);
  if (value.sig === undefined) window.console.error(`TABLE CORRUPT: anm ref ${key} has no 'sig'`);
  if (value.sig != null && value.args === undefined) window.console.error(`TABLE CORRUPT: anm ref ${key} has no 'args'`);
  if (value.sig && value.sig.length !== value.args.length) {
    window.console.error(`TABLE CORRUPT: anm ref ${key} has arg count mismatch`);
  }

  // automatically remove tips from self-references
  const re = new RegExp(`\\[ref=anm:${key}\\]`, 'g');
  value.desc = value.desc.replace(re, `[tip=YOU ARE HERE][ref-notip=anm:${key}][/tip]`);

  value.desc = dedent(value.desc);
}