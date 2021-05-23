import dedent from "../lib/dedent.ts";

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
export const MSG_BY_OPCODE = new Map(); // has to be a map because 'integer' keys defy insertion order

// MSG_BY_OPCODE.set('06', {
//   // TODO
// });

MSG_BY_OPCODE.set('10', {
  0: {ref: 'msg:end'},
  1: {ref: 'msg:show-player'},
  2: {ref: 'msg:show-enemy'},
  3: {ref: 'msg:show-textbox'},
  4: {ref: 'msg:hide-player-single'},
  5: {ref: 'msg:hide-enemy-single'},
  6: {ref: 'msg:hide-textbox'},
  7: {ref: 'msg:focus-player-single'},
  8: {ref: 'msg:focus-enemy-single'},
  9: {ref: 'msg:skippable'},
  10: {ref: 'msg:pause'},
  11: {ref: 'msg:ecl-resume'},
  12: {ref: 'msg:face-player-single'},
  13: {ref: 'msg:face-enemy-single'},
  14: {ref: 'msg:text-1'},
  15: {ref: 'msg:text-2'},
  16: {ref: 'msg:text-add-nofuri'},
  17: {ref: 'msg:text-clear'},
  18: {ref: 'msg:music-boss'},
  19: {ref: 'msg:th10-intro'},
  20: {ref: 'msg:stage-end'},
  21: {ref: 'msg:music-fade'},
  22: {ref: 'msg:shake-player-single'},
  23: {ref: 'msg:shake-enemy-single'},
});

// TH11 inserted one in the middle, rawr
function insertSpaceInNumericObject(obj, insertedIndex) {
  return Object.fromEntries(Object.entries(obj).map(([key, value]) => {
    const intKey = parseInt(key, 10);
    return [intKey >= insertedIndex ? intKey + 1 : intKey, value];
  }));
}

MSG_BY_OPCODE.set('11', {
  ...insertSpaceInNumericObject(MSG_BY_OPCODE.get('10'), 9),
  9: {ref: 'msg:focus-none'},
  25: {ref: 'msg:y-offset'},
  26: {ref: 'msg:modern-26'},
});

MSG_BY_OPCODE.set('12', {
  ...MSG_BY_OPCODE.get('11'),
  27: {ref: 'msg:music-fade-custom'},
});

MSG_BY_OPCODE.set('128', {
  ...MSG_BY_OPCODE.get('12'),
  28: {ref: 'msg:callout-pos'},
  29: {ref: 'msg:callout-type'},
  30: {ref: 'msg:128-route-select'},
});

MSG_BY_OPCODE.set('13', {
  ...MSG_BY_OPCODE.get('128'),
  31: {ref: 'msg:modern-31'},
});

MSG_BY_OPCODE.set('14', {
  ...MSG_BY_OPCODE.get('13'),
  5: {ref: 'msg:hide-enemy'},
  8: {ref: 'msg:focus-enemy'},
  14: {ref: 'msg:face-enemy'},
  24: {ref: 'msg:shake-enemy'},
  20: {ref: 'msg:intro'},
  32: {ref: 'msg:modern-32'},
});

MSG_BY_OPCODE.set('143', {
  ...MSG_BY_OPCODE.get('14'),
  33: {ref: 'msg:tutorial'},
});

MSG_BY_OPCODE.set('15', {...MSG_BY_OPCODE.get('14')}); // NOT 143; tutorial is removed

MSG_BY_OPCODE.set('16', {
  ...MSG_BY_OPCODE.get('15'),
  33: {ref: 'msg:darken-portrait'},
  34: {ref: 'msg:highlight-portrait'},
  35: {ref: 'msg:lights-out'},
});

MSG_BY_OPCODE.set('165', {...MSG_BY_OPCODE.get('143')}); // VD loses all of TH16's changes; identical to ISC.
MSG_BY_OPCODE.set('17', {...MSG_BY_OPCODE.get('16')}); // But WBaWC is like HSiFS.
MSG_BY_OPCODE.set('18', {...MSG_BY_OPCODE.get('17'),
  4: {ref: 'msg:hide-player'},
  7: {ref: 'msg:focus-player'},
  13: {ref: 'msg:face-player'},
  23: {ref: 'msg:shake-player'},
  36: {ref: 'msg:store'},
});

// ==========================================================================
// ==========================================================================
// =====================    INSTRUCTION DATA    =============================

// Lookup table by ref id. (game-independent, map-independent name)
export const MSG_INS_DATA = {};

// EoSD
Object.assign(MSG_INS_DATA, {
  'end': {
    sig: '', args: [], desc: `End the script.`,
  },
  // These two are funny; clearly, ZUN anticipated eventually having multiple portraits on the same side of the screen,
  // and thus gave these two dummy arguments in MoF.  All of the other instructions related to portraits did NOT start
  // out with these arguments, and they had to be added in by later games.
  'show-player': {
    sig: 'S', args: ['who'], desc: `
    Show the player portrait.

    [tiphide]
    * ([game=10]&ndash;[game=15]) The argument is never read.
    * ([game=16]&ndash;[game=17]) If the argument is nonzero, then instead of the player, it loads a specific (hardcoded) anm script on a specific ANM file in the ECL's \`ANM\` list.  This is used to put Satono on the left in [game=16] Extra.
    * ([game=18]&ndash;) The game can now show two portraits that are both on the player side simultaneously.  [wip=1]The ANM script is no longer hardcoded; I'm not sure what the new logic does.[/wip]
    [/tiphide]
  `},
  'show-enemy': {
    sig: 'S', args: ['who'], desc: `
    Make the enemy portrait appear.

    [tiphide]
    * ([game=10]&ndash;[game=13]) The argument is never read.
    * ([game=14]&ndash;) The argument indicates which boss to show in stages that can show multiple bosses simultaneously.
    [/tiphide]
  `},
  'show-textbox': {sig: '', args: [], desc: `
    Show the text box.

    [tiphide]
    In [game=13] this becomes a nop as callouts are used instead.  (see [ref=msg:th10-callout-type])
    [/tiphide]
  `},
  'hide-player-single': {sig: '', args: [], succ: 'hide-player', desc: `Hide the player portrait.`},
  'hide-enemy-single': {
    sig: '', args: [], succ: 'hide-enemy', desc: `
    Hide the enemy portrait. [tiphide](and typically also their intro if still visible)[/tiphide]
  `},
  'hide-player': {sig: 'S', args: ['who'], desc: `Hide the player portrait (or any character on the left side).`},
  'hide-enemy': {sig: 'S', args: ['who'], desc: `Hide an enemy portrait.`},
  'hide-textbox': {sig: '', args: [], desc: `Hide the text box. (and all text on it)`},
  'focus-player-single': {sig: '', args: [], succ: 'focus-player', desc: `Indicates that the player is speaking.`},
  'focus-enemy-single': {sig: '', args: [], succ: 'focus-enemy', desc: `Indicates that the enemy is speaking.`},
  'focus-player': {sig: 'S', args: ['who'], desc: `Indicates that the player (or another character on the left side) is speaking.`},
  'focus-enemy': {sig: 'S', args: ['who'], desc: `Indicates that an enemy is speaking.`},
  'focus-none': {sig: '', args: [], desc: `
    Indicates that nobody is speaking.

    [tiphide]
    Examples: Used in [game=11] for the helper Youkai from aboveground, and in [game=13] for the message at the end of Extra that tells you how to get the secret ending.
    [/tiphide]
  `},
  'skippable': {
    sig: 'S', args: ['skippable'], desc: `
    Sets a boolean bitflag.  When the flag is 1, text can be fast-forwarded.
  `},
  'pause': {
    sig: 'S', args: ['max'], desc: `
    Waits up to some maximum number of frames for the player to press the Shoot key.

    [tiphide]
    During this time, the script timer will be frozen, so you do not need to increment
    the time label by any similar amount.
    [/tiphide]
  `},
  'ecl-resume': {
    sig: '', args: [], desc: `
    Resumes any ECL scripts that are waiting on MSG.  Often used to tell the boss when to fly onscreen.

    [tiphide]
    Specifically, this resumes ECL scripts that are using the \`dialogWait\` instruction. (instruction 519 in [game=17])
    [/tiphide]
  `},
  'face-player-single': {
    sig: 'S', args: ['face'], succ: 'face-player', desc: `
    Set the player's facial expression.
    [tiphide]The argument will be added to the ANM script index of the player's first face graphic.[/tiphide]
  `},
  'face-enemy-single': {
    sig: 'S', args: ['face'], succ: 'face-enemy', desc: `
    Set the enemy's facial expression.
    [tiphide]The argument will be added to the ANM script index of the enemy's first face graphic.[/tiphide]
  `},
  'face-player': {
    sig: 'SS', args: ['who', 'face'], desc: `
    Set the player's facial expression. (or any other character on the left side)
    [tiphide]The argument will be added to the ANM script index of the player's first face graphic.[/tiphide]
  `},
  'face-enemy': {
    sig: 'SS', args: ['who', 'face'], desc: `
    Set an enemy's facial expression.
    [tiphide]The argument will be added to the ANM script index of the enemy's first face graphic.[/tiphide]
  `},
  'text-1': {sig: 'm', args: ['text'], desc: `Set the first line of text.  Unused.`},
  'text-2': {sig: 'm', args: ['text'], desc: `Set the second line of text.  Unused.`},
  'text-add-nofuri': {
    sig: 'm', args: ['text'], succ: 'text-add', desc: `
    Sets the next line of text.
  `},
  'text-add': {
    sig: 'm', args: ['text'], desc: `
    Sets the next line of text.

    [tiphide]
    Beginning in [game=11], this instruction can also be used to set furigana.
    If the first character of the string is \`|\`, then it will set furigana for the next line.
    Each line can have at most one furigana annotation.
    [/tiphide]

    [tiphide]
    [wip]The format of furigana includes some offset information.  The meaning of these numbers is not known.[/wip]
    [code]
    [ref=msg:th10-text-add]("|0,11,シーフ");
    [ref=msg:th10-text-add]("盗賊だからなぁ");
    [/code]
    [/tiphide]
  `},
  'text-clear': {sig: '', args: [], wip: 1, desc: `
    Erases all text. (at least, that's what it does pre-[game=128])

    [tiphide]
    [wip]Beginning with [game=128] it also does something to the callout, so I'm not sure how to differentiate it from [ref=msg:th10-hide-textbox].[/wip]
    [/tiphide]

    [tiphide]
    Even though this instruction has existed since [game=10], the first game to use it is [game=13].
    [/tiphide]
  `},
  'music-boss': {sig: '', args: [], desc: `
    Initiates boss music and displays its BGM title text.
  `},
  'th10-intro': {sig: '', args: [], succ: 'intro', desc: `
    Display the enemy's name and flavor text.
  `},
  'intro': {sig: 'S', args: ['who'], desc: `
    Display an enemy's name and flavor text.
  `},
  'stage-end': {sig: '', args: [], desc: `
    Awards the stage bonus and begins the next stage.  (or ends stage practice)
  `},
  'music-fade': {sig: '', args: [], desc: `
    Fades music out at the end of the stage.

    [tiphide]
    The duration of the fade is hardcoded based on stage number.
    [/tiphide]
  `},
  'shake-player-single': {sig: '', args: [], succ: 'shake-player', desc: `
    Make the player portrait shake briefly like Nitori.
  `},
  'shake-enemy-single': {sig: '', args: [], succ: 'shake-enemy', desc: `
    Make the enemy portrait shake briefly (used by Nitori).
  `},
  'shake-player': {sig: '', args: [], desc: `
    Make all player portraits shake briefly like Nitori.
  `},
  'shake-enemy': {sig: '', args: [], desc: `
    Make all of the enemy portraits shake briefly like Nitori.
  `},
  'y-offset': {sig: 'S', args: ['dy'], desc: `
    Adds a vertical offset to the position of all text.

    [tiphide]
    This sets the y-component of [\`pos_2\`](#anm/concepts&a=position).
    [/tiphide]
  `},
  'modern-26': {sig: '', args: [], wip: 2, desc: `
    Sets an unknown bitflag to 1.
  `},
  'music-fade-custom': {
    sig: 'f', args: ['duration'], desc: `
    Fades music out over a user-supplied time interval.
  `},
  'callout-pos': {
    sig: 'ff', args: ['x', 'y'], desc: `
    Sets the position of the callout.

    [tiphide]
    [wip]What anchor point (presumably center)?  What coordinate system (presumably arcade-region coords)?[/wip]
    [/tiphide]
  `},
  'callout-type': {
    sig: 'S', args: ['value'], desc: `
    Sets the callout type.

    [tiphide]
    The callout type determines the following:
    * The shape of the callout.  E.g. rounded rectangle (normal), spikey (shouting), thought bubble.
    * ([game=13]&ndash;) The height of the callout. (1 or 2 lines)
    * ([game=17]) The background color. (red for beast speaking)
    It does not determine the width (this is automatically computed) or the placement of the callout "tip".
    [/tiphide]

    [tiphide]
    You can generally find out all available callout types by looking at \`face/balloon.png\` or \`face/balloon_1024.png\` in \`front.anm\`.
    [/tiphide]
  `},
  '128-route-select': {
    sig: '', args: [], desc: `
    Used in the first stage of GFW to let the player pick the second stage.

    [tiphide]
    In games after GFW, this is a no-op.
    [/tiphide]
  `},
  'modern-31': {
    sig: 'S', args: ['unused'], wip: 2, desc: `
    [wip=2]Unknown. Only used in [game=13] stage 4. Argument appears unused.[/wip]
  `},
  'modern-32': {
    sig: 'S', args: ['side'], wip: 2, desc: `
    [wip=2]Unknown. Only used in [game=14] Extra.[/wip]

    [tiphide]
    [wip=2]The argument sets the current speaker, similar to [ref=msg:focus-player] and [ref=msg:focus-boss][/wip]
    [/tiphide]
  `},
  'tutorial': {
    sig: 'S', args: ['id'], desc: `
    Initiates a tutorial in scene games.

    [tiphide]
    Note this is a **completely different instruction** from the \`ins_33\` found in [game=16] (which is [ref=msg:darken-portrait]).
    [/tiphide]
  `},
  'darken-portrait': {
    sig: 'SS', args: ['side', 'who'], desc: `
    Darkens a single portrait without changing the active speaker.

    [tiphide]
    If \`side\` is 0, it darkens the player portrait.  If the first argument is nonzero, it darkens the enemy portrait indexed by \`who\`.
    [/tiphide]

    [tiphide]
    Note this is a **completely different instruction** from the \`ins_33\` found in [game=143] and [game=165] (which is [ref=msg:tutorial]),
    and on top of that it is entirely unused!
    [/tiphide]
  `},
  'highlight-portrait': {
    sig: 'SS', args: ['side', 'who'], desc: `
    Highlight a single portrait as if they are speaking (but without changing the active speaker).

    [tiphide]
    If \`side\` is 0, it highlights the player portrait.  If the first argument is nonzero, it highlights the enemy portrait indexed by \`who\`.
    [/tiphide]

    [tiphide]
    This is used in [game=16] Cirno Stage 1 to make Cirno and Eternity shout in unison at each other.
    [/tiphide]
  `},
  'lights-out': {
    sig: '', args: [], desc: `
    Covers the stage background and enemies in black.

    [tiphide]
    Used at the end of [game=16] Cirno stage 4.
    [/tiphide]
  `},
  'store': {
    sig: '', args: [], desc: `
    Opens the ability card store. ([game=18] only)
  `},
});

for (const [key, value] of Object.entries(MSG_INS_DATA)) {
  value.wip = value.wip || 0;
  if (value.desc === undefined) window.console.error(`TABLE CORRUPT: msg ref ${key} has no 'desc'`);
  if (value.sig === undefined) window.console.error(`TABLE CORRUPT: msg ref ${key} has no 'sig'`);
  if (value.sig != null && value.args === undefined) window.console.error(`TABLE CORRUPT: msg ref ${key} has no 'args'`);
  if (value.sig && value.sig.length !== value.args.length) {
    window.console.error(`TABLE CORRUPT: msg ref ${key} has arg count mismatch`);
  }

  // automatically remove tips from self-references
  const re = new RegExp(`\\[ref=msg:${key}\\]`, 'g');
  value.desc = value.desc.replace(re, `[tip-nodeco=YOU ARE HERE][ref-notip=msg:${key}][/tip-nodeco]`);

  value.desc = dedent(value.desc);
}
