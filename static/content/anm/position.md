

# tl;dr

* Early games have two position fields, `pos` and `offset`.  `pos` is awkwardly defined and :ref{r=anm:pos} won't do anything for most things. `offset` and the :ref{r=anm:posMode} instruction are a hack to work around this.
* Later games completely repurpose these two fields and add a third one, `entity_pos`.
* Games with resolution support additionally introduce the concept of an "origin."

# Early games (:game[06]&ndash:game[09])

By default, the instruction :ref{r=anm:pos} sets a vector on the VM that we will call the `pos` field.  However, in these games, for 2D sprites, the `pos` field is also very plainly **the final position where the VM will appear onscreen,** measured in pixels from the top left of the window.  This is fine for things like the main menu, pause menu, and HUD, but you might imagine how this could cause problems for, say, an enemy sprite.  An ANM script for an enemy in these games could not possibly be expected to properly set the `pos` field, because it does not know where the enemy is!

So how does the game solve this problem?  Basically, the crucial thing to understand is that **just about everything in pre-MoF games is responsible for managing its own VMs.**  Bullets, items, enemies and etc. all directly write the `pos` field on their VMs right before they are drawn. E.g. in the bullet rendering code for :game-th[08], there is the following:

~~~
  bullet.vm.pos.x = bullet.x + 32f;  // (note: the 32f, 16f is a correction for
  bullet.vm.pos.y = bullet.y + 16f;  //  the position of the game region)
  bullet.vm.pos.z = 0.06f;
  ANM_MANAGER.render_vm(&bullet.vm);
~~~

This solves the general problem of positioning game entities, but unfortunately, it also makes :ref{r=anm:pos} useless for these things, because any position set by the ANM script will just be overwritten by the rendering code!  That's why there is an `offset` field.  Basically, `offset` is a field that *some things* use when they are setting `pos`.  For instance, enemies use it in their `on_draw`:

~~~
  enemy.vm.pos.x = enemy.x + enemy.vm.offset.x + 32f;
  enemy.vm.pos.y = enemy.y + enemy.vm.offset.y + 16f;
  enemy.vm.pos.z = 0.3f;
  ANM_MANAGER.render_vm(&enemy.vm);
~~~

A VM can set `offset` by calling :ref{r=anm:posMode}`(1)`.  Basically this causes all :ref{r=anm:pos} instructions (and all time interpolation of :ref{r=anm:pos}) to set `offset` instead of `pos`.  So for instance, many of the boss' idle scripts in IN look something like this:

~~~
script script1 {
    :ref{r=anm:posMode}(1);
    :ref{r=anm:sprite}(sprite0);
offset24:
    :ref{r=anm:posTime}(24, 4, 0.0f, -4.0f, 0.0f);
+24: // 24
    :ref{r=anm:posTime}(24, 4, 0.0f, 4.0f, 0.0f);
+24: // 48
    :ref{r=anm:jmp}(offset24, 0);
}
~~~

This allows the boss sprite to waver up and down slightly as the boss hovers in place.

# Version 4 and `entity_pos`

:game-long[095] automated a huge amount of rendering with the introduction of [layers](#/anm/ontick-ondraw).  But it also greatly simplified positioning by introducing a third position field on the VM, which we will call `entity_pos`.  Conceptually, this field simply stores the position of the *game entity* that the graphic represents.  For instance, in MoF, enemies don't even have code for `on_draw` anymore, and in `on_tick` they simply do the following:

~~~
// ... at some point after running ECL and updating the enemy's position
vm.entity_pos = enemy.pos;
~~~

The `pos` and `offset` fields still exist on VMs, and :ref{r=anm:pos} still updates `pos`.  However, `pos` is no longer the "final onscreen position."  That instead is a sum of three vectors:

~~~
@@@@@@@@@@@@@@@@@@@ FIXME  when is game region offset added? @@@@@@@@@@@@@@@@
Float3 true_final_pos = vm.pos + vm.offset + vm.entity_pos;
~~~

<!----- NOTE:  SA+0x456430  is a function that sets pos_3 to the input pos plus (32+192, 16, 0) on a VM and all of its children ----->

@@@@@@@@@@@@@@ is offset actually used before children were added?

# (...starting when)?

@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ resolution and origin modes @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
