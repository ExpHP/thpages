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

MSG_BY_OPCODE.set('06', {
  // TODO
});

MSG_BY_OPCODE.set('10', {
  0: 'modern-end',
  1: 'modern-show-player',
  2: 'th10-show-enemy',
  3: 'modern-show-textbox',
  4: 'modern-hide-player',
  5: 'th10-hide-enemy',
  6: 'modern-hide-textbox',
  7: 'modern-focus-player',
  8: 'th10-focus-enemy',
  9: 'modern-skippable',
  10: 'modern-pause',
  11: 'modern-ecl-resume',
  12: 'modern-face-player',
  13: 'th10-face-enemy',
  14: 'modern-text-1',
  15: 'modern-text-2',
  16: 'modern-text-add-nofuri',
  17: 'modern-text-clear',
  18: 'modern-music-boss',
  19: 'th10-intro',
  20: 'modern-stage-end',
  21: 'modern-music-fade',
  22: 'modern-shake-player',
  23: 'modern-shake-enemy',
});
MSG_BY_OPCODE.set('11', {
  0: 'modern-end',
  1: 'modern-show-player',
  2: 'th10-show-enemy',
  3: 'modern-show-textbox',
  4: 'modern-hide-player',
  5: 'th10-hide-enemy',
  6: 'modern-hide-textbox',
  7: 'modern-focus-player',
  8: 'th10-focus-enemy',
  9: 'modern-focus-none',
  10: 'modern-skippable',
  11: 'modern-pause',
  12: 'modern-ecl-resume',
  13: 'modern-face-player',
  14: 'th10-face-enemy',
  15: 'modern-text-1',
  16: 'modern-text-2',
  17: 'modern-text-add',
  18: 'modern-text-clear',
  19: 'modern-music-boss',
  20: 'th10-intro',
  21: 'modern-stage-end',
  22: 'modern-music-fade',
  23: 'modern-shake-player',
  24: 'modern-shake-enemy',
  25: 'modern-y-offset',
  26: 'modern-flag-2',
});

MSG_BY_OPCODE.set('12', {
  ...MSG_BY_OPCODE.get('11'),
  27: 'modern-music-fade-custom',
});

MSG_BY_OPCODE.set('128', {
  ...MSG_BY_OPCODE.get('12'),
  28: 'modern-callout-pos',
  29: 'modern-callout-type',
  30: '128-route-select',
});

MSG_BY_OPCODE.set('13', {
  ...MSG_BY_OPCODE.get('128'),
  31: 'modern-31',
});

MSG_BY_OPCODE.set('14', {
  ...MSG_BY_OPCODE.get('13'),
  2: 'modern-show-enemy',
  5: 'modern-hide-enemy',
  8: 'modern-focus-enemy',
  14: 'modern-face-enemy',
  20: 'modern-intro',
  32: 'modern-32',
});

MSG_BY_OPCODE.set('143', {
  ...MSG_BY_OPCODE.get('14'),
  33: 'modern-tutorial',
});

MSG_BY_OPCODE.set('15', {...MSG_BY_OPCODE.get('14')}); // NOT 143; tutorial is removed

MSG_BY_OPCODE.set('16', {
  ...MSG_BY_OPCODE.get('15'),
  33: 'modern-darken-portrait',
  34: 'modern-highlight-portrait',
  35: 'modern-lights-out',
});

MSG_BY_OPCODE.set('165', {...MSG_BY_OPCODE.get('143')}); // VD loses all of TH16's changes; identical to ISC.
MSG_BY_OPCODE.set('17', {...MSG_BY_OPCODE.get('16')}); // But WBaWC is like HSiFS.

// ==========================================================================
// ==========================================================================
// =====================    INSTRUCTION DATA    =============================

// Lookup table by ref id. (game-independent, map-independent name)
export const MSG_INS_DATA = {};

// EoSD
Object.assign(MSG_INS_DATA, {
  'modern-end': {
    sig: '', args: [], desc: `End the script.`,
  },
  'modern-show-player': {
    sig: 'S', args: ['silly'], desc: `
    Show the player portrait.

    [tiphide]
    * ([game=10]&ndash;[game=th15]) The argument is never read.
    * ([game=16]&ndash;) If the argument is nonzero, it instead loads a specific (hardcoded) anm script on a specific ANM file in the ECL's \`ANM\` list.  This is used to put Satono on the left in [game=16] Extra.
    [/tiphide]
  `},
  'th10-show-enemy': {
    sig: 'S', args: ['unused'], succ: 'modern-show-enemy', desc: `Show the enemy portrait.  The argument is never read.`,
  },
  'modern-show-enemy': {
    sig: 'S', args: ['who'], desc: `Show the enemy portrait.  The argument is for stages with multiple boss characters.`,
  },
  'modern-show-textbox': {sig: '', args: [], desc: `
    Show the text box.

    [tiphide]
    In [game=th13] this becomes a nop as callouts are used instead.  (see [ref=msg:th10-callout-type])
    [/tiphide]
  `},
  'modern-hide-player': {sig: '', args: [], desc: `Hide the player portrait.`},
  'th10-hide-enemy': {
    sig: '', args: [], succ: 'modern-hide-enemy', desc: `
    Hide the enemy portrait. [tiphide](and typically also their intro if still visible)[/tiphide]
  `},
  'modern-hide-enemy': {sig: 'S', args: ['who'], desc: `Hide an enemy portrait.`},
  'modern-hide-textbox': {sig: '', args: [], desc: `Hide the text box. (and all text on it)`},
  'modern-focus-player': {sig: '', args: [], desc: `Indicates that the player is speaking.`},
  'th10-focus-enemy': {sig: '', args: [], succ: 'modern-focus-enemy', desc: `Indicates that the enemy is speaking.`},
  'modern-focus-enemy': {sig: 'S', args: ['who'], desc: `Indicates that an enemy is speaking.`},
  'modern-focus-none': {sig: '', args: [], desc: `
    Indicates that nobody is speaking.

    [tiphide]
    Examples: Used in [game=11] for the helper Youkai from aboveground, and in [game=13] for the message at the end of Extra that tells you how to get the secret ending.
    [/tiphide]
  `},
  'modern-skippable': {
    sig: 'S', args: ['skippable'], desc: `
    Sets a boolean bitflag.  When the flag is 1, text can be fast-forwarded.
  `},
  'modern-pause': {
    sig: 'S', args: ['max'], desc: `
    Waits up to some maximum number of frames for the player to press the Shoot key.

    [tiphide]
    During this time, the script timer will be frozen, so you do not need to increment
    the time label by any similar amount.
    [/tiphide]
  `},
  'modern-ecl-resume': {
    sig: '', args: [], desc: `
    Resumes any ECL scripts that are waiting on MSG.  Often used to tell the boss when to fly onscreen.

    [tiphide]
    Specifically, this resumes ECL scripts that are using the \`dialogWait\` instruction. (instruction 519 in [game=17])
    [/tiphide]
  `},
  'modern-face-player': {
    sig: 'S', args: ['face'], desc: `
    Set the player's facial expression.
    [tiphide]The argument will be added to the ANM script index of the player's first face graphic.[/tiphide]
  `},
  'th10-face-enemy': {
    sig: 'S', args: ['face'], succ: 'modern-face-enemy', desc: `
    Set the enemy's facial expression.
    [tiphide]The argument will be added to the ANM script index of the enemy's first face graphic.[/tiphide]
  `},
  'modern-face-enemy': {
    sig: 'S', args: ['who', 'face'], desc: `
    Set an enemy's facial expression.
    [tiphide]The argument will be added to the ANM script index of the enemy's first face graphic.[/tiphide]
  `},
  'modern-text-1': {sig: 'm', args: ['text'], desc: `Set the first line of text.  Unused.`},
  'modern-text-2': {sig: 'm', args: ['text'], desc: `Set the second line of text.  Unused.`},
  'modern-text-add-nofuri': {
    sig: 'm', args: ['text'], succ: 'modern-text-add', desc: `
    Sets the next line of text.
  `},
  'modern-text-add': {
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
  'modern-text-clear': {sig: '', args: [], wip: 1, desc: `
    Erases all text. (at least, that's what it does pre-[game=128])

    [tiphide]
    [wip]Beginning with [game=128] it also does something to the callout, so I'm not sure how to differentiate it from [ref=msg:th10-hide-textbox].[/wip]
    [/tiphide]

    [tiphide]
    Even though this instruction has existed since [game=10], the first game to use it is [game=13].
    [/tiphide]
  `},
  'modern-music-boss': {sig: '', args: [], desc: `
    Initiates boss music and displays its BGM title text.
  `},
  'th10-intro': {sig: '', args: [], succ: 'modern-intro', desc: `
    Display the enemy's name and flavor text.
  `},
  'modern-intro': {sig: 'S', args: ['who'], desc: `
    Display an enemy's name and flavor text.
  `},
  'modern-stage-end': {sig: '', args: [], desc: `
    Awards the stage bonus and begins the next stage.  (or ends stage practice)
  `},
  'modern-music-fade': {sig: '', args: [], desc: `
    Fades music out at the end of the stage.

    [tiphide]
    The duration of the fade is hardcoded based on stage number.
    [/tiphide]
  `},
  'modern-shake-player': {sig: '', args: [], desc: `
    Make the player portrait shake briefly like Nitori.
  `},
  'th10-shake-enemy': {sig: '', args: [], succ: 'modern-shake-enemy', desc: `
    Make the enemy portrait shake briefly (used by Nitori).
  `},
  'modern-shake-enemy': {sig: '', args: [], desc: `
    Make all of the enemy portraits shake briefly like Nitori.
  `},
  'modern-y-offset': {sig: 'S', args: ['dy'], desc: `
    Adds a vertical offset to the position of all text.

    [tiphide]
    This sets the y-component of [\`pos_2\`](#anm/concepts&a=position).
    [/tiphide]
  `},
  'modern-flag-2': {sig: '', args: [], wip: 2, desc: `
    Sets an unknown bitflag to 1.
  `},
  'modern-music-fade-custom': {
    sig: 'f', args: ['duration'], desc: `
    Fades music out over a user-supplied time interval.
  `},
  'modern-callout-pos': {
    sig: 'ff', args: ['x', 'y'], desc: `
    Sets the position of the callout.

    [tiphide]
    [wip]What anchor point (presumably center)?  What coordinate system (presumably arcade-region coords)?[/wip]
    [/tiphide]
  `},
  'modern-callout-type': {
    sig: 'S', args: ['value'], desc: `
    Sets the callout type.

    [tiphide]
    The callout type determines the following:
    * The shape of the callout.  E.g. rounded rectangle (normal), spikey (shouting), thought bubble.
    * ([game=13]&ndash;) The height of the callout. (1 or 2 lines)
    * ([game=th17]) The background color. (red for beast speaking)
    It does not determine the width (this is automatically computed) or the placement of the callout "tip".
    [/tiphide]

    [tiphide]
    You can generally find out all available callout types by looking at \`face/balloon.png\` or \`face/balloon_1024.png\` in \`front.anm\`.
    [/tiphide]
  `},
  'th128-route-select': {
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
    [wip=2]The argument sets the current speaker, similar to [ref=msg:modern-focus-player] and [ref=msg:modern-focus-boss][/wip]
    [/tiphide]
  `},
  'modern-tutorial': {
    sig: 'S', args: ['id'], desc: `
    Initiates a tutorial in scene games.

    [tiphide]
    Note this is a **completely different instruction** from the \`ins_33\` found in [game=16] (which is [ref=msg:modern-darken-portrait]).
    [/tiphide]
  `},
  'modern-darken-portrait': {
    sig: 'SS', args: ['side', 'who'], desc: `
    Darkens a single portrait without changing the active speaker.

    [tiphide]
    If \`side\` is 0, it darkens the player portrait.  If the first argument is nonzero, it darkens the enemy portrait indexed by \`who\`.
    [/tiphide]

    [tiphide]
    Note this is a **completely different instruction** from the \`ins_33\` found in [game=143] and [game=165] (which is [ref=msg:modern-tutorial]),
    and on top of that it is entirely unused!
    [/tiphide]
  `},
  'modern-highlight-portrait': {
    sig: 'SS', args: ['side', 'who'], desc: `
    Highlight a single portrait as if they are speaking (but without changing the active speaker).

    [tiphide]
    If \`side\` is 0, it highlights the player portrait.  If the first argument is nonzero, it highlights the enemy portrait indexed by \`who\`.
    [/tiphide]

    [tiphide]
    This is used in [game=16] Cirno Stage 1 to make Cirno and Eternity shout in unison at each other.
    [/tiphide]
  `},
  'modern-lights-out': {
    sig: '', args: [], desc: `
    Covers the stage background and enemies in black.

    [tiphide]
    Used at the end of [game=16] Cirno stage 4.
    [/tiphide]
  `},
});

// Add `minGame` and `maxGame` keys to each crossref.
for (const [game, table] of MSG_BY_OPCODE.entries()) {
  for (const [opcodeStr, {ref}] of Object.entries(table)) {
    if (ref === null) continue;
    const id = ref.substring('msg:'.length);
    const entry = MSG_INS_DATA[id];

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
