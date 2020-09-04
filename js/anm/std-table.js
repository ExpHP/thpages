import dedent from "../lib/dedent.ts";

export const UNASSIGNED = {ref: null, wip: 2};

// ==========================================================================
// ==========================================================================
// ===================    LOOKUP TABLE BY OPCODE    =========================

/**
 * Table indexed first by game number string, then by opcode number,
 * producing the crossref associated with that opcode.
 *
 * Iterating the first table should produce games in ascending order.
 * There are NO GUARANTEES about iteration order of opcodes within a game.
 */
export const STD_BY_OPCODE = new Map(); // has to be a map because 'integer' keys defy insertion order
export const GROUPS_V8 = [
  {min: 0, max: 99, title: 'System'},
  {min: 100, max: 199, title: 'Math'},
  {min: 200, max: 299, title: 'Jumps'},
  {min: 300, max: 399, title: 'Settings'},
  {min: 400, max: 499, title: 'General'},
  {min: 500, max: 599, title: 'Child management'},
  {min: 600, max: 699, title: 'Drawing'},
];

// ---- EoSD ----
STD_BY_OPCODE.set('06', {
  0: {ref: 'std:v0-pos-keyframe'},
  1: {ref: 'std:v0-skyfog'},
  2: {ref: 'std:eosd-facing'},
  3: {ref: 'std:eosd-facing-time'},
  4: {ref: 'std:v0-skyfog-time'},
  5: {ref: 'std:eosd-stop'},
});

// ---- v0 ----
STD_BY_OPCODE.set('07', {
  0: {ref: 'std:v0-pos-keyframe'},
  1: {ref: 'std:v0-skyfog'},
  2: {ref: 'std:v0-skyfog-time'},
  3: {ref: 'std:v0-stop'},
  4: {ref: 'std:v0-jmp'},
  5: {ref: 'std:v0-pos'},
  6: {ref: 'std:v0-pos-time'},
  7: {ref: 'std:v0-facing'},
  8: {ref: 'std:v0-facing-time'},
  9: {ref: 'std:v0-up'},
  10: {ref: 'std:v0-up-time'},
  11: {ref: 'std:v0-fov'},
  12: {ref: 'std:v0-fov-time'},
  13: {ref: 'std:v0-clear-color'},
  14: {ref: 'std:v0-pos-initial'},
  15: {ref: 'std:v0-pos-final'},
  16: {ref: 'std:v0-pos-initial-deriv'},
  17: {ref: 'std:v0-pos-final-deriv'},
  18: {ref: 'std:v0-pos-bezier'},
  19: {ref: 'std:v0-facing-initial'},
  20: {ref: 'std:v0-facing-final'},
  21: {ref: 'std:v0-facing-initial-deriv'},
  22: {ref: 'std:v0-facing-final-deriv'},
  23: {ref: 'std:v0-facing-bezier'},
  24: {ref: 'std:v0-up-initial'},
  25: {ref: 'std:v0-up-final'},
  26: {ref: 'std:v0-up-initial-deriv'},
  27: {ref: 'std:v0-up-final-deriv'},
  28: {ref: 'std:v0-up-bezier'},
  29: {ref: 'std:v0-sprite-a'},
  30: {ref: 'std:v0-sprite-b'},
  31: {ref: 'std:v0-case'},
});

STD_BY_OPCODE.set('08', {
  ...STD_BY_OPCODE.get('07'),
  32: {ref: 'std:v0-rocking-vector'},
  33: {ref: 'std:v0-rock'},
  34: {ref: 'std:v0-sprite-c'},
});

// ==========================================================================
// ==========================================================================
// =====================    INSTRUCTION DATA    =============================

// Lookup table by ref id. (game-independent, map-independent name)
export const STD_INS_DATA = {};

// EoSD
Object.assign(STD_INS_DATA, {
  'v0-pos-keyframe': {
    sig: 'fff', args: ['x', 'y', 'z'], desc: `
    Declares a keyframe for camera position at the current time label.
    [tiphide]
    The game will automatically search ahead for the next keyframe and linearly interpolate
    position between the two time labels. For instance, the following snippet will linearly
    interpolate position from \`(0, 10, 0)\` to \`(0, 0, 15)\` over 300 frames.

    [code]
    0:
      [ref=std:v0-pos-keyframe](0f, 10f, 0f);
    +150:
      // other intervening instructions...
    +150:
      [ref=std:v0-pos-keyframe](0f, 0f, 15f);
    [/code]

    The final keyframe must have a time label of \`-1\`.
    [/tiphide]
  `},
  'eosd-facing': {
    sig: 'fff', args: ['x', 'y', 'z'], desc: `
    Set the direction the camera is facing.
    [tiphide]
    The vector does not need to be normalized.

    If there is a call to [ref=std:eosd-facing-time] on the same frame, the change will happen gradually over
    the specified time frame rather than instantly.
    [/tiphide]
  `},
  'eosd-facing-time': {
    sig: 'S__', args: ['t', '_', '_'], desc: `
    Causes the final [ref=std:eosd-facing] instruction on this same frame to be interpolated linearly over
    the next \`t\` frames rather than occuring instantly.

    [tiphide]
    More precisely:
    * [ref=std:eosd-facing] copies the *goal* into the *initial* direction, then sets the *goal* equal to the args.
    * [ref=std:eosd-facing-time] just resets the timer.

    Thus, it doesn't matter which order you call [ref=std:eosd-facing] and [ref=std:eosd-facing-time].
    [/tiphide]
  `},
  'v0-skyfog': {
    sig: 'Sff', args: ['color', 'near', 'far'], desc: `
    Set the color, near plane, and far plane of the distance fog.
    [tiphide]
    Color is \`0xAARRGGBB\`. \`thstd\` also supports \`#RRGGBBAA\` notation.

    If [ref=std:v0-skyfog-time] was called before this, then the change will happen gradually over
    the specified time frame rather than instantly.
    [/tiphide]
  `},
  'v0-skyfog-time': {
    sig: 'S__', args: ['t', '_', '_'], desc: `
    Cause the next [ref=std:v0-skyfog-time] to be linearly interpolated over the next \`t\` frames.

    [tiphide]
    More precisely:
    * [ref=std:v0-skyfog] sets both the *current* and *goal* fog equal to the arguments.
    * [ref=std:v0-skyfog-time] copies the *current* into the *initial*, and resets the timer.

    Thus, for things to work as expected, [ref=std:v0-skyfog-time] should generally be called *before*
    [ref=std:v0-skyfog]. (except on the first frame when you are setting the initial fog)
    [/tiphide]
  `},
  'eosd-stop': {
    sig: '___', args: ['_', '_', '_'], succ: 'v0-stop', desc: `
    Stops executing the script until unpaused by ECL \`ins_125()\`.
  `},
  'v0-stop': {
    sig: '___', args: ['_', '_', '_'], desc: `
    Stops executing the script.

    [tiphide]
    This is basically like putting an infinitely large time label in the script.
    Time-interpolated values will update, and interrupts can be triggered at any time (see [ref=std:v0-case]).
    [/tiphide]
  `},

  'v0-case': {
    sig: 'S__', args: ['number', '_', '_'], wip: 1, desc: `
    A label for an interrupt.

    [tiphide]
    STD interrupts are similar to [ANM interrupts](#/anm/concepts&a=interrupt). They can occur
    at any time the script is waiting (due to e.g. an increased [time label](#/anm/concepts&a=time)
    or a [ref=std:v0-stop]), and there is an ECL instruction to trigger them.

    * In [game=08], there is additional hardcoded jank tied to interrupts 1&ndash;4 that
      that controls the purple/red waves emanating from the moon during the Kaguya fight.
    [/tiphide]
  `},

  'v0-clear-color': {
    sig: 'S__', args: ['color', '_', '_'], wip: 1, desc: `
    Sets a color that gets used at some point in a call to \`IDirect3DDevice8::Clear\`.
    [tiphide]
    I'm not sure when and where this color would ever be visible in-game...

    Color is \`0xAARRGGBB\`. \`thstd\` also supports \`#RRGGBBAA\` notation.
    [/tiphide]
  `},

  'v0-jmp': {
    sig: 'SS_', args: ['instr', 'time', '_'], wip: 1, desc: `
    Jumps to the instruction with index \`instr\` and sets the current time to \`time\`.

    [tiphide]
    Notice this is different from jump instructions in later versions or other formats in that it takes the
    index of the instruction rather than its byte offset! (this is possible because all instructions are the
    same size (20 bytes) in v0 STD)

    [wip]Jumping automatically sets a flag.  For now we'll call this the \`wtfisthisicanteven\` flag.[/wip]
    [/tiphide]
  `},

  'v0-pos': {
    sig: 'fff', args: ['x', 'y', 'z'], desc: `
    Set the position of the camera.

    [tiphide]
    [wip]If the \`wtfisthisicanteven\` flag is set (see [ref=std:v0-jmp]),
    this instruction will also iterate over a subset of the entities managed by \`EffectManager\`
    and do... uh... something... to them. It will then clear the flag.[/wip]
    [/tiphide]
  `},

  'v0-pos-time': {
    sig: 'SS_', args: ['t', 'mode', '_'], desc: `
    Causes the final [ref=std:v0-pos] instruction on this same frame to be interpolated over
    the next \`t\` frames using the given [interpolation mode](#/anm/interpolation&a=old-games)
    rather than occuring instantly.
    [tiphide]
    (**Note:** v0 STD has its own set of mode numbers!)

    More precisely:
    * [ref=std:v0-pos] copies the *goal* into the *initial* direction, then sets the *goal* equal to the args.
    * [ref=std:v0-pos-time] just resets the timer.

    Thus, it doesn't matter which order you call [ref=std:v0-pos] and [ref=std:v0-pos-time].
    [/tiphide]
  `},

  'v0-facing': {sig: 'fff', args: ['x', 'y', 'z'], desc: `Set the direction the camera is facing.  The vector does not need to be normalized.`},
  'v0-up': {sig: 'fff', args: ['x', 'y', 'z'], desc: `Set the up direction of the camera.  The vector does not need to be normalized.`},
  'v0-fov': {sig: 'f__', args: ['fovy', '_', '_'], desc: `Set the vertical field-of-view of the camera.`},

  'v0-pos-initial': {
    sig: 'fff', args: ['x', 'y', 'z'], desc: `
    Simply writes the initial camera position for time interpolation.

    [tiphide]
    Be aware that [ref=std:v0-pos] already copies the final position into the initial position, so it does not make sense
    to call this before calling [ref=std:v0-pos].  (rather, you should be making two calls to [ref=std:v0-pos] instead).
    [code]
    // broke   X_X
      [ref=std:v0-pos-initial](0f, 0f, 0f);
      [ref=std:v0-pos-time](60, 3, 0);
      [ref=std:v0-pos](0f, 20f, 0f);

    // woke    :D
    // This is the correct way to interpolate from (0, 0, 0)
    // to (0, 20, 0) over 60 frames using mode 3.
      [ref=std:v0-pos](0f, 0f, 0f);
      [ref=std:v0-pos-time](60, 3, 0);
      [ref=std:v0-pos](0f, 20f, 0f);

    // also acceptable
      [ref=std:v0-pos-initial](0f, 0f, 0f);
      [ref=std:v0-pos-time](60, 3, 0);
      [ref=std:v0-pos-final](0f, 20f, 0f);
    [/code]
    [/tiphide]
  `},

  'v0-pos-final': {
    sig: 'fff', args: ['x', 'y', 'z'], desc: `
    Simply writes the final camera position for time interpolation, without the extra effects of the [ref=std:v0-pos] instruction.
    (i.e. this one doesn't overwrite the initial position.)

    [tiphide]
    (it also doesn't do the funny stuff with \`EffectManager\`...)
    [/tiphide]
  `},

  'v0-sprite-a': {
    sig: 'S__', args: ['i', '_', '_'], wip: 1, desc: `
    [wip]Sets something sprite related. Like an ANM script index or something.[/wip]
  `},
  'v0-sprite-b': {
    sig: 'S__', args: ['i', '_', '_'], wip: 1, desc: `
    [wip]Sets something sprite related. Like an ANM script index or something.[/wip]
  `},
  'v0-sprite-c': {
    sig: 'S__', args: ['i', '_', '_'], wip: 1, desc: `
    [wip]Sets something sprite related. Like an ANM script index or something.[/wip]
  `},

  'v0-rock': {
    sig: 'S__', args: ['mode', '_', '_'], wip: 1, desc: `
    Sets the rocking mode and resets the rocking timer to 0.
    [tiphide]
    Different games have different modes. 0 disables rocking.
    [/tiphide]
  `},
  'v0-rocking-vector': {
    sig: 'fff', args: ['x', 'y', 'z'], wip: 1, desc: `
    Manually sets [wip]an unknown vector that is usually modified by rocking modes.[/wip]

    [tiphide]
    The game only ever uses this to reset the vector back to \`(0, 0, 0)\` after setting
    the rocking mode to 0.
    [/tiphide]
  `},
});

for (const thing of ['facing', 'up', 'fov']) {
  STD_INS_DATA[`v0-${thing}-time`] = {
    sig: 'SS_', args: ['t', 'mode', '_'], desc: `
    Causes the final [ref=std:v0-${thing}] instruction on this same frame to be interpolated over
    the next \`t\` frames using the given [interpolation mode](#/anm/interpolation&a=old-games)
    rather than occuring instantly.
    [tiphide]
    (**Note:** v0 STD has its own set of mode numbers!)

    Similarly to [ref=std:v0-pos-time], order does not matter.
    [/tiphide]
  `};
}

for (const thing of ['facing', 'up']) {
  STD_INS_DATA[`v0-${thing}-time`] = {
    sig: 'SS_', args: ['t', 'mode', '_'], desc: `
    Causes the final [ref=std:v0-${thing}] instruction on this same frame to be interpolated over
    the next \`t\` frames using the given [interpolation mode](#/anm/interpolation&a=old-games)
    rather than occuring instantly.
    [tiphide]
    (**Note:** v0 STD has its own set of mode numbers!)

    Similarly to [ref=std:v0-pos-time], order does not matter.
    [/tiphide]
  `};

  STD_INS_DATA[`v0-${thing}-initial`] = {
    sig: 'SS_', args: ['t', 'mode', '_'], desc: `
    Simply writes the initial value of [ref=std:v0-${thing}] for time interpolation.
    [tiphide]
    This has similar caveats to [ref=std:v0-pos-initial].
    [/tiphide]
  `};
  STD_INS_DATA[`v0-${thing}-final`] = {
    sig: 'SS_', args: ['t', 'mode', '_'], desc: `
    Simply writes the final value of [ref=std:v0-${thing}] for time interpolation,
    without any of the additional effects of a direct call to [ref=std:v0-${thing}].
  `};
}

for (const thing of ['pos', 'facing', 'up']) {
  STD_INS_DATA[`v0-${thing}-bezier`] = {
    sig: 'S__', args: ['t', '_', '_'], desc: `
    Interpolates [ref=std:v0-${thing}] using a Bezier.
    [tiphide]
    Identical to calling [ref=std:v0-${thing}-time]\`(t, 7, 0)\`. (7 is the Bezier mode)
    [/tiphide]
  `};

  STD_INS_DATA[`v0-${thing}-initial-deriv`] = {
    sig: 'fff', args: ['dx', 'dy', 'dz'], desc: `
    Sets the initial derivative for Bezier interpolation of [ref=std:v0-${thing}].
    [tiphide]
    This is the initial derivative of the normalized easing function, so the initial velocity
    will be \`(dx/t, dy/t, dz/t)\` (where \`t\` comes from [ref=std:v0-${thing}-bezier])
    [/tiphide]
  `};

  STD_INS_DATA[`v0-${thing}-final-deriv`] = {
    sig: 'fff', args: ['dx', 'dy', 'dz'], desc: `
    Sets the final derivative for Bezier interpolation of [ref=std:v0-${thing}].
    [tiphide]
    This is the final derivative of the normalized easing function, so the final velocity
    will be \`(dx/t, dy/t, dz/t)\` (where \`t\` comes from [ref=std:v0-${thing}-bezier])
    [/tiphide]
  `};
}

// Add `minGame` and `maxGame` keys to each crossref.
for (const [game, table] of STD_BY_OPCODE.entries()) {
  for (const [opcodeStr, {ref}] of Object.entries(table)) {
    if (ref === null) continue;
    const id = ref.substring('std:'.length);
    const entry = STD_INS_DATA[id];

    if (!entry) {
      window.console.error(`invalid ref in opcode table (game ${game}, opcode ${opcodeStr}): ${ref}`);
      continue;
    }

    if (entry.minGame === undefined) {
      entry.minGame = game;
    }
    entry.maxGame = game;
  }
}

for (const [key, value] of Object.entries(STD_INS_DATA)) {
  value.wip = value.wip || 0;
  if (value.desc === undefined) window.console.error(`TABLE CORRUPT: std ref ${key} has no 'desc'`);
  if (value.sig === undefined) window.console.error(`TABLE CORRUPT: std ref ${key} has no 'sig'`);
  if (value.sig != null && value.args === undefined) window.console.error(`TABLE CORRUPT: std ref ${key} has no 'args'`);
  if (value.sig && value.sig.length !== value.args.length) {
    window.console.error(`TABLE CORRUPT: astdnm ref ${key} has arg count mismatch`);
  }

  // automatically remove tips from self-references
  const re = new RegExp(`\\[ref=std:${key}\\]`, 'g');
  value.desc = value.desc.replace(re, `[tip-nodeco=YOU ARE HERE][ref-notip=std:${key}][/tip-nodeco]`);

  value.desc = dedent(value.desc);
}
