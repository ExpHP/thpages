import dedent from "../lib/dedent.ts";
import {preprocessTrustedMarkdown} from "../markdown.tsx";

// ==========================================================================
// ==========================================================================
// ===================    LOOKUP TABLE BY OPCODE    =========================

/**
 * Table indexed first by game number string, then by var number,
 * producing the crossref associated with that opcode.
 *
 * Iterating the first table should produce games in ascending order.
 * There are NO GUARANTEES about iteration order of variables within a game.
 */
export const ANM_VARS_BY_NUMBER = new Map(); // has to be a map because 'integer' keys defy insertion order

ANM_VARS_BY_NUMBER.set('06', {});
ANM_VARS_BY_NUMBER.set('07', {
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
});

ANM_VARS_BY_NUMBER.set('08', {...ANM_VARS_BY_NUMBER.get('07')});

ANM_VARS_BY_NUMBER.set('09', {...ANM_VARS_BY_NUMBER.get('08'),
  10010: {ref: 'anmvar:v3-randrad'},
  10011: {ref: 'anmvar:v3-randf-01'},
  10012: {ref: 'anmvar:v3-randf-11'},
});

ANM_VARS_BY_NUMBER.set('095', {...ANM_VARS_BY_NUMBER.get('09'),
  // changed descriptions
  10010: {ref: 'anmvar:v4-randrad'},
  10011: {ref: 'anmvar:v4-randf-01'},
  10012: {ref: 'anmvar:v4-randf-11'},
  // new
  10013: {ref: 'anmvar:pos-x'},
  10014: {ref: 'anmvar:pos-y'},
  10015: {ref: 'anmvar:pos-z'},
});

ANM_VARS_BY_NUMBER.set('10', {...ANM_VARS_BY_NUMBER.get('095'),
  10016: {ref: 'anmvar:v4-camera-x'},
  10017: {ref: 'anmvar:v4-camera-y'},
  10018: {ref: 'anmvar:v4-camera-z'},
  10019: {ref: 'anmvar:v4-lookat-x'},
  10020: {ref: 'anmvar:v4-lookat-y'},
  10021: {ref: 'anmvar:v4-lookat-z'},
});

ANM_VARS_BY_NUMBER.set('11', {...ANM_VARS_BY_NUMBER.get('10'),
  10022: {ref: 'anmvar:v4-rand'},
});

ANM_VARS_BY_NUMBER.set('12', {...ANM_VARS_BY_NUMBER.get('11'),
  10023: {ref: 'anmvar:rot-x'},
  10024: {ref: 'anmvar:rot-y'},
  10025: {ref: 'anmvar:rot-z'},
});

ANM_VARS_BY_NUMBER.set('125', {...ANM_VARS_BY_NUMBER.get('12')});
ANM_VARS_BY_NUMBER.set('128', {...ANM_VARS_BY_NUMBER.get('12')});
ANM_VARS_BY_NUMBER.set('13', {...ANM_VARS_BY_NUMBER.get('12'),
  // changed descriptions
  10010: {ref: 'anmvar:randrad'},
  10011: {ref: 'anmvar:randf-01'},
  10012: {ref: 'anmvar:randf-11'},
  10022: {ref: 'anmvar:rand'},

  // uncertain if changed (haven't reversed STD/camera in UFO)
  10016: {ref: 'anmvar:camera-x'},
  10017: {ref: 'anmvar:camera-y'},
  10018: {ref: 'anmvar:camera-z'},
  10019: {ref: 'anmvar:lookat-x'},
  10020: {ref: 'anmvar:lookat-y'},
  10021: {ref: 'anmvar:lookat-z'},

  // new
  10026: {ref: 'anmvar:rot-z-effective'},
  10027: {ref: 'anmvar:rand-param-one'},
  10028: {ref: 'anmvar:rand-param-pi'},
  10029: {ref: 'anmvar:rand-param-int'},
  10030: {ref: 'anmvar:randrad-replay'},
  10031: {ref: 'anmvar:randf-01-replay'},
  10032: {ref: 'anmvar:randf-11-replay'},
});

ANM_VARS_BY_NUMBER.set('14', {...ANM_VARS_BY_NUMBER.get('13'),
  10033: {ref: 'anmvar:mystery-angle-x'},
  10034: {ref: 'anmvar:mystery-angle-y'},
  10035: {ref: 'anmvar:mystery-angle-z'},
});

ANM_VARS_BY_NUMBER.set('143', {...ANM_VARS_BY_NUMBER.get('14')});
ANM_VARS_BY_NUMBER.set('15', {...ANM_VARS_BY_NUMBER.get('143')});
ANM_VARS_BY_NUMBER.set('16', {...ANM_VARS_BY_NUMBER.get('15')});
ANM_VARS_BY_NUMBER.set('165', {...ANM_VARS_BY_NUMBER.get('16')});
ANM_VARS_BY_NUMBER.set('17', {...ANM_VARS_BY_NUMBER.get('165')});
ANM_VARS_BY_NUMBER.set('18', {...ANM_VARS_BY_NUMBER.get('17')});

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
  'i4': {type: '$', mut: true, wip: 1, desc: `:wip[Another general-purpose int? (#4)]`},
  'i5': {type: '$', mut: true, wip: 1, desc: `:wip[Another general-purpose int? (#5)  Strangely, it's only used by photo games.]`},

  // v4 random numbers
  'v3-randrad': {type: '%', mut: false, succ: 'v4-randrad', desc: `Draws a random value from \`-PI\` to \`PI\` using the [replay RNG](#anm/concepts&a=rng).`},
  'v3-randf-01': {type: '%', mut: false, succ: 'v4-randf-01', desc: `Draws a random value from \`0.0\` to \`1.0\` using the [replay RNG](#anm/concepts&a=rng).`},
  'v3-randf-11': {type: '%', mut: false, succ: 'v4-randf-11', desc: `Draws a random value from \`-1.0\` to \`1.0\` using the [replay RNG](#anm/concepts&a=rng).`},
  'v4-randrad': {type: '%', mut: false, succ: 'randrad', desc: `Draws a random value from \`-PI\` to \`PI\` using the selected RNG (see :ref{r=anm:v4-randMode}).`},
  'v4-randf-01': {type: '%', mut: false, succ: 'randf-01', desc: `Draws a random value from \`0.0\` to \`1.0\` using the selected RNG (see :ref{r=anm:v4-randMode}).`},
  'v4-randf-11': {type: '%', mut: false, succ: 'randf-11', desc: `Draws a random value from \`-1.0\` to \`1.0\` using the selected RNG (see :ref{r=anm:v4-randMode}).`},
  'v4-rand': {
    type: '$', mut: false, succ: 'rand', desc: `
    :tipshow[Draws a random integer using the selected RNG (see :ref{r=anm:v4-randMode}).]

    :wip[What's the range?]
    :wip2[My best guess based on the code is that, when read as integer, this generates a uniformly-distributed signed 32-bit integer
    (\`-2**31 to 2**31-1\`), but when read as a float it generates a uniformly-distributed **unsigned** 32-bit integer cast to float.]
  `},

  // v8 random numbers
  'randrad': {type: '%', mut: false, desc: `Draws a random value from \`-PI\` to \`PI\` using the [animation RNG](#anm/concepts&a=rng).  You can modify this range by editing :ref{r=anmvar:rand-param-pi}.`},
  'randf-01': {type: '%', mut: false, desc: `Draws a random value from \`0.0\` to \`1.0\` using the [animation RNG](#anm/concepts&a=rng).  You can modify this range by editing :ref{r=anmvar:rand-param-one}.`},
  'randf-11': {type: '%', mut: false, desc: `Draws a random value from \`-1.0\` to \`1.0\` using the [animation RNG](#anm/concepts&a=rng).  You can modify this range by editing :ref{r=anmvar:rand-param-int}.`},
  'rand': {
    type: '$', mut: false, desc: `
    Draws a random integer from 0 (inclusive) to 65536 (exclusive) using the [animation RNG](#anm/concepts&a=rng).
    You can modify this range by editing :ref{r=anmvar:rand-param-int}.
  `},
  'rand-param-one': {type: '%', mut: true, desc: `Scale factor for :ref{r=anmvar:randf-01} and :ref{r=anmvar:randf-11}. Defaults to \`1.0\`.`},
  'rand-param-pi': {type: '%', mut: true, desc: `Scale factor for :ref{r=anmvar:randrad}.  Defaults to \`PI\`.`},
  'rand-param-int': {type: '$', mut: true, desc: `Modulus for :ref{r=anmvar:rand}.  Defaults to 65536.`},
  'randrad-replay': {type: '%', mut: false, desc: `Variant of :ref{r=anmvar:randrad} that uses the replay RNG.`},
  'randf-01-replay': {type: '%', mut: false, desc: `Variant of :ref{r=anmvar:randf-01} that uses the replay RNG.`},
  'randf-11-replay': {type: '%', mut: false, desc: `Variant of :ref{r=anmvar:randf-11} that uses the replay RNG.`},

  'pos-x': {type: '%', mut: true, desc: `Position x, as set by :ref{r=anm:pos}.`},
  'pos-y': {type: '%', mut: true, desc: `Position y, as set by :ref{r=anm:pos}.`},
  'pos-z': {type: '%', mut: true, desc: `Position z, as set by :ref{r=anm:pos}.`},
  'rot-x': {type: '%', mut: true, desc: `x-axis rotation, as set by :ref{r=anm:rotate}.`},
  'rot-y': {type: '%', mut: true, desc: `y-axis rotation, as set by :ref{r=anm:rotate}.`},
  'rot-z': {type: '%', mut: true, desc: `z-axis rotation, as set by :ref{r=anm:rotate}.`},
  'rot-z-effective': {type: '%', mut: false, desc: `z-axis rotation, including the rotation of the parent.`},
  'mystery-angle-x': {type: '%', mut: true, wip: 2, desc: `:wip[Is somehow related to rotation? Little is known. (x component)]`},
  'mystery-angle-y': {type: '%', mut: true, wip: 2, desc: `:wip[Is somehow related to rotation? Little is known. (y component)]`},
  'mystery-angle-z': {type: '%', mut: true, wip: 2, desc: `:wip[Is somehow related to rotation? Little is known. (z component)]`},

  'camera-x': {type: '%', mut: false, wip: 1, desc: `:wip[Stage BG camera's x position, plus some vector related to its rocking...]`},
  'camera-y': {type: '%', mut: false, wip: 1, desc: `:wip[Stage BG camera's y position, plus some vector related to its rocking...]`},
  'camera-z': {type: '%', mut: false, wip: 1, desc: `:wip[Stage BG camera's z position, plus some vector related to its rocking...]`},
  'lookat-x': {type: '%', mut: false, wip: 1, desc: `x of normalized direction vector that the stage BG camera is facing. :wip[(what is it used for?)]`},
  'lookat-y': {type: '%', mut: false, wip: 1, desc: `y of normalized direction vector that the stage BG camera is facing. :wip[(what is it used for?)]`},
  'lookat-z': {type: '%', mut: false, wip: 1, desc: `z of normalized direction vector that the stage BG camera is facing. :wip[(what is it used for?)]`},

  'v4-camera-x': {type: '%', mut: false, succ: 'camera-x', wip: 1, desc: `:wip2[Probably stage BG camera's y position like in V8. (but no rocking vector is added in V4)]`},
  'v4-camera-y': {type: '%', mut: false, succ: 'camera-y', wip: 1, desc: `:wip2[Probably stage BG camera's y position like in V8. (but no rocking vector is added in V4)]`},
  'v4-camera-z': {type: '%', mut: false, succ: 'camera-z', wip: 1, desc: `:wip2[Probably stage BG camera's z position like in V8. (but no rocking vector is added in V4)]`},
  'v4-lookat-x': {type: '%', mut: false, succ: 'lookat-x', wip: 1, desc: `:wip2[Probably x of normalized direction vector that the stage BG camera is facing, like in V8.]`},
  'v4-lookat-y': {type: '%', mut: false, succ: 'lookat-y', wip: 1, desc: `:wip2[Probably y of normalized direction vector that the stage BG camera is facing, like in V8.]`},
  'v4-lookat-z': {type: '%', mut: false, succ: 'lookat-z', wip: 1, desc: `:wip2[Probably z of normalized direction vector that the stage BG camera is facing, like in V8.]`},
});

// Validate
for (const [id, value] of Object.entries(ANM_VAR_DATA)) {
  value.wip = value.wip || 0;
  if (value.desc === undefined) window.console.error(`TABLE CORRUPT: anmvar id ${id} has no 'desc'`);
  if (value.type === undefined) window.console.error(`TABLE CORRUPT: anmvar id ${id} has no 'type'`);
  if (value.mut === undefined) window.console.error(`TABLE CORRUPT: anmvar id ${id} has no 'mut'`);

  value.desc = preprocessTrustedMarkdown(dedent(value.desc));
}