import dedent from "../lib/dedent.js";

// ==========================================================================
// ==========================================================================
// ===================    LOOKUP TABLE BY OPCODE    =========================

const VARS_14 = {
  10000: {ref: 'anmvar:i0'},
  10001: {ref: 'anmvar:i1'},
  10002: {ref: 'anmvar:i2'},
  10003: {ref: 'anmvar:i3'},
  10004: {ref: 'anmvar:f0'},
  10005: {ref: 'anmvar:f1'},
  10006: {ref: 'anmvar:f2'},
  10007: {ref: 'anmvar:f3'},
  10008: {ref: 'anmvar:i4'},
  10009: {ref: 'anmvar:i5'},
  10010: {ref: 'anmvar:randrad'},
  10011: {ref: 'anmvar:randf-01'},
  10012: {ref: 'anmvar:randf-11'},
  10013: {ref: 'anmvar:pos-x'},
  10014: {ref: 'anmvar:pos-y'},
  10015: {ref: 'anmvar:pos-z'},
  10016: {ref: 'anmvar:camera-x'},
  10017: {ref: 'anmvar:camera-y'},
  10018: {ref: 'anmvar:camera-z'},
  10019: {ref: 'anmvar:lookat-x'},
  10020: {ref: 'anmvar:lookat-y'},
  10021: {ref: 'anmvar:lookat-z'},
  10022: {ref: 'anmvar:rand'},
  10023: {ref: 'anmvar:rot-x'},
  10024: {ref: 'anmvar:rot-y'},
  10025: {ref: 'anmvar:rot-z'},
  10026: {ref: 'anmvar:rot-z-effective'},
  10027: {ref: 'anmvar:rand-param-one'},
  10028: {ref: 'anmvar:rand-param-pi'},
  10029: {ref: 'anmvar:rand-param-int'},
  10030: {ref: 'anmvar:randrad-replay'},
  10031: {ref: 'anmvar:randf-01-replay'},
  10032: {ref: 'anmvar:randf-11-replay'},
  10033: {ref: 'anmvar:mystery-angle-x'},
  10034: {ref: 'anmvar:mystery-angle-y'},
  10035: {ref: 'anmvar:mystery-angle-z'},
};

export const ANM_VARS_BY_NUMBER = {
  // TODO: point games as e.g. "125"
  "14": VARS_14,
  // basically nothing has been added since then...
  "15": VARS_14,
  "16": VARS_14,
  "17": VARS_14,
};

// Var table cannot have entries without refs because we need the type to generate the default name...
for (const [game, inner] of Object.entries(ANM_VARS_BY_NUMBER)) {
  for (const [num, entry] of Object.entries(inner)) {
    if (entry.ref == null) {
      window.console.error(`TABLE CORRUPT: anm var (game ${game}, num ${num}) has no crossref!`)
    }
  }
}

// ==========================================================================
// ==========================================================================
// =====================    INSTRUCTION DATA    =============================

// Lookup table by ref id. (game-independent, anmmap-independent name)
export const ANM_VAR_DATA = {};

Object.assign(ANM_VAR_DATA, {
  'i0': {type: '$', mut: true, desc: `General purpose local integer register 0.`},
  'i1': {type: '$', mut: true, desc: `General purpose local integer register 1.`},
  'i2': {type: '$', mut: true, desc: `General purpose local integer register 2.`},
  'i3': {type: '$', mut: true, desc: `General purpose local integer register 3.`},
  'f0': {type: '%', mut: true, desc: `General purpose local floating-point register 0.`},
  'f1': {type: '%', mut: true, desc: `General purpose local floating-point register 1.`},
  'f2': {type: '%', mut: true, desc: `General purpose local floating-point register 2.`},
  'f3': {type: '%', mut: true, desc: `General purpose local floating-point register 3.`},
  'i4': {type: '$', mut: true, wip: 1, desc: `[wip]Another general-purpose int? (#4)[/wip]`},
  'i5': {type: '$', mut: true, wip: 1, desc: `[wip]Another general-purpose int? (#5)[/wip]`},

  'randrad': {type: '%', mut: false, desc: `Draws a random value from \`-PI\` to \`PI\` using the animation RNG.  You can modify this range by editing [ref=anmvar:rand-param-pi].`},
  'randf-01': {type: '%', mut: false, desc: `Draws a random value from \`0.0\` to \`1.0\` using the animation RNG.  You can modify this range by editing [ref=anmvar:rand-param-one].`},
  'randf-11': {type: '%', mut: false, desc: `Draws a random value from \`-1.0\` to \`1.0\` using the animation RNG.  You can modify this range by editing [ref=anmvar:rand-param-one].`},
  'rand': {
    type: '$', mut: false, desc: `
    Draws a random integer from 0 (inclusive) to 65536 (exclusive) using the animation RNG.
    You can modify this range by editing [ref=anmvar:rand-param-int].
  `},
  'rand-param-one': {type: '%', mut: true, desc: `Scale factor for [ref=anmvar:randf-01] and [ref=anmvar:randf-11]. Defaults to \`1.0\`.`},
  'rand-param-pi': {type: '%', mut: true, desc: `Scale factor for [ref=anmvar:randrad].  Defaults to \`PI\`.`},
  'rand-param-int': {type: '$', mut: true, desc: `Modulus for [ref=anmvar:rand].  Defaults to 65536.`},
  'randrad-replay': {type: '%', mut: false, desc: `Variant of [ref=anmvar:randrad] that uses the replay RNG.`},
  'randf-01-replay': {type: '%', mut: false, desc: `Variant of [ref=anmvar:randf-01] that uses the replay RNG.`},
  'randf-11-replay': {type: '%', mut: false, desc: `Variant of [ref=anmvar:randf-11] that uses the replay RNG.`},

  'pos-x': {type: '%', mut: true, desc: `Position x, as set by [ref=anm:pos].`},
  'pos-y': {type: '%', mut: true, desc: `Position y, as set by [ref=anm:pos].`},
  'pos-z': {type: '%', mut: true, desc: `Position z, as set by [ref=anm:pos].`},
  'rot-x': {type: '%', mut: true, desc: `x-axis rotation, as set by [ref=anm:rotate].`},
  'rot-y': {type: '%', mut: true, desc: `y-axis rotation, as set by [ref=anm:rotate].`},
  'rot-z': {type: '%', mut: true, desc: `z-axis rotation, as set by [ref=anm:rotate].`},
  'rot-z-effective': {type: '%', mut: false, desc: `z-axis rotation, including the rotation of the parent.`},
  'mystery-angle-x': {type: '%', mut: true, wip: 2, desc: `[wip]Is somehow related to rotation? Little is known. (x component)[/wip]`},
  'mystery-angle-y': {type: '%', mut: true, wip: 2, desc: `[wip]Is somehow related to rotation? Little is known. (y component)[/wip]`},
  'mystery-angle-z': {type: '%', mut: true, wip: 2, desc: `[wip]Is somehow related to rotation? Little is known. (z component)[/wip]`},

  'camera-x': {type: '%', mut: false, wip: 1, desc: `[wip]Stage BG camera's x position, plus some vector related to its rocking...[/wip]`},
  'camera-y': {type: '%', mut: false, wip: 1, desc: `[wip]Stage BG camera's y position, plus some vector related to its rocking...[/wip]`},
  'camera-z': {type: '%', mut: false, wip: 1, desc: `[wip]Stage BG camera's z position, plus some vector related to its rocking...[/wip]`},
  'lookat-x': {type: '%', mut: false, wip: 1, desc: `x of normalized direction vector that the stage BG camera is facing. [wip](what is it used for?)[/wip]`},
  'lookat-y': {type: '%', mut: false, wip: 1, desc: `y of normalized direction vector that the stage BG camera is facing. [wip](what is it used for?)[/wip]`},
  'lookat-z': {type: '%', mut: false, wip: 1, desc: `z of normalized direction vector that the stage BG camera is facing. [wip](what is it used for?)[/wip]`},
});

// Validate
for (const [id, value] of Object.entries(ANM_VAR_DATA)) {
  value.wip = value.wip || 0;
  if (value.desc === undefined) window.console.error(`TABLE CORRUPT: anmvar id ${id} has no 'desc'`);
  if (value.type === undefined) window.console.error(`TABLE CORRUPT: anmvar id ${id} has no 'type'`);
  if (value.mut === undefined) window.console.error(`TABLE CORRUPT: anmvar id ${id} has no 'mut'`);

  value.desc = dedent(value.desc);
}
