[title=ECL - global definitions]

[requireEclmap=17]
## Global definitions
Global definitions are a simple, although a very useful thecl feature that allows assigning a numerical value to some text identifier. Their main use is creating constants for things such as bullet types, so that you can write `ET_KUNAI` instead of `9` to use a kunai bullet type. Their syntax is similar to variable declarations, although they must be declared **outside** of subs. They must also have a value assigned to them when declared. The general syntax for creating global definitions is `global <name> = <value>;`. The name must be a valid identifier, so the rules are the same as for variable names and sub names, though it's a common convention to use CAPITAL_LETTERS for globals. The value can be an integer literal, a float literal, a variable (more on that later, it doesn't quite work how you'd expect), or another global definition that was created earlier. It can also be an expression that can be simplified to a literal (for example, thecl will simplify `2 + 2` to `4` automatically). In all these cases, the same `global` keyword is used for declaration. The example below demonstrates simple usage:   
[code] global FLAG_INTANGIBLE = 32;
 void main() {
     [ins=502,17](FLAG_INTANGIBLE);
     while(1) {
         [ins=23,17](1000);
     }
 } [/code]  
Keep in mind the global definitions are not real variables - they are entirely handled **compile-time**. This means that if you were to compile this ECL file and then decompile it, you'd just see `32` instead of some variable in [ins=502,17]. Because of that, they have some limitations:
- they can only be set to literal values, or expressions that only contain literal values (so that the result can be calculated compile-time). Other, already existing global definitions, can also be used. 
- although you *can* set a global definition to a variable like [var=-10000,17], it will simply create an alternative name for this variable, not actually set the global definition to its value (after all, how can the compiler know what value the variable will have at runtime?).
- they cannot be modified (but you can create a new global with the same name as an existing one to replace it).

With these limitations, it's clear that global definitions are not capable of functioning as variables, even if they seem similar at first - they are designed for completely different purposes. As I said at the beginning, they are rather simple. Here is another example of their usage:  
[code] global ET_KUNAI = 9;
 global COLOR16_RED = 2;
 global AIM_ST_RING = 3;
 global ANG_RIGHT = rad(0);
 global ANG_DOWN = rad(90);
 global ANG_LEFT = rad(180);
 global ANG_UP = rad(270);
 global FLAG_INTANGIBLE = 32;

 void main() {
     [ins=502,17](FLAG_INTANGIBLE);
     [ins=600,17](0);
     [ins=602,17](0, ET_KUNAI, COLOR16_RED);
     [ins=607,17](0, AIM_ST_RING);
     [ins=606,17](0, 10, 2);
     [ins=605,17](0, 3f, 2f);
     [ins=604,17](0, ANG_DOWN, rad(5));
     while(1) {
         [ins=601,17](0);
         [ins=23,17](50);
     }
 } [/code]  
It's pretty apparent that if we wanted to create global definitions for all bullet types, aim modes, etc., they would take A LOT of space. Fortunately, it's possible to have our ECL code in multiple files! This way, we can simply have all global definitions in separate files (that's what the MERLIN library does!). But, how do we do that exactly? Head to the next part to find out!


[/requireEclmap]