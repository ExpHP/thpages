import {mapAssign} from '~/js/util';
import dedent from '~/js/lib/dedent';

import type {PartialInsData, PartialOpcodeRefData} from '../tables';
import {Game} from '../game';

// Info for the AI:
// Full list of games:
//    06, 07, 08, 09, 095, 10, 11, 12, 125, 128, 13, 14, 143, 15, 16, 165, 17, 18, 185
//
// 06-095, 125, 143, 165 DO NOT HAVE END.
//
// zero's instruction mappings:
// ALL GAMES THAT HAVE AN END FORMAT SHARE THE SAME MAPPINGS.
//    0 = end_delete()
//    3 = text_dialogue(string text)
//    4 = text_clear()
//    5 = wait(int max)
//    6 = __wait_clear(int max)
//    7 = anm_source_load(int source_index, string file)
//    8 = anm_set_slot(int slot, int source_index, int script)
//    9 = text_color(int color)
//    10 = music(string file)
//    11 = music_fade()
//    12 = __end_switch_to_staff(string end_file)
//    13 = __screen_effect_A(int unk)
//    14 = __screen_effect_B(int unk)
//    15 = anm_set_slot_normal(int slot, int source_index, int script)
//    16 = anm_set_slot_hard(int slot, int source_index, int script)
//    17 = anm_set_slot_lunatic(int slot, int source_index, int script)
//
// Format characters:
//    S = int
//    f = float
//    m = string

// ==========================================================================
// ==========================================================================
// ===================         INFO TEXT            =========================

export function getMsgTableText(game: Game) {
  const furiTip = `"
    After an instruction that contains furigana, the string argument in the NEXT instruction
    will contain extra garbage.  Basically, after applying the XOR mask to the data,
    you will find a copy of the encrypted bytes from the furigana string after
    the null terminator.  This is likely a bug in ZUN&#39;s compiler.
    "`;

  let furibug = '';
  if ('20' <= game) {
    furibug = `:game[20] and onwards additionally have :tip[an unusual quirk]{tip=${furiTip}} near furigana strings.`;
  }
  return dedent(`
    > **Notice:** END files are (de-)compiled by \`trumsg --end\`.
    >
    > ...or, they *will* be, once I add the necessary core mapfiles, which so far I have... not.  In the meanwhile
    > you can run trumsg with a mapfile containing END signatures using the \`-m\` flag.

    * Most strings are null-terminated and null-padded
      up to a multiple of 4 bytes, and are encoded in Shift-JIS.
    * For :ref[end:text-add] **only**, the string is also then masked the same as MSG: by XOR with an
      accelerating bitmask with initial value \`0x77\`, intial velocity \`0x07\`, and constant acceleration \`0x10\`.
      Specifically, the first byte is XORed with \`0x77\`, the second byte is XORed with
      \`0x7e (= 0x77 + 0x07)\`, the third byte is XORed with \`0x95 (= 0x77 + 0x07 + 0x17)\`,
      the fourth byte is XORed with \`0x27 (= 0x77 + 0x07 + 0x17 + 0x27)\`, and so on...

    ${furibug}
  `);
}

// ==========================================================================
// ==========================================================================
// ===================    LOOKUP TABLE BY OPCODE    =========================

export const refByOpcode = new Map<Game, Map<number, PartialOpcodeRefData>>();

const SHARED_END_OPCODE_MAP = new Map<number, PartialOpcodeRefData>([
  [0, {ref: 'end:delete'}],
  [3, {ref: 'end:text-add'}],
  [4, {ref: 'end:text-clear'}],
  [5, {ref: 'end:wait'}],
  [6, {ref: 'end:wait-clear'}],
  [7, {ref: 'end:anm-source-load'}],
  [8, {ref: 'end:anm-set-slot'}],
  [9, {ref: 'end:text-color'}],
  [10, {ref: 'end:music'}],
  [11, {ref: 'end:music-fade'}],
  [12, {ref: 'end:switch-to-staff'}],
  [13, {ref: 'end:screen-effect-a'}],
  [14, {ref: 'end:screen-effect-b'}],
  [15, {ref: 'end:anm-set-slot-normal'}],
  [16, {ref: 'end:anm-set-slot-hard'}],
  [17, {ref: 'end:anm-set-slot-lunatic'}],
]);

for (const game of ['10', '11', '12', '128', '13', '14', '15', '16', '17', '18'] as const) {
  refByOpcode.set(game, new Map(SHARED_END_OPCODE_MAP));
}

// ==========================================================================
// ==========================================================================
// =====================    INSTRUCTION DATA    =============================

// Lookup table by ref id. (game-independent, map-independent name)
export const byRefId = new Map<string, PartialInsData>();

mapAssign(byRefId, {
  'delete': {
    sig: '', args: [], md: `Completely kills the script engine.`,
  },
  'text-add': {
    sig: 'm', args: ['text'], md: `
    :tipshow[Sets the next line of text.]

    **Reminder:** This instruction--and only this instruction--masks its string. (see top of page)

    <!-- WHEN TH20 is added, uncomment the following:
      Beginning in :game[20], this instruction can also be used to set furigana.
      If the first character of the string is \`|\`, then it will set furigana for the next line.
      Each line can have at most one furigana annotation.
    -->

    <!-- :game[18] and :game[20] have 5 lines. -->
    * :game[18] has 5 lines.
    * :wip[The counts for the other games is pending research.]

    After writing the last line, the "next line" index wraps to 0 and a flag is set.  The next call to :ref[end:text-add]
    will clear all lines before writing the first line.

    <!-- TH20 and beyond:

    The format of furigana includes some offset information.
    ~~~anm
    :ref{r=end:text-add}("|0,11,シーフ");
    :ref{r=end:text-add}("盗賊だからなぁ");
    ~~~
    These parameters are \`|xoffset,spacing,\`.
    (these are standard parameters to the function that draws lines of text;
    for point of reference, on non-furigana lines they are both 0.)
    -->

    <!-- fix all the commented stuff when updating to TH20 -->
    <!-- NEWHU: 185 -->
  `,
  },
  'text-clear': {
    sig: '', args: [], wip: 1, md: `
    Hides all text.

    The "next line" counter does not get reset to 0, making it awkward to use.  The games don't appear to be using it.

    :wip2[Validate this disuse when END stats are added?]
  `,
  },
  'wait': {
    sig: 'S', args: ['max'], md: `
    :tipshow[Waits up to some maximum number of frames for the player to press the Shoot key.]

    During this time, the script timer will be frozen, so you do not need to increment
    the time label by any similar amount.
  `,
  },
  'wait-clear': {
    sig: 'S', args: ['max'], md: `
    :tipshow[Waits up to some maximum number of frames for the player to press the Shoot key.]

    During this time, the script timer will be frozen, so you do not need to increment
    the time label by any similar amount.

    The next call to :ref[end:text-add] will clear all lines and begin at index 0.
    `,
  },
  'anm-source-load': {
    sig: 'Sm', args: ['source_index', 'file'], wip: 1, md: ``,
  },
  'anm-set-slot': {
    sig: 'SSS', args: ['slot', 'source_index', 'script'], wip: 1, md: ``,
  },
  'text-color': {
    sig: 'S', args: ['color'], md: `Euh. Color.`,
  },
  'music': {
    sig: 'm', args: ['file'], md: `
    :tipshow[Begins playing music and unlocks it in the sound player.] Only a limited set of songs can be played.

    * :game[18]: If file is 'bgm/th18_15' it plays track 15 (ending), for anything else it plays track 16 (staff roll).
    * :wip[Songs available in other games may vary; this is pending research.]
  `,
  },
  'music-fade': {
    sig: '', args: [], md: `
    :tipshow[Fades music out at the end of the stage.]

    * In :game[18], the fade is hardcoded to last 3 seconds.
    * :wip[Durations for other games are pending research.]
  `,
  },
  'switch-to-staff': {
    sig: 'm', args: ['end_file'], md: `Begin the staff roll.`,
  },
  'screen-effect-a': {
    sig: 'S', args: ['unk'], wip: 2, md: `Does. Something.`,
  },
  'screen-effect-b': {
    sig: 'S', args: ['unk'], wip: 2, md: `Does. Something.`,
  },
  'anm-set-slot-normal': {
    sig: 'SSS', args: ['slot', 'source_index', 'script'], md: `
    Identical to :ref[end:anm-set-slot], but only runs on NORMAL difficulty.
  `,
  },
  'anm-set-slot-hard': {
    sig: 'SSS', args: ['slot', 'source_index', 'script'], md: `
    Identical to :ref[end:anm-set-slot], but only runs on HARD difficulty.
  `,
  },
  'anm-set-slot-lunatic': {
    sig: 'SSS', args: ['slot', 'source_index', 'script'], md: `
    Identical to :ref[end:anm-set-slot], but only runs on LUNATIC difficulty.
  `,
  },
});
