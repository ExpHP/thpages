[title=Interpolation modes in Touhou]

# Interpolation modes

Thanks to:

* Dai for the great image
* Priw8 for reversing the majority of these
* rue for helping test the mysterious ECL `ins_92`

<a href="content/anm/img/th17modes.png"><img src="content/anm/img/th17modes.png" style="max-width: 100%;"></a>

Modern touhou games have a common "interpolator" struct that is used by many things to create smooth motions and transitions.  For the modding scene in particular, these are notably used to implement all of the "change over time" instructions in both ECL and ANM (e.g. [ref=anm:scaleTime]).

## Simple easing functions

The following are fairly simple easing functions.

| Mode  | Function                                   | Description |
|:---:  | ---                                        | ---         |
| 0     | `linear(x) = x`                            | linear      |
| 1     | `easeIn2(x) = x^2`                         | ease in  |
| 2     | `easeIn3(x) = x^3`                         | ease in (cubic) |
| 3     | `easeIn4(x) = x^4`                         | ease in (quartic) |
| 4     | `easeOut2(x) = flip(easeIn2)`              | ease out |
| 5     | `easeOut3(x) = flip(easeIn3)`              | ease out (cubic) |
| 6     | `easeOut4(x) = flip(easeIn4)`              | ease out (quartic) |
| 7  ([game=10]&ndash;) | Discussed below                            | constant velocity |
| 8  ([game=10]&ndash;) | `smoothstep(x) = 3x^2 - 2x^3`              | [smoothstep](https://en.wikipedia.org/wiki/Smoothstep); (technically Bezier; see below) |
| 9  ([game=10]&ndash;) | `easeInOut2(x) = split(easeIn2, easeOut2)` | ease in then ease out |
| 10 ([game=10]&ndash;) | `easeInOut3(x) = split(easeIn3, easeOut3)` | ease in then ease out (cubic) |
| 11 ([game=10]&ndash;) | `easeInOut4(x) = split(easeIn4, easeOut4)` | ease in then ease out (quartic) |
| 12 ([game=10]&ndash;) | `easeOutIn2(x) = split(easeOut2, easeIn2)` | ease out then ease in |
| 13 ([game=10]&ndash;) | `easeOutIn3(x) = split(easeOut3, easeIn3)` | ease out then ease in (cubic) |
| 14 ([game=10]&ndash;) | `easeOutIn4(x) = split(easeOut4, easeIn4)` | ease out then ease in (quartic) |
| 15 ([game=10]&ndash;) | `delayed(x) =  0  if x < 1`<br>`delayed(x) =  1  if x == 1` | suddenly change after a delay |
| 16 ([game=10]&ndash;) | `instant(x) = flip(delayed)`               | changes immediately (x is never 0).  (why interpolate then?) |
| 17 ([game=10]&ndash;) | Discussed below                            | constant acceleration |
| 18 ([game=13]&ndash;) | `easeOutSin(x) = sin(x * pi/2)`            | ease out (sine) |
| 19 ([game=13]&ndash;) | `easeInSin(x) = flip(easeOutSin)`          | ease in (sine) |
| 20 ([game=13]&ndash;) | `easeOutInSin(x) = split(easeOutSin, easeInSin)` | ease out then ease in (sine) |
| 21 ([game=13]&ndash;) | `easeInOutSin(x) = split(easeInSin, easeOutSin)` | ease in then ease out (sine) |

The table above has used two helper functions:

* `flip(f)` flips both the time and value axes of a function;  `f(x) ==> 1 - f(1 - x)`
* `split(f, g)` takes two functions, uses the first to interpolate from 0 to 0.5, then uses the second to interpolate from 0.5 to 1.0.

## Modes 7 and 17

Modes 7 and 17 are impossible to describe as dimensionless easing functions, but they're still pretty simple.  These treat the `goal` argument very differently from all of the other modes (it is *not* the final value after `t` frames!).

In mode 7, the `goal` argument is used as a **constant velocity**:

[code]
// Mode 7, each frame:
initial += goal;
return initial;
[/code]

And in mode 17, the `goal` argument is used as a **constant acceleration**:

[code]
// Mode 17, each frame
initial += extra_2;
extra_2 += goal;
return initial;
[/code]

What's `extra_2`?  It's just another field of the interpolator struct, which happens to be used to store velocity by mode 17.  For now you can assume it starts at 0.  (We'll come back to this later.)

## The overshooting modes
Functions 22 and onwards are all parabolas with the extremum placed somewhere inbetween x=0 and x=1, causing the function to appear to either "wind back" first or to overshoot its destination.  Because these are second-order polynomials, constraining `f(0) = 0` and `f(1) = 1` leaves a single degree of freedom remaining.

ZUN chose to constrain the extremal time (i.e. what fraction of the total time is spent moving backwards), though I think the extremal value (i.e. *how far* does it pull back or overshoot) is a bit more useful to look at.  In this table I have put both:

| Mode | Function  | Extremum |
| ---  | ---       | --- |
| 22 ([game=13]&ndash;) | `easeInBackA(x) = ((pow(x - 0.25, 2) / 0.5625) - 0.111111) / 0.888889` | `f(0.25) = -0.125` |
| 23 ([game=13]&ndash;) | `easeInBackB(x) = ((pow(x - 0.3, 2) / 0.49) - 0.183673) / 0.816326`    | `f(0.30) = -0.225` |
| 24 ([game=13]&ndash;) | `easeInBackC(x) = ((pow(x - 0.35, 2) / 0.4225) - 0.289941) / 0.710059` | `f(0.35) = -0.40833333` |
| 25 ([game=13]&ndash;) | `easeInBackD(x) = ((pow(x - 0.38, 2) / 0.3844) - 0.37565) / 0.62435`   | `f(0.38) = -0.60166667` |
| 26 ([game=13]&ndash;) | `easeInBackE(x) = ((pow(x - 0.4, 2) / 0.36) - 0.444444) / 0.555556`    | `f(0.40) = -0.8` |
| 27 ([game=13]&ndash;) | `easeOutBackA = flip(easeInBackA)` | `f(0.75) = 1.125` |
| 28 ([game=13]&ndash;) | `easeOutBackB = flip(easeInBackB)` | `f(0.70) = 1.225` |
| 29 ([game=13]&ndash;) | `easeOutBackC = flip(easeInBackC)` | `f(0.65) = 1.40833333` |
| 30 ([game=13]&ndash;) | `easeOutBackD = flip(easeInBackD)` | `f(0.62) = 1.60166667` |
| 31 ([game=13]&ndash;) | `easeOutBackE = flip(easeInBackE)` | `f(0.60) = 1.8` |

## The **true** mode 8

Before we go any further, let's talk a bit about what this interpolator struct actually looks like.  It basically looks like this: (at least in [game=13]&ndash;[game=17])
[code]
template <typename T>
struct Interp {
    T initial;
    T goal;
    T extra_1;
    T extra_2;
    T current;
    Time time;
    int32_t end_time;
    int32_t mode;
}
[/code]

I wrote this as a generic type because the same layout is used for a wide variety of element types.  `T` could be `float` (for [ref=anm:uVelTime]), it could be `int` (for [ref=anm:alphaTime]), it could be a vector of 2 floats (for [ref=anm:scaleTime]), and so on.  Typically, when one of these instructions are used, the first two args are put in `end_time` and `mode`, the current value of the field is copied to `initial`, the argument is stored in `goal`.  `time`, `extra_1`, and `extra_2` are all reset to 0.

What are `extra_1` and `extra_2`?  They're just extra fields that are only used by modes 8 and 17.  To partially demonstrate this, here's the pseudocode for [ref=anm:posBezier] (`pos_interp` here is the same interpolator used by [ref=anm:posTime]):

[code]
// pseudocode for posBezier(t, x1,y1,z1, x2,y2,z2, x3,y3,z3)
pos_interp.time.set_current(0);
pos_interp.end_time = t;
pos_interp.mode = 8;     //  <-------------------
pos_interp.initial = this->pos;
pos_interp.extra_1 = {x1, y1, z1};
pos_interp.goal = {x2, y2, z2};
pos_interp.extra_2 = {x3, y3, z3};
[/code]

Take a close look at the line labeled with the arrow.  It turns out that **mode 8 is actually the Bezier mode!**  The smoothstep function obtained when using it in other time instructions is simply because that's what you end up with when the extra points are zero.  (i.e. smoothstep is the unique third-order polynomial that satisfies `f(0) = f'(0) = f'(1) = 0; f(1) = 1`.)

So that's cool and all, but how can we actually take advantage of this?  I.e. could we theoretically have [ref=anm:scaleTime] use an arbitrary Bezier?  Well, there's good and bad news:

* There are currently no instructions in ANM that would enable you to use a Bezier for arbitrary things.
* There **is** an instruction in ECL: `ins_92(slot, &dest, t, mode, init, goal, extra_1, extra_2)` (an extended version of `ins_91` "`floatTime`") which lets you supply `extra_1` and `extra_2` while interpolating a single float.

So if you're making an enemy, here's a way you *could technically* scale its graphic by a Bezier:

[code]
// ECL:
float tmp;
int duration = 20;
float initial = 1.0f;
float goal = 2.0f;
float extra1 = 3f;
float extra2 = 5f;
ins_92(0, tmp, duration, 8, initial, goal, extra1, extra2);
times(duration) {
    anmScale(0, tmp, tmp);
    wait(1);
}
[/code]

Do with this insane knowledge whatever you will.

(Oh, and since I said we'd come back to mode 17:  Yes, ECL `ins_92` also makes it possible to do constant acceleration *with an initial velocity*, by supplying the initial velocity in `extra_2`)

---

## Javascript definitions for all easing modes

[code=js]
const modes = [];
function addMode(f) {
    modes.push(f);
    return f;
}
function flip(f) {
    return (x) => 1 - f(1 - x);
}
function split(f, g) {
    return ((x) => (
      x < 0.5  ?  0.5 * f(2*x)
               :  0.5 * (1 + g(2*x - 1))
    ));
}

linear = addMode((x) => x);
easeIn2 = addMode((x) => x*x);
easeIn3 = addMode((x) => Math.pow(x, 3));
easeIn4 = addMode((x) => Math.pow(x, 4));

easeOut2 = addMode(flip(easeIn2));
easeOut3 = addMode(flip(easeIn3));
easeOut4 = addMode(flip(easeIn4));

addMode(() => { throw new Error("mode 7 can't be represented as an easing function"); });

// when calling this, supply extra_1/goal and extra_2/goal
bezier = addMode((x, p1, p2) => {
    if (p1 === undefined) p1 = 0;
    if (p2 === undefined) p2 = 0;

    // This is just what sympy gave me when I converted the assembly into python code
    return p1*x*Math.pow(1 - x, 2) + p2*Math.pow(x, 2)*(x - 1) + Math.pow(x, 2)*(3 - 2*x);
});

easeInOut2 = addMode(split(easeIn2, easeOut2));
easeInOut3 = addMode(split(easeIn3, easeOut3));
easeInOut4 = addMode(split(easeIn4, easeOut4));
easeOutIn2 = addMode(split(easeOut2, easeIn2));
easeOutIn3 = addMode(split(easeOut3, easeIn3));
easeOutIn4 = addMode(split(easeOut4, easeIn4));

delayed = addMode((x) => x === 1 ? 1 : 0);
instant = addMode(flip(delayed));

addMode(() => { throw new Error("mode 17 can't be represented as an easing function"); });

easeOutSin = addMode((x) => Math.sin(x * Math.PI/2));
easeInSin = addMode(flip(easeOutSin));
easeOutInSin = addMode(split(easeOutSin, easeInSin));
easeInOutSin = addMode(split(easeInSin, easeOutSin));

easeInBackA = addMode((x) => ((Math.pow(x - 0.25, 2) / 0.5625) - 0.111111) / 0.888889);
easeInBackB = addMode((x) => ((Math.pow(x - 0.3, 2) / 0.49) - 0.183673) / 0.816326);
easeInBackC = addMode((x) => ((Math.pow(x - 0.35, 2) / 0.4225) - 0.289941) / 0.710059);
easeInBackD = addMode((x) => ((Math.pow(x - 0.38, 2) / 0.3844) - 0.37565) / 0.62435);
easeInBackE = addMode((x) => ((Math.pow(x - 0.4, 2) / 0.36) - 0.444444) / 0.555556);
easeOutBackA = addMode(flip(easeInBackA));
easeOutBackB = addMode(flip(easeInBackB));
easeOutBackC = addMode(flip(easeInBackC));
easeOutBackD = addMode(flip(easeInBackD));
easeOutBackE = addMode(flip(easeInBackE));

// at this point, `modes` is an array containing 32 functions;
// or you can call them by name
[/code]
