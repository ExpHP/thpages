[title=bullet_cap patch]

# `ExpHP/bullet_cap`

**Available through thcrap.**

**Supports:** TH10&ndash;TH14, TH125, TH128, TH143, TH17<br>
**In Beta:** TH07, TH08, TH15, TH16. [Please report bugs!](https://github.com/ExpHP/thcrap-patches/issues/new) <br>
**In Alpha:** TH165. [See disclaimer!](#vd)

<img alt="screenshot showing an obscene number of bullets, from Momiji maybe?" height="250" src="./content/mods/img/bullet-cap.png">

This patch can be used to increase or reduce the following caps:

* **Bullet cap** (1536 in IN, 2000 in all games TH10-TH17).
* **Laser cap** (256 in MoF, 512 in WBaWC).
* **Cancel item cap** (2048 in MoF, 4096 in WBaWC).

**By default, all three caps will be increased by a factor of 16.**  This should be enough for any humanly-playable ultra patch. (total cheesefests aside)

---

## Configuration

This patch relies on thcrap codecaves for configuration.  Limits can be configured by writing another thcrap patch to apply after this patch.  In that patch, you can put the the following in `<patch>/global.js` (or e.g. `<patch>/th11.v1.00a.js` to configure per-game):

[code=json]
{"codecaves": {
    "bullet-cap": "00007d00",
    "laser-cap": "00001000",
    "cancel-cap": "00008000"
}}
[/code]

The strings (which must contain 8 hexadecimal characters) are 4-byte integers encoded in **big-endian hexadecimal**.  The example value shown here is `0x7d00` bullets, `0x1000` lasers, and `0x8000` cancel items, which are the default settings in this patch for MoF.  **NOTICE:** There are currently some technical limitations in specific games, due to how the compiler compiled various loops:

* Various games may crash if a cap is set to zero.
* In **TH13**, `bullet-cap` must be divisible by 5.
* In **TH13**, `cancel-cap` must be divisible by 4.

## Additional options

Here are some additional options, with their default values.  As above, all strings must be zero-padded to the correct number of digits, and all integers are big endian hexadecimal.

[code=json]
{"codecaves": {
    "bullet-cap-config.anm-search-lag-spike-size": "00002000"
}}
[/code]

* **`bullet-cap-config.anm-search-lag-spike-size`**:  This patch automatically softens some quadratic lag spike behavior when canceling many bullets in the following games: MoF, SA, TD.  You can configure the softening here; bigger number here = more lag. `"00000000"` will remove the lag spikes completely, while `"7fffffff"` will bring back the full vanilla behavior.<br>
  *Compatability note: This option was previously named `bullet-cap-config.mof-sa-lag-spike-size`. This old name is still supported for backwards compatibility but is deprecated.*

---

# QnA

## Some games are "in beta"? What does that mean?

Basically, these games may still undergo replay-breaking changes at some point in the future.  While I've tested them pretty thoroughly, they are more complicated than the other games and there may still be bugs.  So I'd like to see some other people playtesting them before I declare them as "TAS-ready."

LoLK and onwards are also difficult because of additional arrays that are related to pointdevice.

## <span id="vd"></span> And VD is in alpha?!

I have only given [game=165] superficial playtesting and have little desire to go further.  If you use it you're basically signing up as my guinea pig.

In addition to still having the bullet pointdevice array, [game=165] is made even worse by its camera charge items having a cap of 200.  It is very difficult to locate all of the places where this cap appears in the code.  If I missed any, then that part of the code is likely to crash when using a reduced cap, and to produce fewer items than expected when using an increased cap.

## "Cancel item cap"?

In all games from [game=10] onwards, cancel items live in a separate array from normal items.  I am simply referring to the length of this array.

In [game-th=06]&ndash;[game-th=08], there is only one item array.  For these games, `cancel-cap` basically acts as a general item cap then.

## GFW has huge lag spikes when I freeze many bullets!

Correct.

## I see an enemy onscreen that won't disappear!

This is a known bug that can affect games TH14 and onwards.  It is due to ANM id collisions, and is impossible to resolve without some heavy reworking of how the game assigns these ids.

## (TH15-165) The game crashes when I Esc-R, or exit to main menu and start another game

I've observed this happening in TH16.  Ironically, I believe the cause of the crash is related to a fix for some vanilla crashes in these games.  (But I figure, a crash on restarting is a lot less terrible than a crash *during* gameplay!).  I'll fix it if I can find time later.

[more]
Basically it's a failed `malloc` for one of the enlarged globals (`BulletManager` or `ItemManager`).  Pointdevice and copious amounts of wasted space on the Bullet struct in these three games make the structs obscenely large (312 MiB BulletManager for 16x cap in TH16!).  It only seems to crash if you've at some point had an extremely large cancel producing lots of VMs, suggesting that part of the issue is the buffers left behind by `ExpHP/anm_leak` (the fix for the vanilla crashes).  Most likely, they're making it difficult for the OS to find large enough contiguous regions of the 32-bit address space so that everything can have all the memory it needs when it reallocates them all on a reset.
[/more]

## If the laser cap is too small during the Prismriver's last spell or PCB's manji spells, the game crashes on exiting the stage

Yes, I noticed.  What on earth could the game possibly be doing to lasers at this strange point in time?  Is it even my responsibility to fix it, or should we just accept that bad things happen if ECL scripts expect lasers to exist when they do not?  Hey, why are you playing with a small laser cap, anyways?  And why am I using this README as an issue tracker when there's a perfectly good tracker on GitHub?

Honey, there's some things the world just may never know.

---

# Dev considerations

## How does it work?

*Hoo boy.*  So, basically, bullets are stored in a big array on one of the game's global objects.  Because the array is in the middle of the object (and the object is used for other purposes), we can't just easily e.g. replace a pointer with our own allocation.  However, generally speaking, there are only a small number of fields after the array. So......

Basically, this patch changes the size of that array by searching for and replacing a whole bunch of dword-sized values all over the program.  E.g. in SA it does a search and replace for the integer 2000, for the integer 2001, for the integer 0x46d678 (the size of the struct with the array), for the integer 0x46d216 (the offset where a sentinel value is written that marks the final array entry), and etc.

*Astonishingly,* this works.

Granted, obviously, not every instance of the number 2000 is related to bullet cap (though the *vast majority* of them are), so there are also blacklists of addresses not to replace.  Lately I've also been using whitelists for many things.

**In TH06, TH07, and TH08, things are more complicated!**  In these games, the bullet array lives in static memory, making it impossible to resize safely.  The patch changes these games to instead allocate an array on the heap, storing a pointer to it at the beginning of where the array normally reside.

## `bullet_cap` breaks my patch!

This patch can potentially break other patches if they contain a binhack whose new code *incidentally* contains a copy of one of the values replaced by this patch.  If this happens to you, [leave an issue](https://github.com/ExpHP/thcrap-patches/issues/new) and we can try to work something out.

(please do not try to modify the blacklist from your patch if you are publishing to `thcrap_configure` as I may change its format in the future!)

## My patch needs to know the bullet cap.  How can it be made compatible with `bullet_cap`?

> `bullet_cap` promises to preserve the location of&mdash;and modify the value of&mdash;any dword-sized integer in the code whose value represents something related to a cap. (unless it also depends on the size of each array element)

In other words, the recommended way to get the current bullet cap is to read the value (or a number related to it) from anywhere it appears in the code.  *Note that must be done at some point after the bullet-manager global has been initialized while starting a new game,* to ensure that `bullet_cap` has had a chance to apply all of its changes.

Some examples, looking at Imperishable Night 1.02d:
* The laser cap could be found at `0x430f79` in the function that spawns a laser:
  ```
  00430f76  817dfc00010000     cmp     dword [ebp-0x4], 0x100
  00430f7d  0f8d13020000       jge     0x431196
  ```
* Here, at `0x42f442`, you can find a value of `0x601` that is meant to represent the bullet cap plus 1.  You can use this!  Simply read this address and then subtract one.
  ```
  0042f43c  6800f54200         push    Bullet::constructor
  0042f441  6801060000         push    0x601
  0042f446  68b8100000         push    0x10b8
  ```

And for some examples of what **not** to use, from the same game:
* Here at `0x4aef84`, this appearance of the number `0x100` is not at all related to the laser cap, so you should not use it.
  ```
  004aef83  0d00010000         or      eax, 0x100
  ```
* Here at `0x42f36b` is the value `0x1ae95e`, the size of the BulletManager struct measured in dwords.  Because this structure holds the bullet array, this value technically depends on the bullet cap.  However, it also depends on the size of each bullet, and therefore, `bullet_cap` makes no guarantees about the value at this address and you should not rely on it.
  ```
  0042f36a  b95ee91a00         mov     ecx, 0x1ae95e
  0042f36f  33c0               xor     eax, eax
  0042f371  8b7df4             mov     edi, dword [ebp-0xc]
  0042f374  f3ab               rep stosd dword [edi]
  ```

## <span id="finding-arrays">My patch needs to access one of the arrays or some field on `BulletManager`, but you move things all around!</span>

Add [`ExpHP/base_exphp`](https://github.com/ExpHP/thcrap-patches/tree/master/patches/base_exphp#readme) as a dependency.  That patch defines a codecave named `codecave:base-exphp.adjust-field-ptr`, which you can use to find anything you need to on `BulletManager` or `ItemManager`.  Please follow the link for more information and examples on how to use it.

Notice that depending on `ExpHP/base_exphp` does **not** require you to depend on `ExpHP/bullet_cap`.  This means your patch will still work without `bullet_cap` installed as well!
