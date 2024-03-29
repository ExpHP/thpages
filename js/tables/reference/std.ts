import {mapAssign} from '~/js/util';

import type {PartialInsData, PartialOpcodeRefData} from '../tables';
import {Game} from '../game';

// ==========================================================================
// ==========================================================================
// ===================    LOOKUP TABLE BY OPCODE    =========================

export const refByOpcode = new Map<Game, Map<number, PartialOpcodeRefData>>();

// ---- EoSD ----
refByOpcode.set('06', new Map([
  [0, {ref: 'std:v0-pos-keyframe'}],
  [1, {ref: 'std:v0-skyfog'}],
  [2, {ref: 'std:eosd-facing'}],
  [3, {ref: 'std:eosd-facing-time'}],
  [4, {ref: 'std:v0-skyfog-time'}],
  [5, {ref: 'std:eosd-stop'}],
]));

// ---- v0 ----
refByOpcode.set('07', new Map([
  [0, {ref: 'std:v0-pos-keyframe'}],
  [1, {ref: 'std:v0-skyfog'}],
  [2, {ref: 'std:v0-skyfog-time'}],
  [3, {ref: 'std:v0-stop'}],
  [4, {ref: 'std:v0-jmp'}],
  [5, {ref: 'std:v0-pos'}],
  [6, {ref: 'std:v0-pos-time'}],
  [7, {ref: 'std:v0-facing'}],
  [8, {ref: 'std:v0-facing-time'}],
  [9, {ref: 'std:v0-up'}],
  [10, {ref: 'std:v0-up-time'}],
  [11, {ref: 'std:v0-fov'}],
  [12, {ref: 'std:v0-fov-time'}],
  [13, {ref: 'std:v0-clear-color'}],
  [14, {ref: 'std:v0-pos-initial'}],
  [15, {ref: 'std:v0-pos-final'}],
  [16, {ref: 'std:v0-pos-initial-deriv'}],
  [17, {ref: 'std:v0-pos-final-deriv'}],
  [18, {ref: 'std:v0-pos-bezier'}],
  [19, {ref: 'std:v0-facing-initial'}],
  [20, {ref: 'std:v0-facing-final'}],
  [21, {ref: 'std:v0-facing-initial-deriv'}],
  [22, {ref: 'std:v0-facing-final-deriv'}],
  [23, {ref: 'std:v0-facing-bezier'}],
  [24, {ref: 'std:v0-up-initial'}],
  [25, {ref: 'std:v0-up-final'}],
  [26, {ref: 'std:v0-up-initial-deriv'}],
  [27, {ref: 'std:v0-up-final-deriv'}],
  [28, {ref: 'std:v0-up-bezier'}],
  [29, {ref: 'std:v0-sprite-a'}],
  [30, {ref: 'std:v0-sprite-b'}],
  [31, {ref: 'std:v0-case'}],
]));

refByOpcode.set('08', new Map([...refByOpcode.get('07')!.entries(),
  [32, {ref: 'std:v0-rocking-vector'}],
  [33, {ref: 'std:v0-rock'}],
  [34, {ref: 'std:v0-sprite-c'}],
]));

refByOpcode.set('09', new Map([...refByOpcode.get('08')!.entries()]));
refByOpcode.set('095', new Map([
  [0, {ref: 'std:stop'}],
  [1, {ref: 'std:jmp'}],
  [2, {ref: 'std:pos'}],
  [3, {ref: 'std:pos-time'}],
  [4, {ref: 'std:facing'}],
  [5, {ref: 'std:facing-time'}],
  [6, {ref: 'std:up'}],
  [7, {ref: 'std:fov'}],
  [8, {ref: 'std:skyfog'}],
  [9, {ref: 'std:skyfog-time'}],
  [10, {ref: 'std:pos-bezier'}],
  [11, {ref: 'std:facing-bezier'}],
  [12, {ref: 'std:rock'}],
  [13, {ref: 'std:clear-color'}],
  [14, {ref: 'std:sprite-2arg'}],
  // it's hard to tell whether ins_15 officially "exists" in TH095/TH10 since it would be cut out
  // of the jumptable by the compiler regardless (it's a nop at the end of the table).
  //
  // But invalid instructions are also nops, so we might as well assume it does exist
  // (assuming it is in fact a nop with no additional semantics; contrast with ins_16)
  [15, {ref: 'std:ins-15'}],

  // NOTE: As far as I can tell, TH095 and TH10 have no interrupt labels.
  // I say this not because they are missing from the STD jumptable (as explained for ins_15 above,
  // that much would be expected); rather, I say it because there appears to be no ECL instruction
  // to trigger an interrupt in these two games.
]));

refByOpcode.set('10', new Map([...refByOpcode.get('095')!.entries()]));
refByOpcode.set('11', new Map([...refByOpcode.get('10')!.entries(),
  [16, {ref: 'std:case'}],
  [17, {ref: 'std:distortion'}],
]));

refByOpcode.set('12', new Map([...refByOpcode.get('11')!.entries(),
  [14, {ref: 'std:sprite-3arg'}], // signature change!
  [18, {ref: 'std:up-time'}],
]));

refByOpcode.set('125', new Map([...refByOpcode.get('12')!.entries()]));
refByOpcode.set('128', new Map([...refByOpcode.get('125')!.entries()]));
refByOpcode.set('13', new Map([...refByOpcode.get('128')!.entries()]));
refByOpcode.set('14', new Map([...refByOpcode.get('13')!.entries(),
  [19, {ref: 'std:ins-19'}],
  [20, {ref: 'std:draw-distance'}],
]));

refByOpcode.set('143', new Map([...refByOpcode.get('14')!.entries()]));
refByOpcode.set('15', new Map([...refByOpcode.get('143')!.entries()]));
refByOpcode.set('16', new Map([...refByOpcode.get('15')!.entries()]));
refByOpcode.set('165', new Map([...refByOpcode.get('16')!.entries()]));
refByOpcode.set('17', new Map([...refByOpcode.get('16')!,
  [21, {ref: 'std:fov-time'}],
]));
refByOpcode.set('18', new Map([...refByOpcode.get('17')!.entries()]));
refByOpcode.set('185', new Map([...refByOpcode.get('18')!.entries()]));

// ==========================================================================
// ==========================================================================
// =====================    INSTRUCTION DATA    =============================

// Lookup table by ref id. (game-independent, map-independent name)
export const byRefId = new Map<string, PartialInsData>();

// EoSD
mapAssign(byRefId, {
  'v0-pos-keyframe': {
    sig: 'fff', args: ['x', 'y', 'z'], md: `
    :tipshow[Declares a keyframe for camera position at the current time label.]
    The game will automatically search ahead for the next keyframe and linearly interpolate
    position between the two time labels. For instance, the following snippet will linearly
    interpolate position from \`(0, 10, 0)\` to \`(0, 0, 15)\` over 300 frames.

    ~~~anm
    0:
      :ref{r=std:v0-pos-keyframe}(0f, 10f, 0f);
    +150:
      // other intervening instructions...
    +150:
      :ref{r=std:v0-pos-keyframe}(0f, 0f, 15f);
    ~~~

    The final keyframe must have a time label of \`-1\` or the game may attempt to read out of bounds.
  `},
  'eosd-facing': {
    sig: 'fff', args: ['x', 'y', 'z'], succ: 'v0-facing', md: `
    :tipshow[Set the direction the camera is facing.]
    The vector does not need to be normalized.

    If there is a call to :ref{r=std:eosd-facing-time} on the same frame, the change will happen gradually over
    the specified time frame rather than instantly.
  `},
  'eosd-facing-time': {
    sig: 'S__', args: ['t', '_', '_'], succ: 'v0-facing-time', md: `
    :::tipshow
    Causes the final :ref{r=std:eosd-facing} instruction on this same frame to be interpolated linearly over
    the next \`t\` frames rather than occuring instantly.
    :::

    More precisely:
    * :ref{r=std:eosd-facing} copies the *goal* into the *initial* direction, then sets the *goal* equal to the args.
    * :ref{r=std:eosd-facing-time} just resets the timer.

    Thus, it doesn't matter which order you call :ref{r=std:eosd-facing} and :ref{r=std:eosd-facing-time}.
  `},
  'v0-skyfog': {
    sig: 'Sff', args: ['color', 'near', 'far'], succ: 'skyfog', md: `
    :tipshow[Set the color, near plane, and far plane of the distance fog.]
    Color is \`0xAARRGGBB\`. \`thstd\` also supports \`#RRGGBBAA\` notation.

    If :ref{r=std:v0-skyfog-time} was called before this, then the change will happen gradually over
    the specified time frame rather than instantly.
  `},
  'v0-skyfog-time': {
    sig: 'S__', args: ['t', '_', '_'], md: `
    :tipshow[Cause the next :ref{r=std:v0-skyfog} to be linearly interpolated over the next \`t\` frames.]

    More precisely:
    * :ref{r=std:v0-skyfog} sets both the *current* and *goal* fog equal to the arguments.
    * :ref{r=std:v0-skyfog-time} copies the *current* into the *initial*, and resets the timer.

    Thus, for things to work as expected, :ref{r=std:v0-skyfog-time} should generally be called *before*
    :ref{r=std:v0-skyfog}. (except on the first frame when you are setting the initial fog)
  `},
  'eosd-stop': {
    sig: '___', args: ['_', '_', '_'], succ: 'v0-stop', md: `
    Stops executing the script until unpaused by ECL \`ins_125()\`.
  `},
  'v0-stop': {
    sig: '___', args: ['_', '_', '_'], succ: 'stop', md: `
    :tipshow[Stops executing the script.]

    This is basically like putting an infinitely large time label in the script.
    Time-interpolated values will update, and interrupts can be triggered at any time (see :ref{r=std:v0-case}).
  `},

  'v0-case': {
    sig: 'S__', args: ['number', '_', '_'], wip: 1, succ: 'case', md: `
    :tipshow[A label for an interrupt.]

    STD interrupts are similar to [ANM interrupts](#/anm/concepts&a=interrupt). They can occur
    at any time the script is waiting (due to e.g. an increased [time label](#/anm/concepts&a=time)
    or a :ref{r=std:v0-stop}), and there is an ECL instruction to trigger them.

    * In :game[08], there is additional hardcoded jank tied to interrupts 1&ndash;4 that
      that controls the purple/red waves emanating from the moon during the Kaguya fight.
  `},

  'v0-clear-color': {
    sig: 'S__', args: ['color', '_', '_'], wip: 1, succ: 'clear-color', md: `
    :tipshow[Sets a color that gets used at some point in a call to \`IDirect3DDevice8::Clear\`.]
    I'm not sure when and where this color would ever be visible in-game...

    Color is \`0xAARRGGBB\`. \`thstd\` also supports \`#RRGGBBAA\` notation.
  `},

  'v0-jmp': {
    sig: 'SS_', args: ['instr', 'time', '_'], wip: 1, succ: 'jmp', md: `
    :tipshow[Jumps to the instruction with index \`instr\` and sets the current time to \`time\`.]

    Notice this is different from jump instructions in later versions or other formats in that it takes the
    index of the instruction rather than its byte offset! (this is possible because all instructions are the
    same size (20 bytes) in v0 STD)

    :wip[Jumping automatically sets a flag.  For now we'll call this the \`wtfisthisicanteven\` flag.]
  `},

  'v0-pos': {
    sig: 'fff', args: ['x', 'y', 'z'], succ: 'pos', md: `
    :tipshow[Set the position of the camera.]

    :wip[If the \`wtfisthisicanteven\` flag is set (see :ref{r=std:v0-jmp}),
    this instruction will also iterate over a subset of the entities managed by \`EffectManager\`
    and do... uh... something... to them. It will then clear the flag.]
  `},

  'v0-pos-time': {
    sig: 'SS_', args: ['t', 'mode', '_'], md: `
    :::tipshow
    Causes the final :ref{r=std:v0-pos} instruction on this same frame to be interpolated over
    the next \`t\` frames using the given [interpolation mode](#/anm/interpolation&a=old-games)
    rather than occuring instantly.
    :::

    (**Note:** v0 STD has its own set of mode numbers!)

    More precisely:
    * :ref{r=std:v0-pos} copies the *goal* into the *initial* direction, then sets the *goal* equal to the args.
    * :ref{r=std:v0-pos-time} just resets the timer.

    Thus, it doesn't matter which order you call :ref{r=std:v0-pos} and :ref{r=std:v0-pos-time}.
  `},

  'v0-facing': {sig: 'fff', args: ['x', 'y', 'z'], succ: 'facing', md: `Set the direction the camera is facing.  The vector does not need to be normalized.`},
  'v0-up': {sig: 'fff', args: ['x', 'y', 'z'], succ: 'up', md: `Set the up direction of the camera.  The vector does not need to be normalized.`},
  'v0-fov': {sig: 'f__', args: ['fovy', '_', '_'], succ: 'fov', md: `Set the vertical field-of-view of the camera.`},

  'v0-pos-initial': {
    sig: 'fff', args: ['x', 'y', 'z'], md: `
    :tipshow[Simply writes the initial camera position for time interpolation.]

    Be aware that :ref{r=std:v0-pos} already copies the final position into the initial position, so it does not make sense
    to call this before calling :ref{r=std:v0-pos}.  (rather, you should be making two calls to :ref{r=std:v0-pos} instead).
    ~~~anm
    // broke   X_X
    :ref{r=std:v0-pos-initial}(0f, 0f, 0f);
    :ref{r=std:v0-pos-time}(60, 3, 0);
    :ref{r=std:v0-pos}(0f, 20f, 0f);

    // woke    :D
    // This is the correct way to interpolate from (0, 0, 0)
    // to (0, 20, 0) over 60 frames using mode 3.
    :ref{r=std:v0-pos}(0f, 0f, 0f);
    :ref{r=std:v0-pos-time}(60, 3, 0);
    :ref{r=std:v0-pos}(0f, 20f, 0f);
    ~~~

    The games only ever use this instruction as part of the setup for :ref{r=std:v0-pos-bezier}.
  `},

  'v0-pos-final': {
    sig: 'fff', args: ['x', 'y', 'z'], md: `
    :tipshow[Simply writes the final camera position for time interpolation, without the extra effects of the :ref{r=std:v0-pos} instruction.
    (i.e. this one doesn't overwrite the initial position.)]
    (it also doesn't do the funny stuff with \`EffectManager\`...)

    The games only ever use this instruction as part of the setup for :ref{r=std:v0-pos-bezier}.
  `},

  'v0-sprite-a': {
    sig: 'S__', args: ['i', '_', '_'], wip: 1, md: `
    :wip[Sets something sprite related. Like an ANM script index or something. Possibly skybox related.]
  `},
  'v0-sprite-b': {
    sig: 'S__', args: ['i', '_', '_'], wip: 1, md: `
    :wip[Sets something sprite related. Like an ANM script index or something. Possibly skybox related.]
  `},
  'v0-sprite-c': {
    sig: 'S__', args: ['i', '_', '_'], wip: 1, md: `
    :wip[Sets something sprite related. Like an ANM script index or something. Possibly skybox related.]
  `},

  'v0-rock': {
    sig: 'S__', args: ['mode', '_', '_'], wip: 1, succ: 'rock', md: `
    :tipshow[Sets the rocking mode and resets the rocking timer to 0.]
    Different games have different modes. 0 disables rocking.
  `},
  'v0-rocking-vector': {
    sig: 'fff', args: ['x', 'y', 'z'], wip: 1, md: `
    :tipshow[Manually sets :wip[an unknown vector that is usually modified by rocking modes.]]

    The game only ever uses this to reset the vector back to \`(0, 0, 0)\` after setting
    the rocking mode to 0.
  `},
});

for (const thing of ['facing', 'up', 'fov']) {
  byRefId.set(`v0-${thing}-time`, {
    sig: 'SS_', args: ['t', 'mode', '_'], md: `
    :tipshow[Causes the final :ref{r=std:v0-${thing}} instruction on this same frame to be interpolated over
    the next \`t\` frames using the given [interpolation mode](#/anm/interpolation&a=old-games)
    rather than occuring instantly.]
    (**Note:** v0 STD has its own set of mode numbers!)

    Similarly to :ref{r=std:v0-pos-time}, order does not matter.
  `});
}

for (const thing of ['facing', 'up']) {
  byRefId.set(`v0-${thing}-time`, {
    sig: 'SS_', args: ['t', 'mode', '_'], md: `
    :tipshow[Causes the final :ref{r=std:v0-${thing}} instruction on this same frame to be interpolated over
    the next \`t\` frames using the given [interpolation mode](#/anm/interpolation&a=old-games)
    rather than occuring instantly.]
    (**Note:** v0 STD has its own set of mode numbers!)

    Similarly to :ref{r=std:v0-pos-time}, order does not matter.
  `});

  byRefId.set(`v0-${thing}-initial`, {
    sig: 'SS_', args: ['t', 'mode', '_'], md: `
    :tipshow[Simply writes the initial value of :ref{r=std:v0-${thing}} for time interpolation.]
    This has similar caveats to :ref{r=std:v0-pos-initial}, and the games only ever use it as part of the
    setup for :ref{r=std:v0-${thing}-bezier}.
  `});
  byRefId.set(`v0-${thing}-final`, {
    sig: 'SS_', args: ['t', 'mode', '_'], md: `
    :tipshow[Simply writes the final value of :ref{r=std:v0-${thing}} for time interpolation,
    without any of the additional effects of a direct call to :ref{r=std:v0-${thing}}.]
    The games only ever use it as part of the setup for :ref{r=std:v0-${thing}-bezier}.
  `});
}

for (const thing of ['pos', 'facing', 'up']) {
  byRefId.set(`v0-${thing}-bezier`, {
    sig: 'S__', args: ['t', '_', '_'], md: `
    :tipshow[Interpolates :ref{r=std:v0-${thing}} using a Bezier.]
    Identical to calling :ref{r=std:v0-${thing}-time}\`(t, 7, 0)\`. (7 is the Bezier mode)
  `});

  byRefId.set(`v0-${thing}-initial-deriv`, {
    sig: 'fff', args: ['dx', 'dy', 'dz'], md: `
    :tipshow[Sets the initial derivative for Bezier interpolation of :ref{r=std:v0-${thing}}.]
    This is the initial derivative of the normalized easing function, so the initial velocity
    will be \`(dx/t, dy/t, dz/t)\` (where \`t\` comes from :ref{r=std:v0-${thing}-bezier})
  `});

  byRefId.set(`v0-${thing}-final-deriv`, {
    sig: 'fff', args: ['dx', 'dy', 'dz'], md: `
    :tipshow[Sets the final derivative for Bezier interpolation of :ref{r=std:v0-${thing}}.]
    This is the final derivative of the normalized easing function, so the final velocity
    will be \`(dx/t, dy/t, dz/t)\` (where \`t\` comes from :ref{r=std:v0-${thing}-bezier})
  `});
}

// Later games
mapAssign(byRefId, {
  'stop': {sig: '', args: [], md: `
    :tipshow[Stops executing the script.]

    This is basically like putting an infinitely large time label in the script.
    Time-interpolated values will update, and interrupts can be triggered at any time (see :ref{r=std:case}).
  `},

  'jmp': {
    sig: 'SS', args: ['offset', 'time'], md: `
    Jumps to the instruction at offset \`offset\` from the beginning of the script, and sets the current time to \`time\`.
  `},

  'pos': {sig: 'fff', args: ['x', 'y', 'z'], md: `Set the position of the camera.`},
  'facing': {sig: 'fff', args: ['x', 'y', 'z'], md: `Set the direction the camera is facing.  The vector does not need to be normalized.`},
  'up': {sig: 'fff', args: ['x', 'y', 'z'], md: `Set the up direction of the camera.  The vector does not need to be normalized.`},
  'fov': {sig: 'f', args: ['fovy'], md: `Set the vertical field-of-view of the camera.`},

  'skyfog': {
    sig: 'Sff', args: ['color', 'near', 'far'], md: `
    :tipshow[Set the color, near plane, and far plane of the distance fog.]

    Color is \`0xAARRGGBB\`. \`thstd\` also supports \`#RRGGBBAA\` notation.
  `},

  'pos-bezier': {
    sig: 'SSfffffffff', args: ['t', '_unused', 'x1', 'y1', 'z1', 'x2', 'y2', 'z2', 'x3', 'y3', 'z3'], md: `
    :tipshow[In \`t\` frames, moves the camera to \`(x2, y2, z2)\` using Bezier interpolation.]

    :wip[Assuming everything works the same as :ref{r=anm:posBezier}:]
    * The camera starts at its current position.
    * \`(x1/t, y1/t, z1/t)\` is the **initial velocity.**
    * \`(x2, y2, z2)\` is the **final position.**
    * \`(x3/t, y3/t, z3/t)\` is the **final velocity.**

    The second argument is entirely unused.
  `},

  'facing-bezier': {
    sig: 'SSfffffffff', args: ['t', '_unused', 'x1', 'y1', 'z1', 'x2', 'y2', 'z2', 'x3', 'y3', 'z3'], md: `
    :tipshow[In \`t\` frames, moves to \`(x2, y2, z2)\` using Bezier interpolation.]

    :wip[Assuming everything works the same as :ref{r=anm:posBezier}:]
    * The camera's facing vector begins with the values set by :ref{r=std:facing}.
    * \`(x1/t, y1/t, z1/t)\` is the **initial derivative.**
    * \`(x2, y2, z2)\` is the **final value.**
    * \`(x3/t, y3/t, z3/t)\` is the **final derivative.**

    The second argument is entirely unused.
  `},

  'rock': {
    sig: 'S', args: ['mode'], md: `
    :tipshow[Sets the rocking mode and resets the rocking timer to 0.]
    Different games have different modes. 0 disables rocking.
  `},

  'clear-color': {
    sig: 'S', args: ['color'], md: `
    :tipshow[Sets a color that gets used at some point in a call to \`IDirect3DDevice8::Clear\`.]
    I'm not sure when and where this color would ever be visible in-game...

    Color is \`0xAARRGGBB\`. \`thstd\` also supports \`#RRGGBBAA\` notation.
  `},

  'sprite-2arg': {
    sig: 'SS', args: ['slot', 'script'], succ: 'sprite-3arg', md: `
    :tipshow[Load a 2d sprite, used for skyboxes and stuff.]

    In :game[095]&ndash;:game[17] there are 8 slots.  Prior to :game[14] this has no \`layer\` argument.
  `},

  'sprite-3arg': {
    sig: 'SSS', args: ['slot', 'script', 'layer'], md: `
    :tipshow[Load a 2d sprite, used for skyboxes and stuff.]

    In :game[095]&ndash;:game[17] there are 8 slots, numbered 0&ndash;7.
    The \`layer\` argument serves a similar purpose to ANM layers (though it is a separate thing).
    All sprites with layer 0 will be drawn before sprites with layer 1, and so on.
    :wip[The number of layers in each game is different, so be careful!]
  `},

  'ins-15': {sig: '', args: [], wip: 1, md: `This appears to be a nop.  However, no game ever uses it.`},

  'case': {
    sig: 'S', args: ['n'], md: `
    :tipshow[A label for an interrupt.]

    STD interrupts are similar to [ANM interrupts](#/anm/concepts&a=interrupt). They can occur
    at any time the script is waiting (due to e.g. an increased [time label](#/anm/concepts&a=time)
    or a :ref{r=std:stop}), and there is an ECL instruction to trigger them.
  `},

  'distortion': {
    sig: 'S', args: ['a'], wip: 1, md: `
    :tipshow[Triggers distortion effects on the edge of the screen.]

    :wip[The meaning of the argument is not entirely clear.  :game[11] uses a value of 1 to create distortion
    at the bottom of the screen, while :game[12] uses this same value to create distortion at the top.]
  `},

  'ins-19': {
    sig: 'S', args: ['n'], md: `
    :tipshow[Invokes ANM interrupt \`n + 7\` on all sprites in the stage background.]

    It has various uses, like messing with the doors in :game[16] stage 6.
  `},

  'draw-distance': {
    sig: 'f', args: ['rsq'], md: `
    :tipshow[Changes the draw distance threshold.] (default value is \`9160000.0\`, or \`3100.0\` squared)

    The game implements a radial draw distance, and sprites will instantly pop in or out as soon as
    their squared distance to the camera crosses this threshold.  Ideally, this distance is greater than
    the far plane for fog.

    No game actually uses this instruction.
  `},
});

for (const thing of ['pos', 'up', 'facing', 'fov', 'skyfog']) {
  byRefId.set(`${thing}-time`, {
    sig: 'SS' + byRefId.get(thing)!.sig,
    args: ['t', 'mode', ...byRefId.get(thing)!.args],
    md: `
    Smoothly interpolates the value of :ref{r=std:${thing}} over the next \`t\` frames
    using the given [interpolation mode](#/anm/interpolation&a=old-games).
  `});
}
