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
export const MSG_BY_OPCODE = new Map(); // has to be a map because 'integer' keys defy insertion order

MSG_BY_OPCODE.set('06', {
  // TODO
});

MSG_BY_OPCODE.set('10', {
  0: 'end',
  1: 'th10-show-player',
  2: 'th10-show-enemy',
  3: 'th10-show-textbox',
  4: 'th10-hide-player',
  5: 'th10-hide-enemy',
  6: 'th10-hide-textbox',
  7: 'th10-focus-player',
  8: 'th10-focus-enemy',
  9: 'th10-skippable',
  10: 'th10-pause',
  11: 'th10-enemy-appear',
  12: 'th10-face-player',
  13: 'th10-face-enemy',
  14: 'th10-text-1',
  15: 'th10-text-2',
  16: 'th10-text-add-nofuri',
  17: 'th10-text-clear',
  18: 'th10-music-boss',
  19: 'th10-intro',
  20: 'th10-stage-bonus',
  21: 'th10-music-fade',
  22: 'th10-shake-player',
  23: 'th10-shake-enemy',
});
MSG_BY_OPCODE.set('11', {
  0: 'end',
  1: 'th10-show-player',
  2: 'th10-show-enemy',
  3: 'th10-show-textbox',
  4: 'th10-hide-player',
  5: 'th10-hide-enemy',
  6: 'th10-hide-textbox',
  7: 'th10-focus-player',
  8: 'th10-focus-enemy',
  9: 'th10-focus-youkai',
  10: 'th10-skippable',
  11: 'th10-pause',
  12: 'th10-enemy-appear',
  13: 'th10-face-player',
  14: 'th10-face-enemy',
  15: 'th10-text-1',
  16: 'th10-text-2',
  17: 'th10-text-add',
  18: 'th10-text-clear',
  19: 'th10-music-boss',
  20: 'th10-intro',
  21: 'th10-stage-bonus',
  22: 'th10-music-fade',
  23: 'th10-shake-player',
  24: 'th10-shake-enemy',
  25: 'th10-y-offset',
  26: 'th10-flag-2',
});

// ==========================================================================
// ==========================================================================
// =====================    INSTRUCTION DATA    =============================

// Lookup table by ref id. (game-independent, map-independent name)
export const MSG_INS_DATA = {};

// EoSD
Object.assign(MSG_INS_DATA, {
  'end': {
    sig: '', args: [], desc: `End the script.`
  },
  'th10-show-player': {
    sig: 'S', args: ['unused'], desc: `Show the player portrait.  The argument is never read.`,
  },
  'th10-show-enemy': {
    sig: 'S', args: ['unused'], desc: `Show the enemy portrait.  The argument is never read.`,
  },
  'th10-show-textbox': {sig: '', args: [], desc: `Show the text box.`},
  'th10-hide-player': {sig: '', args: [], desc: `Hide the player portrait.`},
  'th10-hide-enemy': {sig: '', args: [], desc: `Hide the enemy portrait.`},
  'th10-hide-textbox': {sig: '', args: [], desc: `Hide the text box.`},
  'th10-focus-player': {sig: '', args: [], desc: `Indicates that the player is speaking.`},
  'th10-focus-enemy': {sig: '', args: [], desc: `Indicates that the enemy is speaking.`},
  'th10-focus-youkai': {sig: '', args: [], wip: 1, desc: `[wip]Probably indicates that the youkai ally from aboveground is speaking.[/wip]`},
  'th10-skippable': {
    sig: 'S', args: ['skippable'], desc: `
    Sets a boolean bitflag.  When the flag is 1, text can be fast-forwarded.
  `},
  'th10-pause': {
    sig: 'S', args: ['max'], desc: `
    Waits up to some maximum number of frames for the player to press the Shoot key.

    [tiphide]
    During this time, the script timer will be frozen, so you do not need to increment
    the time label by any similar amount.
    [/tiphide]
  `},
  'th10-enemy-appear': {
    sig: '', args: [], desc: `
    [wip]Bears a resemblance to enemyAppear from earlier games.  Never used.[/wip]
  `},
  'th10-face-player': {
    sig: 'S', args: ['id'], desc: `
    Set the player's facial expression.
    [tiphide]The argument will be added to the ANM script index of the player's first face graphic.[/tiphide]
  `},
  'th10-face-enemy': {
    sig: 'S', args: ['id'], desc: `
    Set the enemy's facial expression.
    [tiphide]The argument will be added to the ANM script index of the enemy's first face graphic.[/tiphide]
  `},
  'th10-text-1': {sig: 'm', args: ['text'], desc: `Set the first line of text.  Unused.`},
  'th10-text-2': {sig: 'm', args: ['text'], desc: `Set the second line of text.  Unused.`},
  'th10-text-add-nofuri': {
    sig: 'm', args: ['text'], succ: 'th10-text-add', desc: `
    Sets the next line of text.
  `},
  'th10-text-add': {
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
  'th10-text-clear': {sig: '', args: [], desc: `Erases all text. Unused.`},
  'th10-music-boss': {sig: '', args: [], desc: `
    Initiates boss music and displays its BGM title text.
  `},
  'th10-intro': {sig: '', args: [], desc: `Display the enemy's name and flavor text.`},
  'th10-stage-bonus': {sig: '', args: [], wip: 1, desc: `
    Awards the player points for completing a stage.

    [tiphide]
    [wip]Unlike [ref=msg:th06-stage-next], I don't think this plays any role in actually sending you to the next stage?  Haven't tested.[/wip]
    [/tiphide]
  `},
  'th10-music-fade': {sig: '', args: [], desc: `
    Fades music out at the end of the stage.

    [tiphide]
    The duration of the fade is hardcoded based on stage number.
    [/tiphide]
  `},
  'th10-shake-player': {sig: '', args: [], desc: `
    Make the player portrait shake briefly.
  `},
  'th10-shake-enemy': {sig: '', args: [], desc: `
    Make the enemy portrait shake briefly.  Nitori uses this when you first see her.
  `},
  'th10-y-offset': {sig: 'S', args: ['dy'], desc: `
    Adds a vertical offset to the position of all text.

    [tiphide]
    This sets the y-component of [\`pos_2\`](#anm/concepts&a=position).
    [/tiphide]
  `},
  'th10-flag-2': {sig: '', args: [], wip: 2, desc: `
    Sets an unknown bitflag to 1.
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
