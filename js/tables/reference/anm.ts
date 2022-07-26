import {mapAssign} from '~/js/util';

import type {PartialInsData, PartialOpcodeRefData} from '../tables';
import {Game} from '../game';

// ==========================================================================
// ==========================================================================
// ===================    LOOKUP TABLE BY OPCODE    =========================

export const refByOpcode = new Map<Game, Map<number, PartialOpcodeRefData>>();

export const ANM_GROUPS_V8 = [
  {min: 0, max: 99, title: 'System'},
  {min: 100, max: 199, title: 'Math'},
  {min: 200, max: 299, title: 'Jumps'},
  {min: 300, max: 399, title: 'Settings'},
  {min: 400, max: 499, title: 'General'},
  {min: 500, max: 599, title: 'Child management'},
  {min: 600, max: 699, title: 'Drawing'},
];

// ---- V0 ----
refByOpcode.set('06', new Map([
  [0, {ref: 'anm:delete'}],
  [1, {ref: 'anm:sprite'}],
  [2, {ref: 'anm:scale'}],
  [3, {ref: 'anm:alpha'}],
  [4, {ref: 'anm:rgb-dword'}],
  [5, {ref: 'anm:v0-jmp'}],
  [6, {ref: 'anm:nop'}],
  [7, {ref: 'anm:flipX'}],
  [8, {ref: 'anm:flipY'}],
  [9, {ref: 'anm:rotate'}],
  [10, {ref: 'anm:angleVel'}],
  [11, {ref: 'anm:scaleGrowth'}],
  [12, {ref: 'anm:v0-alphaTimeLinear'}],
  [13, {ref: 'anm:blendAdditive'}],
  [14, {ref: 'anm:blendAlpha'}],
  [15, {ref: 'anm:static'}],
  [16, {ref: 'anm:spriteRand'}],
  [17, {ref: 'anm:pos'}],
  [18, {ref: 'anm:v0-posTimeLinear'}], // seets 0b00
  [19, {ref: 'anm:v0-posTimeEaseout'}], // posTimeDecel // sets 0b01
  [20, {ref: 'anm:v0-posTimeEaseout4'}], // posTimeAccel // sets 0b10
  [21, {ref: 'anm:stop'}],
  [22, {ref: 'anm:case'}],
  [23, {ref: 'anm:anchorTopLeft'}],
  [24, {ref: 'anm:stop2'}],
  [25, {ref: 'anm:posMode'}], // set_allow_dest_offset (alternate_pos_flag)
  [26, {ref: 'anm:v0-26'}], // set_automatic_angle
  [27, {ref: 'anm:uAdd'}],
  [28, {ref: 'anm:vAdd'}],
  [29, {ref: 'anm:visible'}], // set_visible
  [30, {ref: 'anm:v0-scaleTimeLinear'}], //
  [31, {ref: 'anm:noZBuffer', wip: 1}], // bitflag 12
]));

// ---- V2 ----
refByOpcode.set('07', new Map([
  [0, {ref: 'anm:nop'}],
  [1, {ref: 'anm:delete'}],
  [2, {ref: 'anm:static'}],
  [3, {ref: 'anm:sprite'}],
  [4, {ref: 'anm:jmp'}],
  [5, {ref: 'anm:jmpDec'}],
  [6, {ref: 'anm:pos'}],
  [7, {ref: 'anm:scale'}],
  [8, {ref: 'anm:alpha'}],
  [9, {ref: 'anm:rgb-dword'}],
  [10, {ref: 'anm:flipX'}],
  [11, {ref: 'anm:flipY'}],
  [12, {ref: 'anm:rotate'}],
  [13, {ref: 'anm:angleVel'}],
  [14, {ref: 'anm:scaleGrowth'}],
  [15, {ref: 'anm:alphaTimeLinear'}],
  [16, {ref: 'anm:blendAdditiveSet'}],
  [17, {ref: 'anm:posTimeLinear'}],
  [18, {ref: 'anm:posTimeEaseout'}],
  [19, {ref: 'anm:posTimeEaseout4'}],
  [20, {ref: 'anm:stop'}],
  [21, {ref: 'anm:case'}],
  [22, {ref: 'anm:anchorTopLeft'}], // PoFV:  flags 11=1, 12=1
  [23, {ref: 'anm:stop2'}],
  [24, {ref: 'anm:posMode'}],
  [25, {ref: 'anm:v0-26'}], // reads a word field
  [26, {ref: 'anm:uAdd'}],
  [27, {ref: 'anm:vAdd'}],
  [28, {ref: 'anm:visible'}], // PoFV:  sets flag 0
  [29, {ref: 'anm:scaleTimeLinear'}],
  [30, {ref: 'anm:noZBuffer'}], // PoFV:  sets flag 13
  [31, {ref: 'anm:v1-31'}], // PoFV:  sets flag 15, usage at TH08+0x4626d6
  [32, {ref: 'anm:posTime'}],
  [33, {ref: 'anm:rgbTime-dword'}],
  [34, {ref: 'anm:alphaTime'}],
  [35, {ref: 'anm:rotateTime'}],
  [36, {ref: 'anm:scaleTime'}],

  [37, {ref: 'anm:set'}],
  [38, {ref: 'anm:setF'}],
  [39, {ref: 'anm:add'}],
  [40, {ref: 'anm:addF'}],
  [41, {ref: 'anm:sub'}],
  [42, {ref: 'anm:subF'}],
  [43, {ref: 'anm:mul'}],
  [44, {ref: 'anm:mulF'}],
  [45, {ref: 'anm:div'}],
  [46, {ref: 'anm:divF'}],
  [47, {ref: 'anm:mod'}],
  [48, {ref: 'anm:modF'}],
  [49, {ref: 'anm:add3'}],
  [50, {ref: 'anm:addF3'}],
  [51, {ref: 'anm:sub3'}],
  [52, {ref: 'anm:subF3'}],
  [53, {ref: 'anm:mul3'}],
  [54, {ref: 'anm:mulF3'}],
  [55, {ref: 'anm:div3'}],
  [56, {ref: 'anm:divF3'}],
  [57, {ref: 'anm:mod3'}],
  [58, {ref: 'anm:modF3'}],
  [59, {ref: 'anm:v3-rand'}], // FIXME merge
  [60, {ref: 'anm:v3-randF'}], // FIXME
  [61, {ref: 'anm:mathSin'}],
  [62, {ref: 'anm:mathCos'}],
  [63, {ref: 'anm:mathTan'}],
  [64, {ref: 'anm:mathAcos'}],
  [65, {ref: 'anm:mathAtan'}],
  [66, {ref: 'anm:mathReduceAngle'}],

  [67, {ref: 'anm:jmpEq'}],
  [68, {ref: 'anm:jmpEqF'}],
  [69, {ref: 'anm:jmpNe'}],
  [70, {ref: 'anm:jmpNeF'}],
  [71, {ref: 'anm:jmpLt'}],
  [72, {ref: 'anm:jmpLtF'}],
  [73, {ref: 'anm:jmpLe'}],
  [74, {ref: 'anm:jmpLeF'}],
  [75, {ref: 'anm:jmpGt'}],
  [76, {ref: 'anm:jmpGtF'}],
  [77, {ref: 'anm:jmpGe'}],
  [78, {ref: 'anm:jmpGeF'}],

  [79, {ref: 'anm:wait'}],
  [80, {ref: 'anm:uVel'}],
  [81, {ref: 'anm:vVel'}],
]));

// ---- V3 ----
refByOpcode.set('08', new Map([...refByOpcode.get('07')!.entries(),
  // changed signatures
  [9, {ref: 'anm:rgb'}],
  [33, {ref: 'anm:rgbTime'}],

  // new instrs
  [82, {ref: 'anm:blendMode'}],
  // This might be some sort of early renderMode analogue that's specific to player bullets.
  [83, {ref: 'anm:playerBulletMode2'}],
  [84, {ref: 'anm:rgb2'}],
  [85, {ref: 'anm:alpha2'}],
  [86, {ref: 'anm:rgb2Time'}],
  [87, {ref: 'anm:alpha2Time'}],
  [88, {ref: 'anm:blink'}], // PoFV:  sets flag 17 if floor(arg/256) is odd
  [89, {ref: 'anm:caseReturn'}],
]));

refByOpcode.set('09', new Map([...refByOpcode.get('08')!.entries()]));

// ---- V4 ----
refByOpcode.set('095', new Map([
  [0, {ref: 'anm:nop'}],
  [1, {ref: 'anm:delete'}],
  [2, {ref: 'anm:static', wip: 1}],
  [3, {ref: 'anm:sprite'}],
  [4, {ref: 'anm:jmp'}],
  [5, {ref: 'anm:jmpDec'}],

  [6, {ref: 'anm:set'}],
  [7, {ref: 'anm:setF'}],
  [8, {ref: 'anm:add'}],
  [9, {ref: 'anm:addF'}],
  [10, {ref: 'anm:sub'}],
  [11, {ref: 'anm:subF'}],
  [12, {ref: 'anm:mul'}],
  [13, {ref: 'anm:mulF'}],
  [14, {ref: 'anm:div'}],
  [15, {ref: 'anm:divF'}],
  [16, {ref: 'anm:mod'}],
  [17, {ref: 'anm:modF'}],
  [18, {ref: 'anm:add3'}],
  [19, {ref: 'anm:addF3'}],
  [20, {ref: 'anm:sub3'}],
  [21, {ref: 'anm:subF3'}],
  [22, {ref: 'anm:mul3'}],
  [23, {ref: 'anm:mulF3'}],
  [24, {ref: 'anm:div3'}],
  [25, {ref: 'anm:divF3'}],
  [26, {ref: 'anm:mod3'}],
  [27, {ref: 'anm:modF3'}],

  [28, {ref: 'anm:jmpEq'}],
  [29, {ref: 'anm:jmpEqF'}],
  [30, {ref: 'anm:jmpNe'}],
  [31, {ref: 'anm:jmpNeF'}],
  [32, {ref: 'anm:jmpLt'}],
  [33, {ref: 'anm:jmpLtF'}],
  [34, {ref: 'anm:jmpLe'}],
  [35, {ref: 'anm:jmpLeF'}],
  [36, {ref: 'anm:jmpGt'}],
  [37, {ref: 'anm:jmpGtF'}],
  [38, {ref: 'anm:jmpGe'}],
  [39, {ref: 'anm:jmpGeF'}],

  [40, {ref: 'anm:rand'}],
  [41, {ref: 'anm:randF'}],
  [42, {ref: 'anm:mathSin'}],
  [43, {ref: 'anm:mathCos'}],
  [44, {ref: 'anm:mathTan'}],
  [45, {ref: 'anm:mathAcos', wip: 1}],
  [46, {ref: 'anm:mathAtan'}],
  [47, {ref: 'anm:mathReduceAngle'}],

  [48, {ref: 'anm:pos'}],
  [49, {ref: 'anm:rotate'}],
  [50, {ref: 'anm:scale'}],
  [51, {ref: 'anm:alpha'}],
  [52, {ref: 'anm:rgb'}],
  [53, {ref: 'anm:angleVel'}],
  [54, {ref: 'anm:scaleGrowth'}],
  [55, {ref: 'anm:alphaTimeLinear'}],
  [56, {ref: 'anm:posTime'}],
  [57, {ref: 'anm:rgbTime'}],
  [58, {ref: 'anm:alphaTime'}],
  [59, {ref: 'anm:rotateTime'}],

  [60, {ref: 'anm:scaleTime'}],
  [61, {ref: 'anm:flipX'}],
  [62, {ref: 'anm:flipY'}],
  [63, {ref: 'anm:stop'}],
  [64, {ref: 'anm:case'}],
  [65, {ref: 'anm:anchor'}],
  [66, {ref: 'anm:blendMode'}], // TODO: UFO has fewer modes!
  [67, {ref: 'anm:renderMode'}],
  [68, {ref: 'anm:layer'}],
  [69, {ref: 'anm:stop2'}],

  [70, {ref: 'anm:uVel'}],
  [71, {ref: 'anm:vVel'}],
  [72, {ref: 'anm:visible', wip: 1}], // flag 0
  [73, {ref: 'anm:noZBuffer', wip: 1}], // flag 12
  [74, {ref: 'anm:v8-306', wip: 1}],
  [75, {ref: 'anm:wait', wip: 1}],
  [76, {ref: 'anm:rgb2'}],
  [77, {ref: 'anm:alpha2'}],
  [78, {ref: 'anm:rgb2Time'}],
  [79, {ref: 'anm:alpha2Time'}],

  [80, {ref: 'anm:colorMode'}], // flag lo:16 (DS: lo:16-17)
  [81, {ref: 'anm:caseReturn'}],
  [82, {ref: 'anm:rotateAuto', wip: 1}], // flag lo:29
  [83, {ref: 'anm:posAdopt'}],
  [84, {ref: 'anm:textureCircle'}],
  [85, {ref: 'anm:v8-flag-431', wip: 1}], // flag lo:30 (DS: lo:31)
  [86, {ref: 'anm:slowdown-immune', wip: 1}], // flag lo:31 (DS: hi:0)
  [87, {ref: 'anm:v4-randMode'}],
]));

refByOpcode.set('10', new Map([...refByOpcode.get('095')!.entries(),
  [88, {ref: 'anm:createChild', wip: 1}],
  [89, {ref: 'anm:resampleMode', wip: 1}], // flag hi:1 (DS: hi:2)

  [90, {ref: 'anm:createChildUi', wip: 1}],
  [91, {ref: 'anm:prependChild', wip: 1}],
  [92, {ref: 'anm:prependChildUi', wip: 1}],
]));

refByOpcode.set('11', new Map([...refByOpcode.get('10')!.entries(),
  [93, {ref: 'anm:uVelTime'}],
  [94, {ref: 'anm:vVelTime'}],
  [95, {ref: 'anm:createRoot'}],
  [96, {ref: 'anm:createChildPos'}],
  [97, {ref: 'anm:createRootPos'}],
  [98, {ref: 'anm:v8-418'}],
  [99, {ref: 'anm:v8-flag-419', wip: 1}],

  [100, {ref: 'anm:posBezier'}],
  [101, {ref: 'anm:v4-texCircle2'}], // type 13 in GFW
  [102, {ref: 'anm:spriteRand'}],
  [103, {ref: 'anm:drawRect'}], // type 15 in GFW
]));

refByOpcode.set('12', new Map([...refByOpcode.get('11')!.entries(),
  [104, {ref: 'anm:drawPoly'}],
  [105, {ref: 'anm:drawPolyBorder'}],
  [106, {ref: 'anm:uvScale'}],
  [107, {ref: 'anm:uvScaleTime'}],
  [108, {ref: 'anm:drawRectGrad'}], // type 19 in GFW
  [109, {ref: 'anm:drawRectShadow'}], // type 20 in GFW
  [110, {ref: 'anm:drawRectShadowGrad'}], // type 21 in GFW
]));

refByOpcode.set('125', new Map([...refByOpcode.get('12')!.entries(),
  [111, {ref: 'anm:v4-111'}], // (DS: hi:6-8)
  [112, {ref: 'anm:ignoreParent'}], // (DS: hi:8)
]));

refByOpcode.set('128', new Map([...refByOpcode.get('125')!.entries(),
  [113, {ref: 'anm:rotateTime2D'}],
  [114, {ref: 'anm:v4-texCircle3'}], // type 14 in GFW
]));

// ---- V8 ----
refByOpcode.set('13', new Map([
  [0, {ref: 'anm:nop'}],
  [1, {ref: 'anm:delete'}],
  [2, {ref: 'anm:static'}],
  [3, {ref: 'anm:stop'}],
  [4, {ref: 'anm:stop2'}],
  [5, {ref: 'anm:case'}],
  [6, {ref: 'anm:wait'}],
  [7, {ref: 'anm:caseReturn'}],

  [100, {ref: 'anm:set'}],
  [101, {ref: 'anm:setF'}],
  [102, {ref: 'anm:add'}],
  [103, {ref: 'anm:addF'}],
  [104, {ref: 'anm:sub'}],
  [105, {ref: 'anm:subF'}],
  [106, {ref: 'anm:mul'}],
  [107, {ref: 'anm:mulF'}],
  [108, {ref: 'anm:div'}],
  [109, {ref: 'anm:divF'}],
  [110, {ref: 'anm:mod'}],
  [111, {ref: 'anm:modF'}],
  [112, {ref: 'anm:add3'}],
  [113, {ref: 'anm:addF3'}],
  [114, {ref: 'anm:sub3'}],
  [115, {ref: 'anm:subF3'}],
  [116, {ref: 'anm:mul3'}],
  [117, {ref: 'anm:mulF3'}],
  [118, {ref: 'anm:div3'}],
  [119, {ref: 'anm:divF3'}],
  [120, {ref: 'anm:mod3'}],
  [121, {ref: 'anm:modF3'}],
  [122, {ref: 'anm:rand'}],
  [123, {ref: 'anm:randF'}],
  [124, {ref: 'anm:mathSin'}],
  [125, {ref: 'anm:mathCos'}],
  [126, {ref: 'anm:mathTan'}],
  [127, {ref: 'anm:mathAcos'}],
  [128, {ref: 'anm:mathAtan'}],
  [129, {ref: 'anm:mathReduceAngle'}],
  [130, {ref: 'anm:mathCirclePos'}],
  [131, {ref: 'anm:mathCirclePosRand'}],

  [200, {ref: 'anm:jmp'}],
  [201, {ref: 'anm:jmpDec'}],
  [202, {ref: 'anm:jmpEq'}],
  [203, {ref: 'anm:jmpEqF'}],
  [204, {ref: 'anm:jmpNe'}],
  [205, {ref: 'anm:jmpNeF'}],
  [206, {ref: 'anm:jmpLt'}],
  [207, {ref: 'anm:jmpLtF'}],
  [208, {ref: 'anm:jmpLe'}],
  [209, {ref: 'anm:jmpLeF'}],
  [210, {ref: 'anm:jmpGt'}],
  [211, {ref: 'anm:jmpGtF'}],
  [212, {ref: 'anm:jmpGe'}],
  [213, {ref: 'anm:jmpGeF'}],

  [300, {ref: 'anm:sprite'}],
  [301, {ref: 'anm:spriteRand'}],
  [302, {ref: 'anm:renderMode'}],
  [303, {ref: 'anm:blendMode'}],
  [304, {ref: 'anm:layer'}],
  [305, {ref: 'anm:noZBuffer'}],
  [306, {ref: 'anm:v8-306'}],
  [307, {ref: 'anm:v8-randMode'}],
  [308, {ref: 'anm:flipX'}],
  [309, {ref: 'anm:flipY'}],
  [310, {ref: 'anm:visible'}],
  [311, {ref: 'anm:resampleMode'}],
  [312, {ref: 'anm:scrollMode'}],

  [400, {ref: 'anm:pos'}],
  [401, {ref: 'anm:rotate'}],
  [402, {ref: 'anm:scale'}],
  [403, {ref: 'anm:alpha'}],
  [404, {ref: 'anm:rgb'}],
  [405, {ref: 'anm:alpha2'}],
  [406, {ref: 'anm:rgb2'}],
  [407, {ref: 'anm:posTime'}],
  [408, {ref: 'anm:rgbTime'}],
  [409, {ref: 'anm:alphaTime'}],
  [410, {ref: 'anm:rotateTime'}],
  [411, {ref: 'anm:rotateTime2D'}],
  [412, {ref: 'anm:scaleTime'}],
  [413, {ref: 'anm:rgb2Time'}],
  [414, {ref: 'anm:alpha2Time'}],
  [415, {ref: 'anm:angleVel'}],
  [416, {ref: 'anm:scaleGrowth'}],
  [417, {ref: 'anm:alphaTimeLinear'}],
  [418, {ref: 'anm:v8-418'}],
  [419, {ref: 'anm:v8-flag-419'}],
  [420, {ref: 'anm:posBezier'}],
  [421, {ref: 'anm:anchor'}],
  [422, {ref: 'anm:posAdopt'}],
  [423, {ref: 'anm:colorMode'}],
  [424, {ref: 'anm:rotateAuto'}],
  [425, {ref: 'anm:uVel'}],
  [426, {ref: 'anm:vVel'}],
  [427, {ref: 'anm:uVelTime'}],
  [428, {ref: 'anm:vVelTime'}],
  [429, {ref: 'anm:uvScale'}],
  [430, {ref: 'anm:uvScaleTime'}],
  [431, {ref: 'anm:v8-flag-431'}],
  [432, {ref: 'anm:slowdown-immune'}],
  [433, {ref: 'anm:posTime2D'}],
  [434, {ref: 'anm:scale2'}],
  [435, {ref: 'anm:scale2Time'}],
  [436, {ref: 'anm:anchorOffset'}],
  [437, {ref: 'anm:rotationSystem'}],
  [438, {ref: 'anm:originMode'}],

  [500, {ref: 'anm:createChild'}],
  [501, {ref: 'anm:createChildUi'}],
  [502, {ref: 'anm:prependChild'}],
  [503, {ref: 'anm:prependChildUi'}],
  [504, {ref: 'anm:createRoot'}],
  [505, {ref: 'anm:createChildPos'}],
  [506, {ref: 'anm:createRootPos'}],
  [507, {ref: 'anm:ignoreParent'}],
  [508, {ref: 'anm:createEffect'}],

  [600, {ref: 'anm:textureCircle'}],
  [601, {ref: 'anm:textureArcEven'}],
  [602, {ref: 'anm:textureArc'}],
  [603, {ref: 'anm:drawRect'}],
  [604, {ref: 'anm:drawPoly'}],
  [605, {ref: 'anm:drawPolyBorder'}],
  [606, {ref: 'anm:drawRectGrad'}],
  [607, {ref: 'anm:drawRectShadow'}],
  [608, {ref: 'anm:drawRectShadowGrad'}],
]));

refByOpcode.set('14', new Map([...refByOpcode.get('13')!.entries(),
  [313, {ref: 'anm:resolutionMode'}],
  [314, {ref: 'anm:attached'}],
  [315, {ref: 'anm:colorizeChildren'}],
  [509, {ref: 'anm:copyParentVars'}],
  [609, {ref: 'anm:textureCylinder3D'}],
  [610, {ref: 'anm:textureRing3D'}],
]));

refByOpcode.set('143', new Map([...refByOpcode.get('14')!.entries(),
  [316, {ref: 'anm:v8-flag-316'}], // in 16: flag 2
  [317, {ref: 'anm:v8-flag-317'}], // in 16: flag 2
  [611, {ref: 'anm:drawRing'}],
]));

refByOpcode.set('15', new Map([...refByOpcode.get('143')!.entries()]));

refByOpcode.set('16', new Map([...refByOpcode.get('15')!.entries(),
  [612, {ref: 'anm:drawRectBorder'}],
  [613, {ref: 'anm:drawLine'}],
]));

refByOpcode.set('165', new Map([...refByOpcode.get('16')!.entries(),
  [439, {ref: 'anm:vd-imaginary-439'}],
]));

refByOpcode.set('17', new Map([...refByOpcode.get('165')!.entries()]));
refByOpcode.get('17')!.delete(439);

refByOpcode.set('18', new Map([...refByOpcode.get('17')!.entries(),
  [439, {ref: 'anm:fadeNearCamera'}],
  [614, {ref: 'anm:drawArc'}],
]));

// ==========================================================================
// ==========================================================================
// =====================    INSTRUCTION DATA    =============================

// Lookup table by ref id. (game-independent, map-independent name)
export const byRefId = new Map<string, PartialInsData>();

// ==============
// ==== CORE ====
// ==============
mapAssign(byRefId, {
  'nop': {sig: '', args: [], md: "Does nothing."},
  'delete': {sig: '', args: [], md: `
    :tipshow[Destroys the graphic.]

    * **:game[06]:** this instruction and :ref{r=anm:static} may only appear as the final instruction of a script,
      and one of these **must** appear.  thstd and trustd will implicitly insert a :ref{r=anm:delete} at the closing brace if there isn't one.
      <!-- TH06 has no markers in-between scripts.  The way that interrupt labels know when to stop searching in this
           game is that they stop once they encounter ins_0 or ins_15. -->
    * **:game[07]&ndash;:** this instruction may appear anywhere.  Additionally, a VM that reaches the end of the script
      will be automatically deleted *as if* it encountered this instruction.
  `},
  'static': {
    sig: '', args: [], md: `
    :tipshow[Freezes the graphic until it is destroyed externally.]

    Any interpolation instructions like :ref{r=anm:posTime} will no longer advance,
    and [interrupts](#anm/concepts&a=interrupt) are disabled.

    **In :game[06] only,** this instruction and :ref{r=anm:delete} may only appear as the final instruction of a script.
  `},
  'stop': {sig: '', args: [], md: `
    :tipshow[Stops executing the script (at least for now), but keeps the graphic alive.]

    Interpolation instructions like :ref{r=anm:posTime} will continue to advance,
    and [interrupts](#anm/concepts&a=interrupt) can be triggered at any time.
    You could say this essentially behaves like an infinitely long :ref{r=anm:wait}.
  `},
  'stop2': {
    sig: '', args: [], wip: 2, md: `
    :::tipshow
    This is like :ref{r=anm:stop} except that it also hides the graphic by clearing
    the visibility flag (see :ref{r=anm:visible}).
    :::

    Interpolation instructions like :ref{r=anm:posTime} will continue to advance,
    and [interrupts](#anm/concepts&a=interrupt) can be triggered at any time.
    Successful interrupts will automatically re-enable the visibility flag.
  `},
  'case': {
    sig: 'S', args: ['n'], md: `
    A label for an [interrupt](#anm/concepts&a=interrupt). When executed, it is a no-op.
  `},
  'wait': {
    sig: 'S', args: ['t'], md: `
    :tipshow[Wait \`t\` frames.]

    An extremely similar effect can be achieved using [time labels](#anm/concepts&a=time):
    ~~~anm
    // Option 1: increasing the time label between instructions (+n: syntax)
      :ref{r=anm:posTime}(6, 0, 1f, 0f, 0f);
    +6:
      :ref{r=anm:alpha}(0);

    // Option 2: using wait
      :ref{r=anm:posTime}(6, 0, 1f, 0f, 0f);
      :ref{r=anm:wait}(6);
      :ref{r=anm:alpha}(0);
    ~~~
    The difference between the two is subtle, and depends on the game:

    * **:game[095] and earlier:**
      :ref{r=anm:wait} is implemented using a dedicated timer. :wip[This has not been tested],
      but it seems this may cause the two snippets to behave differently in cases where the
      current time is greater than the time label (which is possible through :ref{r=anm:jmp});
      in essence, :wip[it seems that :ref{r=anm:wait} will *always* wait the specified number of frames
      regardless of the current time in these early games.]
    * **:game[10] and later:** This now works by actually subtracting \`t\` from the current time
      before executing the next instruction.  Thus, the only difference between the two snippets
      is that :ref{r=anm:wait} produces simpler time labels.
      (notice that \`thanm\` has \`timeof(label)\` syntax to make option 1 less painful anyways)
  `},
  'caseReturn': {
    sig: '', args: [], md: `
    :::tipshow
    Can be used at the end of a :ref{r=anm:case} block to return back
    to the moment just before the VM received the [interrupt](#anm/concepts&a=interrupt).
    :::

    This is not the only way to end a :ref{r=anm:case} block; oftentimes the game may use a :ref{r=anm:stop} instead.
    You can read a more detailed discussion in the link above on interrupts, but the broad recommendation is:

    * :ref{r=anm:caseReturn} is required if you want to allow your VM to return to a longer running part of
      the script after being interrupted.
    * If :ref{r=anm:caseReturn} is used, you should avoid any form of waiting inside that particular
      :ref{r=anm:case} block. (else risk creating an infinite loop...)
  `},
});

// =====================
// ==== OPS N JUMPS ====
// =====================
mapAssign(byRefId, {
  'v0-jmp': {
    sig: 'S', args: ['dest'], succ: 'jmp', md: `
    Jumps to byte offset \`dest\` from the script's beginning, and sets the time to that
    instruction's [time label](#anm/concepts&a=time).
  `},
  'jmp': {
    sig: 'SS', args: ['dest', 't'], md: `
    :::tipshow
    Jumps to byte offset \`dest\` from the script's beginning and sets the time to \`t\`.
    \`thanm\` accepts a label name for \`dest\`.
    :::

    :wip2[Chinese wiki says some confusing recommendation about setting a=0, can someone explain to me?]
  `},
  'jmpDec': {
    sig: '$SS', args: ['x', 'dest', 't'], md: `
    :tipshow[Decrement \`x\` and then jump if \`x > 0\`.  You can use this to repeat a loop a fixed number of times.]

    ~~~anm
      :ref{r=anm:set}(:ref{r=anmvar:i0}, 3);
    loop:
      // ...
      // anything in this block will be done 3 times
      // ...
      :ref{r=anm:jmpDec}(:ref{r=anmvar:i0}, loop);
    ~~~
  `},
});

const JUMP_DATA = {jmpEq: "==", jmpNe: "!=", jmpLt: "<", jmpLe: "<=", jmpGt: ">", jmpGe: ">="};
for (const [mnemonic, operator] of Object.entries(JUMP_DATA)) {
  for (const [suffix, ty] of [['', 'S'], ['F', 'f']]) {
    byRefId.set(`${mnemonic}${suffix}`, {
      sig: `${ty}${ty}SS`,
      args: ['a', 'b', 'dest', 't'],
      md: `Jumps if \`a ${operator} b\`.`,
    });
  }
}

const OPERATOR_DATA = {set: "=", add: "+=", sub: "-=", mul: "*=", div: "/=", mod: "%="};
for (const [mnemonic, operator] of Object.entries(OPERATOR_DATA)) {
  for (const [suffix, refTy, valTy] of [['', '$', 'S'], ['F', '%', 'f']]) {
    byRefId.set(`${mnemonic}${suffix}`, {
      sig: `${refTy}${valTy}`,
      args: ['a', 'b'],
      md: `Does \`a ${operator} b\`.`,
    });
  }
}

const OPERATOR_3_DATA = {add: "+", sub: "-", mul: "*", div: "/", mod: "%"};
for (const [mnemonic, operator] of Object.entries(OPERATOR_3_DATA)) {
  for (const [suffix, refTy, valTy] of [['', '$', 'S'], ['F', '%', 'f']]) {
    byRefId.set(`${mnemonic}${suffix}3`, {
      sig: `${refTy}${valTy}${valTy}`,
      args: ['x', 'a', 'b'],
      md: `Does \`a = b ${operator} c\`.`,
    });
  }
}

mapAssign(byRefId, {
  'v3-rand': {sig: '$S', args: ['x', 'n'], succ: 'v4-rand', md: 'Draw a random integer `0 <= x < n` using the global RNG.'},
  'v3-randF': {sig: '%f', args: ['x', 'r'], succ: 'v4-randF', md: 'Draw a random float `0 <= x <= r` using the global RNG.'},
  'v4-rand': {sig: '$S', args: ['x', 'n'], succ: 'rand', md: 'Draw a random integer `0 <= x < n` using the selected RNG (see :ref{r=anm:v4-randMode}).'},
  'v4-randF': {sig: '%f', args: ['x', 'r'], succ: 'randF', md: 'Draw a random float `0 <= x <= r` using the selected RNG (see :ref{r=anm:v4-randMode}).'},

  'v4-randMode': {
    sig: 'S', args: ['mode'], succ: 'v8-randMode', md: `
    :tipshow[Selects the RNG used by this VM.]

    | Mode | Effect |
    | :---: | --- |
    | 0 | Uses the [replay RNG](#anm/concepts&a=rng) |
    | 1 | Uses the [animation RNG](#anm/concepts&a=rng) |

    It seems that 0, the replay RNG, is the default. This is in stark contrast to :game[13] onwards.
    (:wip[this seems surprising... can somebody conclusively verify this?])

    This flag will be enabled on any scripts created using any of the ANM instructions that create new VMs.
  `},

  'v8-randMode': {
    sig: 'S', args: ['mode'], wip: 1, md: `
    :tipshow[A (:wip[completely ineffectual?]) leftover of :ref{r=anm:v4-randMode}.]

    Scripts in modern games still use this exactly as they did back in ANM V4/V7, and
    :tip[all of the code that manipulates this bitflag on child creation is still present]{tip="though some of it is plain bugged in later games due to a memcpy added in TD after the flag is set in some
    instructions"},
    but all of the code that _uses_ the bitflag appears to be gone.
  `},

  'rand': {sig: '$S', args: ['x', 'n'], md: 'Draw a random integer `0 <= x < n` using the [animation RNG](#anm/concepts&a=rng).'},
  'randF': {sig: '%f', args: ['x', 'r'], md: 'Draw a random float `0 <= x <= r` using the [animation RNG](#anm/concepts&a=rng).'},

  'mathSin': {sig: '%f', args: ['dest', 'θ'], md: 'Compute `sin(θ)` (`θ` in radians).'},
  'mathCos': {sig: '%f', args: ['dest', 'θ'], md: 'Compute `cos(θ)` (`θ` in radians).'},
  'mathTan': {sig: '%f', args: ['dest', 'θ'], md: 'Compute `tan(θ)` (`θ` in radians).'},
  'mathAcos': {sig: '%f', args: ['dest', 'x'], md: 'Compute `acos(x)` (output in radians).'},
  'mathAtan': {sig: '%f', args: ['dest', 'm'], md: 'Compute `atan(m)` (output in radians).'},
  'mathReduceAngle': {sig: '%', args: ['θ'], md: 'Reduce an angle modulo `2*PI` into the range `[-PI, +PI]`.'},
  'mathCirclePos': {sig: '%%ff', args: ['x', 'y', 'θ', 'r'], md: `
    ~~~clike
    x = r*cos(θ);
    y = r*sin(θ);
    ~~~
  `},
  'mathCirclePosRand': {
    sig: '%%ff', args: ['x', 'y', 'rmin', 'rmax'], md: `
    :::tipshow
    Uniformly draws a random radius \`r\` in the interval given by \`rmin\` and \`rmax\`, and picks a random angle
    (both using the [animation RNG](#anm/concepts&a=rng)).
    Then basically computes :ref{r=anm:mathCirclePos} on those.
    :::

    This isn't the right way to uniformly draw points on a ring shape, but I don't think that's what it's used for anyways.
    (it's more like for just making a random vector with a random magnitude)
  `},
});

// =========================
// ==== RENDER SETTINGS ====
// =========================
mapAssign(byRefId, {
  'sprite': {
    sig: 'S', args: ['id'], md: `
    :tipshow[Sets the image used by this VM to one of the sprites defined in the ANM file.]
    A value of \`-1\` means to not use an image (this is frequently used with [special drawing instructions](#anm/ins&a=group-600)).
    thanm also lets you use the sprite's name instead of an index.

    :wip2[Under some unknown conditions, these sprite indices are transformed by a "sprite-mapping"
    function; e.g. many bullet scripts use false indices, presumably to avoid repeating the same script
    for 16 different colors.  The precise mechanism of this is not yet fully understood.]
  `},
  'spriteRand': {
    sig: 'SS', args: ['a', 'b'], md: `
    :tipshow[Selects a random sprite from \`a\` (inclusive) to \`a + b\` (exclusive).]

    * (&ndash;:game[128]): uses the [replay RNG](#anm/concepts&a=rng), regardless of :ref{r=anm:v4-randMode}.
    * (:game[13]&ndash;): uses the [animation RNG](#anm/concepts&a=rng).
  `},
  'blendAdditive': {sig: '', args: [], md: `Enables additive blending by setting \`D3DRS_DESTBLEND\` to \`D3DBLEND_ONE\`.`},
  'blendAlpha': {sig: '', args: [], md: `Disables additive blending by setting \`D3DRS_DESTBLEND\` to \`D3DBLEND_INVSRCALPHA\`. (the default)`},
  'blendAdditiveSet': {
    sig: 'S', args: ['enable'],
    succ: undefined, // one could say blendMode is a successor to this, but unfortunately the two instructions coexist in TH08 and TH09
    md: `
    :tipshow[Enables or disables additive blending.]

    Note: in :game[08], the more general :ref{r=anm:blendMode} is added, and this instruction becomes identical to

    ~~~anm
      :ref{r=anm:blendMode}(enable & 1);
    ~~~
  `},
  'blendMode': {
    sig: 'S', args: ['mode'], md: `
    :tipshow[Set color blending mode.]

    Modes for :game[14]: (other games may be different)

    :::table-footnotes
    | Mode | \`SRCBLEND\` | \`DESTBLEND\` | \`BLENDOP\` | Meaning |
    | :---: | ---           | --- | --- | --- |
    | 0 | \`SRCALPHA\` | \`INVSRCALPHA\` | \`ADD\` | Normal |
    | 1 | \`SRCALPHA\` | \`ONE\` | \`ADD\` | Add |
    | 2 | \`SRCALPHA\` | \`ONE\` | \`REVSUBTRACT\` | Subtract (but weird?)<sup>†</sup> |
    | 3 | \`ONE\` | \`ZERO\` | \`ADD\` | Replace |
    | 4 | \`INVDESTCOLOR\` | \`INVSRCCOLOR\` | \`ADD\` | Screen? (S + D - SD) |
    | 5 | \`DESTCOLOR\` | \`ZERO\` | \`ADD\` | Multiply, I guess? |
    | 6 | \`INVSRCCOLOR\` | \`INVSRCALPHA\` | \`ADD\` | *uh.*  (S(1-S) + D(1-alpha)) |
    | 7 | \`DESTALPHA\` | \`INVDESTALPHA\` | \`ADD\` | Normal but src is drawn *behind* dest |
    | 8 | \`SRCALPHA\` | \`ONE\` | \`MIN\` | Darken only? |
    | 9 | \`SRCALPHA\` | \`ONE\` | \`MAX\` | Lighten only? |

    <sup>†</sup> Weird because it seems this would also subtract alpha. (so if the thing you're drawing is fully opaque,
    the result will be fully transparent, deleting even the background...?)
    :::

    :wip[These are all untested, I only looked at assembly.]
  `},
  // TODO: Maybe link to RenderType enum.
  'renderMode': {
    sig: 'S', args: ['mode'], md: `
    :tipshow[Determines how the ANM is rendered.]

    Mode numbers can change between games, but the most popular modes have pretty stable numbers:

    * Mode 0 is for 2D sprites that do not require rotation.
    * Mode 1 is for 2D sprites that require rotation around the z-axis. <br>
      :wip[When you activate mode 1, things may suddenly become a bit blurry.  Visually it looks identical to
      mode 2 at zero rotation, but the cause seems different based on the code?]
    * Mode 8 is for sprites that need to rotate in 3D space.
    * :wip[Mode 2 is like mode 0, but shifts the position by (-0.5, -0.5) pixels, making it appear ever-so-slightly
        larger and blurrier.]
    * :wip[Any other modes used in scripts are a total mystery at this time.]
    * Many mode numbers are not intended for use by ANM scripts, and are instead reserved for instructions
      like :ref{r=anm:textureCircle} and :ref{r=anm:drawRect} (each one has its own mode).
  `},
  'playerBulletMode2': {
    sig: 'S', args: ['mode'], wip: 2, md: `
    :tipshow[Some weird kind of proto-:ref{r=anm:renderMode} used strictly for player bullet hit animations **and nothing else**.]

    The hit animation for a player bullet that has hit an enemy uses one of 6 different possible functions to
    render itself based on this value.  Based on experimentation, these appear to be

    * 0: Ignore scale and rotation.
    * 2: Apply scale and rotation.
    * 1, 3, 4, 5: Unused by IN. They're all different. Who knows why they exist.

    If you try to use this on anything other than a player bullet hit animation, it has no effect.
  `},
  'layer': {
    sig: 'S', args: ['n'], md: `
    :tipshow[Sets the layer of the ANM.]  :wip[This may or may not affect z-ordering? It's weird...]

    **Different layer numbers may behave differently!** Each game only has a finite number of layers,
    and certain groups of these layers are drawn at different stages [in the rendering pipeline](#anm/stages-of-rendering).
    Be especially careful when porting something from one game to another, as the layer groupings may have changed.
  `},
  'flipX': {
    sig: '', args: [], md: `
    :tipshow[Toggles mirroring on the x axis.]

    This very simply :tip[just]{tip="It also sets a bitflag but I think only EoSD uses it to keep the sign flipped during interpolation of scale."}
    flips the sign of \`sx\` in :ref{r=anm:scale}.  Future calls to :ref{r=anm:scale} will thus basically undo it.
  `},
  'flipY': {
    sig: '', args: [], md: `
    :tipshow[Toggles mirroring on the y axis.]

    This very simply :tip[just]{tip="It also sets a bitflag but I think only EoSD uses it to keep the sign flipped during interpolation of scale."}
    flips the sign of \`sy\` in :ref{r=anm:scale}.  Future calls to :ref{r=anm:scale} will thus basically undo it.
  `},
  'resampleMode': {
    sig: 'S', args: ['n'], md: `
    :tipshow[Determines how a sprite is resampled when scale is greater or less than 1f.]

    | Mode | D3D constant | Meaning | Layman's terms |
    | :---: | --- | --- | --- |
    | 0    | \`D3DTEXF_LINE\` | linear interpolation | blurry |
    | 1    | \`D3DTEXF_POINT\` | nearest-point sampling | big pixels |

    As an example, Reimu's sprite in :game[14] uses \`:ref{r=anm:resampleMode}(1)\`, while her hitbox animation does not.
    Here you can see the effect of enabling it on the hitbox during Shinmyoumaru's survival spell.<br>
    <img src="./content/anm/img/ins-v8-311.png" height="200px">
  `},
  'scrollMode': {
    sig: 'SS', args: ['xmode', 'ymode'], md: `
    :::tipshow
    Determines how a sprite pulls image data when an instruction like :ref{r=anm:uvScale}, :ref{r=anm:uVel},
    or :ref{r=anm:textureCircle} causes it to pull from [uv coords](#anm/concepts&a=uv-coords) outside the \`(0,0)-(1,1)\` rectangle.
    :::

    | Mode | D3D constant | Meaning |
    | :---: | --- | --- |
    | 0    | \`D3DTADDRESS_WRAP\` | texture repeats infinitely |
    | 1    | \`D3DTADDRESS_CLAMP\` | pixels at the edge extend to infinity |
    | 2    | \`D3DTADDRESS_MIRROR\` | like 0 but every other image is mirrored |
  `},
  'originMode': {
    sig: 'S', args: ['mode'], wip: 1, md: `
    :tipshow[Determines the origin used by the sprite.]

    | Value | Origin | Appropriate for |
    | :---: | ---    | --- |
    | 0     | Top left of target surface. | Border around the game. |
    | 1     | Location of ECL's (0, 0) in [rendering stages 1 to 3](#anm/stages-of-rendering&a=stage-1) | Game elements always drawn at 640x480. |
    | 2     | Location of ECL's (0, 0) in [rendering stage 4](#anm/stages-of-rendering&a=stage-4) | Game elements drawn at full res (e.g. boss HP). |

    **If your sprite is correctly positioned at 640x480 resolution but not at larger resolutions,
    you may want to check this setting.** (as well as :ref{r=anm:resolutionMode})

    :tipshow[Typically, :ref{r=anm:layer} will automatically set this to a good default.]
    :wip[Clear guidelines are not yet known for when you are required to override that default.]

    This only has an effect on root graphics. (for child graphics, the origin is always the parent's position)
  `},
  'resolutionMode': {
    sig: 'S', args: ['n'], wip: 1, md: `
    :tipshow[Determines how certain aspects of the game are scaled to the current resolution.]

    :wip[TODO: details]

    Typically, :ref{r=anm:layer} will automatically set this to a good default.
    :wip[Clear guidelines are not yet known for when you are required to override that default.]

    **If your sprite is correctly positioned at 640x480 resolution but not at larger resolutions,
    you may want to check this setting.** (as well as :ref{r=anm:originMode})
  `},
});

// ==================
// ==== DA BASICS ===
// ==================
mapAssign(byRefId, {
  'pos': {
    sig: 'fff', args: ['x', 'y', 'z'], md: `
    :tipshow[Sets the position of the graphic.]

    If you look in the code, you'll see that if a certain bitflag is set, this will write to a different variable.
    This is part of the implementation of :ref{r=anm:posMode} in earlier games, and is, to my knowledge, entirely dead code in every game since :game[095].
  `},
  'rotate': {
    sig: 'fff', args: ['rx', 'ry', 'rz'], md: `
    :tipshow[Set the graphic's rotation.  For 2D objects, only the z rotation matters.]

    In some rare cases, x rotation has a special meaning for [special drawing instructions](#anm/ins&a=group-600).
    Graphics rotate around their anchor point (see :ref{r=anm:anchor}).

    A positive angle around the z-axis goes **clockwise** from the +x direction towards the +y direction (defined to point down).
    3D rotations are performed as follows: (see the [conventions](#anm/conventions) page for more info)

    * (:game[06]) Rotate first around x, then around y, then around z.
    * (:game[07]&ndash;:game[128]) :wip[Haven't checked. Probably the same?]
    * (:game[13]&ndash;) You can choose the rotation system with :ref{r=anm:rotationSystem}. :wip[(what's the default? probably the same?)]

    *If nothing seems to be happening when you call this, check your :ref{r=anm:renderMode} setting!*
  `},
  'rotateAuto': {
    sig: 'b', args: ['mode'], md: `
    :tipshow[Sets the auto-rotate flag, which causes a graphic to rotate to face its direction of motion.]

    :::wip
    You can't just put this in any arbitrary script and expect it to work; the script must be used somewhere
    specifically designed to support it, such as an enemy bullet, a player bullet.
    A predecessor to this instruction :ref{r=anm:v0-26} also enabled auto rotation on secondary VMs on an enemy;
    not sure if that is still true here.
    <!-- there is something for enemies at th125.exe+0x41191b though -->
    :::
  `},
  'rotationSystem': {
    sig: 'S', args: ['mode'], md: `
    Sets the conventions for 3D rotation (e.g. XYZ, ZYX, etc.).
    :wip[TODO: Define the modes.]
  `},
  'scale': {
    sig: 'ff', args: ['sx', 'sy'], md: `
    Scales the ANM independently along the x and y axis.
    Graphics grow around their anchor point (see :ref{r=anm:anchor}).
    Some [special drawing instructions](#anm/ins&a=group-600) give the x and y scales special meaning.
  `},
  'scale2': {
    sig: 'ff', args: ['sx', 'sy'], md: `
    :tipshow[*As far as we know,* this is just an extra set of scale factors that apply separately (multiplicatively) to :ref{r=anm:scale}.]

    All [special drawing instructions](#anm/ins&a=group-600) ignore this (which is a shame, because it means you still can't
    draw ellipses...).
  `},
  'rgb-dword': {
    sig: 'S', args: ['rgb'], succ: 'rgb', md: `
    :tipshow[Set a color which gets blended with this sprite.]
    Blend operation is [multiply](https://en.wikipedia.org/wiki/Blend_modes#Multiply), so setting white (\`0xFFFFFF\`) eliminates the effect.

    This version takes a single dword in the form \`0x00RRGGBB\`.  Variables are not supported.
  `},
  'rgb': {
    sig: 'SSS', args: ['r', 'g', 'b'], md: `
    :tipshow[Set a color which gets blended with this sprite.]
    Blend operation is [multiply](https://en.wikipedia.org/wiki/Blend_modes#Multiply), so setting white (255, 255, 255) eliminates the effect.
  `},
  'alpha': {
    sig: 'S', args: ['alpha'], md: `
    Set alpha (opacity) to a value 0-255.
  `},
  'rgb2': {
    sig: 'SSS', args: ['r', 'g', 'b'], md: `
    Set a second color for gradients.  Gradients are used by certain [special drawing instructions](#anm/ins&a=group-600), and can be enabled
    on regular sprites using :ref{r=anm:colorMode}.
  `},
  'alpha2': {
    sig: 'S', args: ['alpha'], md: `
    Set a second alpha for gradients.  Gradients are used by certain [special drawing instructions](#anm/ins&a=group-600), and can be enabled
    on regular sprites using :ref{r=anm:colorMode}.
  `},
  'colorMode': {
    sig: 'S', args: ['mode'], md: `
    :tipshow[Lets you enable gradients on regular sprites.]

    | Value | Effect |
    | :---: |   ---  |
    |   0   | Only use the color set by :ref{r=anm:rgb} and :ref{r=anm:alpha}. |
    |   1   | Only use the color set by :ref{r=anm:rgb2} and :ref{r=anm:alpha2}. |
    |   2   | (:game[125]&ndash;) Horizontal gradient. |
    |   3   | (:game[125]&ndash;) Vertical gradient. |

    This has no effect on [special drawing instructions](#anm/ins&a=group-600).

    For some strange reason, from :game[14] onwards,
    :ref{r=anm:rgb2Time} and :ref{r=anm:alpha2Time} automatically do \`:ref{r=anm:colorMode}(1)\`.
    Therefore, if you use those instructions, you must call this *afterwards,* not before.

    **ECL modders beware:** The game may interfere with the use of :ref{r=anm:rgb2}, :ref{r=anm:alpha2} and :ref{r=anm:colorMode}
    on the VM in slot 0 of an enemy, because it uses them to make enemies blink when they take damage.
  `},
  'colorizeChildren': {
    sig: 'b', args: ['enable'], md: `
    :tipshow[Sets a bitflag that causes colorization (see :ref{r=anm:rgb}) to affect children as well.]

    The game uses this on yin-yang orb enemies to ensure that their satellites also flash on damage taken.
    In the following image, the damage flash was significantly exaggerated to make the difference easy to see.

    <img src="content/anm/img/ins-colorize-children.png">

    Notes:
    * Must be called *before* the children are created. (the bitflag is copied on child creation)
    * Not supported by [special drawing instructions](#anm/ins&a=group-600).
    * Both parent and child must not be using gradients (i.e. they must have :ref{r=anm:colorMode} 0 or 1).
  `},
  'angleVel': {sig: 'fff', args: ['ωx', 'ωy', 'ωz'], md: `Set a constant angular velocity, in radians per frame.`},
  'scaleGrowth': {sig: 'ff', args: ['gx', 'gy'], md: `
    Every frame, it increases the values of :ref{r=anm:scale} as \`sx -> sx + gx\` and \`sy -> sy + gy\`.
    Basically, :ref{r=anm:scaleGrowth} is to :ref{r=anm:scale} as :ref{r=anm:angleVel} is to :ref{r=anm:rotate}.
    (they even share implemenation details...)
  `},
  'uAdd': {sig: 'f', args: ['du'], md: `
    :tipshow[Adds \`du\` to the [texture u coordinate](#anm/concepts&a=uv-coords).]

    Later versions remove this entirely in favor of :ref{r=anm:uVel}.
  `},
  'vAdd': {sig: 'f', args: ['dv'], md: `
    :tipshow[Adds \`dv\` to the [texture v coordinate](#anm/concepts&a=uv-coords).]

    Later versions remove this entirely in favor of :ref{r=anm:vVel}.
  `},
  'uVel': {sig: 'f', args: ['vel'], md: `
    :::tipshow
    Add \`vel\` to the [texture u coordinate](#anm/concepts&a=uv-coords) every frame (in units of \`1 / total_image_width\`),
    causing the displayed sprite to scroll horizontally through the image file.
    :::

    This image shows :ref{r=anm:uVel} used with a negative argument:

    <img src="content/anm/img/ins-u-vel.gif">
  `},
  'vVel': {sig: 'f', args: ['vel'], md: `
    :::tipshow
    Add \`vel\` to the [texture v coordinate](#anm/concepts&a=uv-coords) every frame (in units of \`1 / total_image_height\`),
    causing the displayed sprite to scroll vertically through the image file.
    :::
  `},
  'uvScale': {sig: 'ff', args: ['uscale', 'vscale'], md: `
    :tipshow[Scales [texture uv coordinates](#anm/concepts&a=uv-coords).]  Values greater than 1 means that a larger
    region of the texture (spritesheet) is shown.  Typically used to make a texture repeat multiple times, but you
    can also use :ref{r=anm:scrollMode} to change what happens.

    Here is a demonstration using :ref{r=anm:uvScaleTime} to change \`uscale\` to 3 on the left,
    and \`vscale\` to 3 on the right.  (in this case, the sprite occupies the full texture)

    <img src="content/anm/img/ins-uv-scale.gif" height="200px">
  `},
  'anchorTopLeft': {sig: '', args: [], md: `
    :tipshow[Changes the anchor point to the top left. (default is center)]

    :wip[UNTESTED:]
    This is not entirely the same as :ref{r=anm:anchor} in future games.  In particular, judging from the code,
    I do not believe it changes the center of rotation or scaling, but rather merely translates the sprite
    by \`(+sx*w/2, +sy*h/2)\` *after* scaling and rotating it. (where \`w,h\` are sprite dimensions
    and \`sx,sy\` come from :ref{r=anm:scale}).
  `},
  'anchor': {sig: 'ss', args: ['h', 'v'], md: `
    :::tipshow
    Set the horizontal and vertical anchoring of the sprite.  Notice the args are each two bytes.
    For further fine-tuning see :ref{r=anm:anchorOffset}.
    :::

    | Args  |  0     |  1   | 2      |
    | :---:  | ---    | ---  | ---    |
    | \`h\` | Center | Left | Right  |
    | \`v\` | Center | Top  | Bottom |
  `},
  'anchorOffset': {sig: 'ff', args: ['dx', 'dy'], md: `
    :::tipshow
    Nudge the anchor point of the sprite right by \`dx\` pixels and down by \`dy\` pixels in the source image.
    Important for asymmetric bullet sprites because the anchor position is the center point for rotation and scaling.
    :::

    :wip[
    Surprisingly, UFO did not have this.
    At this time, it is unclear how rotated bullets were correctly positioned in those earlier games.
    ]

    In the image below, both hearts are rotating using :ref{r=anm:angleVel}\`(0f, 0f, rad(3))\`,
    but the pink heart additionally has:

    ~~~anm
      :ref{r=anm:anchor}(1, 1);
      :ref{r=anm:anchorOffset}(9.5f, 25f);
    ~~~

    ![anchorOffset demo](./content/anm/img/ins-v8-436.gif)
  `},
});

// more timely basics
mapAssign(byRefId, {
  'posTime': {sig: 'SSfff', args: ['t', 'mode', 'x', 'y', 'z'], md: `Over the next \`t\` frames, changes :ref{r=anm:pos} to the given values using [interpolation mode](#anm/interpolation) \`mode\`.`},
  'rotateTime': {sig: 'SSfff', args: ['t', 'mode', 'rx', 'ry', 'rz'], md: `Over the next \`t\` frames, changes :ref{r=anm:rotate} to the given values using [interpolation mode](#anm/interpolation) \`mode\`.`},
  'scaleTime': {sig: 'SSff', args: ['t', 'mode', 'sx', 'sy'], md: `Over the next \`t\` frames, changes :ref{r=anm:scale} to the given values using [interpolation mode](#anm/interpolation) \`mode\`.`},
  'scale2Time': {sig: 'SSff', args: ['t', 'mode', 'sx', 'sy'], md: `Over the next \`t\` frames, changes :ref{r=anm:scale2} to the given values using [interpolation mode](#anm/interpolation) \`mode\`.`},
  'uvScaleTime': {sig: 'SSff', args: ['t', 'mode', 'uscale', 'vscale'], md: `Over the next \`t\` frames, changes :ref{r=anm:uvScale} to the given values using [interpolation mode](#anm/interpolation) \`mode\`.`},
  'alphaTime': {sig: 'SSS', args: ['t', 'mode', 'alpha'], md: `Over the next \`t\` frames, changes :ref{r=anm:alpha} to the given values using [interpolation mode](#anm/interpolation) \`mode\`.`},
  'alpha2Time': {sig: 'SSS', args: ['t', 'mode', 'alpha'], md: `
    :tipshow[Over the next \`t\` frames, changes :ref{r=anm:alpha2} to the given value using [interpolation mode](#anm/interpolation) \`mode\`.]

    For some reason, in :game[14] onwards, this also sets :ref{r=anm:colorMode} to 1, which can be a mild inconvenience.
  `},
  'rgbTime-dword': {
    sig: 'SSS', args: ['t', 'mode', 'rgb'], succ: 'rgbTime', md: `
    Over the next \`t\` frames, changes :ref{r=anm:rgb-dword} to the given value using [interpolation mode](#anm/interpolation) \`mode\`.

    This version takes a single dword in the form \`0x00RRGGBB\`.  Variables are not supported.
  `},
  'rgbTime': {sig: 'SSSSS', args: ['t', 'mode', 'r', 'g', 'b'], md: `Over the next \`t\` frames, changes :ref{r=anm:rgb} to the given value using [interpolation mode](#anm/interpolation) \`mode\`.`},
  'rgb2Time': {sig: 'SSSSS', args: ['t', 'mode', 'r', 'g', 'b'], md: `
    :tipshow[Over the next \`t\` frames, changes :ref{r=anm:rgb2} to the given value using [interpolation mode](#anm/interpolation) \`mode\`.]

    For some reason, in :game[14] onwards, this also sets :ref{r=anm:colorMode} to 1, which can be a mild inconvenience.
  `},
  'uVelTime': {sig: 'SSf', args: ['t', 'mode', 'vel'], md: `
    :tipshow[Over the next \`t\` frames, changes :ref{r=anm:uVel} to the given value using [interpolation mode](#anm/interpolation) \`mode\`.]

    Remember that :ref{r=anm:uVel} is scroll *velocity,* not position.
  `},
  'vVelTime': {sig: 'SSf', args: ['t', 'mode', 'vel'], md: `
    :tipshow[Over the next \`t\` frames, changes :ref{r=anm:vVel} to the given value using [interpolation mode](#anm/interpolation) \`mode\`.]

    Remember that :ref{r=anm:vVel} is scroll *velocity,* not position.
  `},
  'rotateTime2D': {
    sig: 'SSf', args: ['t', 'mode', 'rz'], md: `
    :tipshow[A compact version of :ref{r=anm:rotateTime} that only interpolates the z rotation.]
    Only used by :game[128] in the main menu.

    (note: :ref{r=anm:rotateTime2D} and :ref{r=anm:rotateTime} are tracked separately, but judging from the code, they **are not** meant
    to be used together and their effects do not stack properly)
  `},
  'v0-alphaTimeLinear': {
    sig: 'SS', args: ['alpha', 't'], md: `
    :tipshow[:wip[UNTESTED:] Linearly changes alpha to \`alpha\` over the next \`t\` frames.]
    Identical to calling :ref{r=anm:alphaTime}\`(t, 0, alpha)\`.
  `},
  'v0-posTimeLinear': {
    sig: 'fffS', args: ['x', 'y', 'z', 't'], wip: 1, md: `
    :tipshow[:wip[UNTESTED:] Linearly changes position to \`(x, y, z)\` over the next \`t\` frames.]
    Identical to calling :ref{r=anm:posTime}\`(t, 0, x, y, z)\`.
  `},
  'v0-posTimeEaseout': {
    sig: 'fffS', args: ['x', 'y', 'z', 't'], wip: 1, md: `
    :tipshow[:wip[UNTESTED:]
    Changes position to \`(x, y, z)\` over the next \`t\` frames with a sudden burst
    of speed that decelerates over time.]
    Identical to calling :ref{r=anm:posTime}\`(t, 4, x, y, z)\`.
  `},
  'v0-posTimeEaseout4': {
    sig: 'fffS', args: ['x', 'y', 'z', 't'], wip: 1, md: `
    :tipshow[:wip[UNTESTED:]
    Changes position to \`(x, y, z)\` over the next \`t\` frames with a sudden burst
    of speed that sharply decelerates as \`t^4\`.]
    Identical to calling :ref{r=anm:posTime}\`(t, 6, x, y, z)\`.
  `},
  'v0-scaleTimeLinear': {
    sig: 'ffS', args: ['sx', 'sy', 't'], wip: 1, md: `
    :tipshow[:wip[UNTESTED:]
    Linearly changes scale to \`(sx, sy)\` over the next \`t\` frames.]
    Identical to calling :ref{r=anm:scaleTime}\`(t, 0, sx, sy)\`.
  `},
  'posBezier': {
    sig: 'Sfffffffff', args: ['t', 'x1', 'y1', 'z1', 'x2', 'y2', 'z2', 'x3', 'y3', 'z3'], md: `
    :tipshow[In \`t\` frames, moves to \`(x2, y2, z2)\` using Bezier interpolation.]

    * The graphic starts at its current position.
    * \`(x1/t, y1/t, z1/t)\` is the **initial velocity.**
    * \`(x2, y2, z2)\` is the **final position.**
    * \`(x3/t, y3/t, z3/t)\` is the **final velocity.**
  `},
  'posTime2D': {
    sig: 'SSff', args: ['t', 'mode', 'x', 'y'], wip: 1, md: `
    Looks like a 2D version of :ref{r=anm:posTime}?  (:wip[Is that all? Seems pointless])
  `},
});

// conditionally add text about these instructions being obsoleted from PCB onwards.
// (FIXME: ideally this would just use a tag to conditionally display text based on game,
//         rather than registering these as new names)
for (const {name, replacement} of [
  {name: 'alphaTimeLinear', replacement: `alphaTime`},
  {name: 'posTimeLinear', replacement: `posTime`},
  {name: 'posTimeEaseout', replacement: `posTime`},
  {name: 'posTimeEaseout4', replacement: `posTime`},
  {name: 'scaleTimeLinear', replacement: `scaleTime`},
]) {
  const oldName = `v0-${name}`;
  const newName = `${name}`;

  const newData = {...byRefId.get(oldName)!};
  newData.md = `
    **Obsolete.** Use :ref{r=anm:${replacement}} instead.

${newData.md}
  `;
  byRefId.get(oldName)!.succ = newName;
  byRefId.set(newName, newData);
}


// =================
// ==== DRAWING ====
// =================

// 2D texture circles
mapAssign(byRefId, {
  'textureCircle': {
    sig: 'S', args: ['nmax'], md: `
    :tipshow[Wraps a texture into a thin ring (annulus).  The argument determines the size of an internal buffer.]

    First, the texture is repeated an integer number of times along the y axis.
    Then, it is stretched and wrapped into an annular shape as follows:

    * The x-scale from :ref{r=anm:scale} is the **width** of the annulus (R2-R1).
    * The y-scale is the **radius** of the "middle" of the texture. (0.5*(R1+R2))
    * :ref{r=anmvar:i0} is the **number of points** to create along this arc section.
    * :ref{r=anmvar:i1} is the **number of times the texture is repeated**.

    After calling this command you can **change these parameters in real-time** simply by
    modifying :ref{r=anm:scale}, :ref{r=anmvar:i0} and :ref{r=anmvar:i1}. Further notes:

    * **:ref{r=anmvar:i0} MUST be \`<= nmax\` at all times!**
    * For this command, the last point is equal to the first point, so n points makes an (n-1)gon.
    * The repeating of the texture is done in a manner affected by :ref{r=anm:scrollMode},
      and the sprite is assumed to span the full height of its image file.
    * The image is reversed; use a negative x-scale to make it normal.

    :wip[Out of all five 600-series instructions that contort textures, this instruction is unique in that it
    appears to support gradients whenever :ref{r=anm:colorMode} is nonzero, but I haven't tested this.]

    Comparison image of the two-dimensional texture circle instructions in TH17:

    ![600, 601, 602 comparison](./content/anm/img/ins-v8-texCircle.png)
  `},
  'textureArc': {
    sig: 'S', args: ['nmax'], md: `
    :tipshow[Similar to :ref{r=anm:textureCircle}, but creates an arc segment beginning from an angle of zero and running clockwise.]
    In addition to all of the settings :ref{r=anm:textureCircle}, this has one additional parameter:
    * The x rotation from :ref{r=anm:rotate} defines **the angle subtended by the arc.**

    Note that the shape will always contain :ref{r=anmvar:i1} full copies of the image. (they stretch and shrink with
    \`rotx\` rather than being cut off).
  `},
  'textureArcEven': {
    sig: 'S', args: ['nmax'], md: `
    Identical to :ref{r=anm:textureArc} but awkwardly centered around angle 0 rather than starting at 0.
  `},
  'textureCylinder3D': {
    sig: 'S', args: ['nmax'], md: `
    :::tipshow
    Wraps a texture into the 3D surface of a cylindrical section.
    The argument determines the size of an internal buffer.
    :::

    First, the texture is repeated an integer number of times along the y axis.
    (this is done in a manner affected by :ref{r=anm:scrollMode},
    and the sprite is assumed to span the full height of its image file).
    Then, it is turned on its side in 3D space, stretched and wrapped into a section
    of a cylinder as follows:

    * :ref{r=anmvar:f0} is the **total angle** subtended by the arc section.  (\`2PI\` = a full cylinder)
    * :ref{r=anmvar:f1} is the **height**.
    * :ref{r=anmvar:f2} is the **radius**.
    * :ref{r=anmvar:f3} is the **center angle** of the arc section, measured towards +z from the x-axis (see image).
    * :ref{r=anmvar:i0} is the **number of points** to create along this arc section.  (this MUST be \`<= nmax\` at all times!)
    * :ref{r=anmvar:i1} is the **number of times the texture is repeated**.

    After calling this command you can modify these variables to change the shape in real-time.

    <img src="./content/anm/img/ins-v8-609.png" height="250px">
  `},
  'textureRing3D': {
    sig: 'S', args: ['nmax'], md: `
    :::tipshow
    Wraps a texture into a thin ring (annulus) positioned in 3D space (i.e. the stage background).
    The argument determines the size of an internal buffer.
    :::

    First, the texture is repeated an integer number of times along the y axis.
    (this is done in a manner affected by :ref{r=anm:scrollMode},
    and the sprite is assumed to span the full height of its image file).
    Then, it is laid flat on the xz-plane in 3D space, and then
    stretched and wrapped into an annular shape as follows:

    * :ref{r=anmvar:f0} is the **total angle** subtended by the arc section.  (\`2PI\` = a full cylinder)
    * :ref{r=anmvar:f1} is the **width** of the annulus. (R2 - R1)
    * :ref{r=anmvar:f2} is the **radius of the "middle"** of the texture.  (1/2 * (R1 + R2))
    * :ref{r=anmvar:f3} is the **center angle** of the arc section, measured towards +z from the x-axis (see image).
    * :ref{r=anmvar:i0} is the **number of points** to create along this arc section.  (this MUST be \`<= nmax\` at all times!)
    * :ref{r=anmvar:i1} is the **number of times the texture is repeated**.

    After calling this command you can modify these variables to change the shape in real-time.

    <img src="./content/anm/img/ins-v8-610.png" height="250px">
  `},
});

// Circle-drawing family
mapAssign(byRefId, {
  'drawPoly': {
    sig: 'fS', args: ['radius', 'nInit'], md: `
    :tipshow[Draws a filled regular n-gon with a gradient going from center to edge.]
    \`nInit\` will be stored in the integer variable :ref{r=anmvar:i0}, where you can change it at any time.
    If you want to change the radius in real-time or from ECL, you can adjust the x-scale from :ref{r=anm:scale}
    (which gets multiplied into the \`radius\` argument).
  `},
  'drawPolyBorder': {
    sig: 'fS', args: ['radius', 'nInit'], md: `
    Like :ref{r=anm:drawPoly} but draws a 1-pixel border. No gradients.
  `},
  'drawRing': {
    sig: 'ffS', args: ['radius', 'thickness', 'nInit'], md: `
    :tipshow[Draws a filled ring (annulus) with n sides.  No gradients.]
    \`nInit\` is stored in $I0 like :ref{r=anm:drawPoly} and :ref{r=anm:drawPolyBorder}.
    \`radius\` is mean radius (0.5*(R1+R2)), \`thickness\` is (R2 - R1).
    If you want to change the parameters in real-time or from ECL,
    use the :ref{r=anm:scale} instruction; x-scale is multiplied into \`radius\`,
    y-scale is multiplied into \`thickness\`.
  `},
});

// Rectangle-drawing family
mapAssign(byRefId, {
  'drawRect': {
    sig: 'ff', args: ['w', 'h'], md: `
    :::tipshow
    Draws a filled rectangle with the given dimensions.  No gradients.
    If you want to control the dimensions from ECL, consider passing in \`1.0\` and changing the anm's scale instead.
    :::

    Image of the rectangle-drawing family of instructions in TH17:

    ![Overview of rectangle-drawing instructions in TH17.](./content/anm/img/ins-v8-drawRect.png)
  `},
  'drawRectGrad': {
    sig: 'ff', args: ['w', 'h'], md: `
    Same as :ref{r=anm:drawRect} but supports gradients (:ref{r=anm:rgb2}), which go from left to right.
  `},
  'drawRectShadow': {
    sig: 'ff', args: ['w', 'h'], md: `
    :::tipshow
    A variant of :ref{r=anm:drawRect} intended for rotated rectangles, which smooths out the edges somewhat.
    :::

    **Be careful!** This can look ugly if your rotation is zero, *especially* if it moves!

    :::more
    More precisely, the implementation does the following:
    1. Draw a rectangle like :ref{r=anm:drawRect} but of size \`(w+1, h+1)\`, and \`0.5 * alpha\`.
    2. Then draw a rectangle exactly like :ref{r=anm:drawRect}.

    The first step is basically a sort of poor man's anti-aliasing hack, by creating something
    that's half of a pixel larger in each direction.  When the rectangle is rotated, some of the
    pixels along each edge will receive this half-alpha color, creating less jagged edges.
    In this image, :ref{r=anm:drawRectShadow} is on the right:

    <img src="content/anm/img/shadowgrad-rotate.gif">

    At zero rotation however, the effect looks pretty bad, because basically all of the
    pixels along one horizontal edge and one vertical edge will get the half-alpha color.
    This creates a sort of "drop shadow" that will bounce around between opposite sides of
    the object as it moves, as seen here:

    <img src="content/anm/img/shadowgrad-move.gif">

    Even if you can't quite see it, something certainly *feels* off about the square
    on the right, wouldn't you agree?
    :::
  `},
  'drawRectShadowGrad': {
    sig: 'ff', args: ['w', 'h'], md: `
    Same as :ref{r=anm:drawRect} but supports gradients (:ref{r=anm:rgb2}), which go from left to right.
  `},
  'drawRectBorder': {
    sig: 'ff', args: ['w', 'h'], md: `
    :tipshow[Draws a 1-pixel thick outline of a rectangle.  No gradients.]

    Just like :ref{r=anm:drawRect}, you can control the dimensions externally using :ref{r=anm:scale}.
    (the border will remain 1 pixel thick even when scaled)
  `},
  'drawLine': {
    sig: 'ff', args: ['len', 'unused'], md: `
    :tipshow[Draws a 1-pixel thick horizontal line.  The second argument is unused.  No gradients.]

    Just like :ref{r=anm:drawRect}, you can change the length on demand by setting the x-scale in :ref{r=anm:scale};
    the y-scale has no effect. If you want to change its direction, you must use :ref{r=anm:rotate}.
  `},
  'drawArc': {
    sig: 'ff', args: ['radius', 'angle'], wip: 1, md: `
    :tipshow[:wip[Draws an arc?]]

    Dai wrote the following: *the instruction is \`ins_614(float a, float b)\`, and I think it draws a single polygon from the center of the ANM object to a distance set by \`a\`, with an angle width of \`b\`.*
    :wip[FIXME: We need an image.  Also should check if :ref{r=anmvar:i0} controls the number of edges like in the texture instructions.]
  `},
});

// ==================
// ==== CHILDREN ====
// ==================
mapAssign(byRefId, {
  'createChild': {
    sig: 'S', args: ['script'], md: `
    The standard way to create a child graphic.
  `},
  'prependChild': {
    sig: 'S', args: ['script'], wip: 1, md: `
    Create a child graphic, but insert it **at the front** of the [world list](#anm/ontick-ondraw) instead of the back.
  `},
  'createChildUi': {
    sig: 'S', args: ['script'], md: `
    Create a child graphic, but insert it at the back **of the [UI list](#anm/ontick-ondraw)** instead.

    UI ANMs are ticked even while the game is paused.
  `},
  'prependChildUi': {
    sig: 'S', args: ['script'], wip: 1, md: `
    Create a child graphic, but insert it **at the front of the [UI list](#anm/ontick-ondraw)**.
  `},
  'attached': {
    sig: 'S', args: ['enable'], wip: 1, md: `
    Sets a bitflag.  When the bitflag is enabled, the graphic will move as its parent rotates.
    (picture a person holding a shield; as the person rotates, the shield moves around them)

    :wip[Where is it used? Are there other effects?]
  `},
  'createEffect': {
    sig: 'S', args: ['kind'], wip: 1, md: `
    Creates a special child graphic that may have additional hardcoded behavior.

    Different games have different effects!  Someday we'll have a table of them.
  `},
  'createRoot': {
    sig: 'S', args: ['script'], wip: 1, md: `
    :tipshow[Creates a new root VM. (i.e. the new VM will have no parent)]

    Pseudocode:
    ~~~clike
    new_vm.rotation = this.rotation;
    new_vm.pos = {0f, 0f, 0f};
    new_vm.pos_2 = this.pos;
    new_vm.pos_3 = this.pos_3;
    ~~~
    \`pos_2\` and \`pos_3\` refer to the mysterious [extra position vectors](#anm/concepts&a=position).
    Assuming that \`pos_2\` on the parent is initially 0, one could perhaps say that :ref{r=anm:pos}\`(0f, 0f)\`
    for the new VM corresponds to the original location of the parent when it called this instruction.
  `},
  'createChildPos': {
    sig: 'Sff', args: ['script', 'x', 'y'], wip: 1, md: `
    :tipshow[Creates a child at an offset from this graphic.]

    The child's [three position variables](#anm/concepts&a=position) will be:
    ~~~clike
    child.pos = {0f, 0f, 0f};
    child.pos_2 = {x, y, 0f};
    child.pos_3 = {0f, 0f, 0f};
    ~~~
  `},
  'createRootPos': {
    sig: 'Sff', args: ['script', 'x', 'y'], wip: 1, md: `
    :tipshow[Combines the effects of :ref{r=anm:createRoot} and :ref{r=anm:createChildPos}.]

    The net effect on the [three position variables](#anm/concepts&a=position) is:
    ~~~anm
    new_vm.rotation = this.rotation;
    new_script.pos = {0f, 0f, 0f};
    new_script.pos_2 = {x, y, 0f};  // <-- arguments
    new_script.pos_3 = this.pos_3;
    ~~~
    One can almost define :ref{r=anm:createRoot} in terms of this: (just missing the z coordinate)
    ~~~anm
    :ref{r=anm:createRootPos}(script, :ref{r=anmvar:pos-x}, :ref{r=anmvar:pos-y});
    ~~~
  `},
  'ignoreParent': {
    sig: 'S', args: ['ignore'], md: `
    :::tipshow
    Sets a bitflag.  If the bitflag is 1, then in many different contexts, the ANM will e.g. ignore the
    parent's position/scale/rotation/etc. and it will be allowed to use e.g. :ref{r=anm:originMode} as though
    it were root.
    :::

    The only game to ever make proper use this was :game[125], where it was used by some multilayered,
    rotating spell backgrounds as well as the enemy names and diagonal banners on level entry
    (children of the "Shoot!" text).

    Generally speaking, it does not seem that this instruction is ever really *necessary*, which is
    probably why it's no longer used.  If you find yourself needing it, you may want to consider the
    alternative of turning the child into a sibling instead, by giving the two scripts a common parent.
    (This will probably be more reliable/less buggy in the end.)
  `},
  'copyParentVars': {
    sig: '', args: [], md: `
    :tipshow[When called on a child graphic, copies over a number of variables from its parent.]

    They are:
    :::headless-table
    | | | | |
    | --- | --- | --- | --- |
    | :ref{r=anmvar:i0} | :ref{r=anmvar:f0} | :ref{r=anmvar:i4}             | :ref{r=anmvar:rand-param-int} |
    | :ref{r=anmvar:i1} | :ref{r=anmvar:f1} | :ref{r=anmvar:i5}             | :ref{r=anmvar:mystery-angle-x}  |
    | :ref{r=anmvar:i2} | :ref{r=anmvar:f2} | :ref{r=anmvar:rand-param-one} | :ref{r=anmvar:mystery-angle-y}  |
    | :ref{r=anmvar:i3} | :ref{r=anmvar:f3} | :ref{r=anmvar:rand-param-pi}  | :ref{r=anmvar:mystery-angle-z}  |
    :::

    :wip[(example use case? the game uses it a lot...)]

    ![copyParentVars demonstration](./content/anm/img/ins-v8-509.gif)
  `},
});

// ============================
// ==== WEIRD-ASS NONSENSE ====
// ============================
mapAssign(byRefId, {
  'v1-31': {sig: 'S', args: ['a'], wip: 2, md: `:wip2[Sets a bitflag.]`},
  'v4-111': {sig: 'S', args: ['a'], wip: 2, md: `:wip2[Sets a 2-bit bitfield.]`},
  'v8-418': {
    sig: '', args: [], md: `
    :::tipshow
    A bizarre and **totally unused** instruction that appears to select a new sprite in the image file based on the anm's coordinates.
    :::

    :::more
    The code does the following:
    * Using the current position, scale, etc. and :ref{r=anm:renderMode} setting (which must be \`<= 3\`),
      compute the corners of the rectangle that the ANM would occupy on the surface it is being drawn to.
    * Divide each corner's coords by 640x480 (regardless of resolution or original image size).
    * Use those as fractional uv coordinates for a region to pull sprite data from.

    This basically lets you use any arbitrary rectangular region of a spritesheet as a sprite, even rotated ones!

    Presumably, the intended use is to set :ref{r=anm:rotate} and :ref{r=anm:pos} and etc. for picking a sprite,
    call this instruction, and then change :ref{r=anm:pos} and etc. again to the desired location for display.
    You get a pretty cool effect though if you simply let the before and after positions be the same,
    where it looks like a sort of window into another world.  (thanks to Priw8 for the video!)

    <video controls width="400" height="300" preload="none" poster="content/anm/img/priw8-418-thumb.png">
      <source type="video/mp4" src="content/anm/img/priw8-418.mp4">
      <a download href="content/anm/img/priw8-418.mp4">Download video (.MP4)</a>
    </video>
    :::
  `},
  'noZBuffer': {
    sig: 'S', args: ['disable'], wip: 1, md: `
    :tipshow[If \`disable\` is 1, writing to the z-buffer is disabled.  Otherwise, it is enabled.]
    This can matter in cases where z-testing is used to filter writes.
    (:wip[under what conditions are z-testing enabled, anyway?])
    :wip[This seems strange. Are there other, unknown effects?]

    It is extremely difficult to find examples where this has any noticeable effect,
    but there's an example in :game[14] stage 4:

    <a href="./content/anm/img/ins-v8-305.png" target="_blank"><img src="./content/anm/img/ins-v8-305.png" style="max-width:100%;"></a>
  `},
  'v8-306': {
    sig: 'S', args: ['enable'], wip: 2, md: `
    :::wip2
    :tipshow[Sets the state of a STD-related bitflag.]
    When this flag is enabled, some unknown vector from the stage background
    camera data is added to some poorly-understood position-related vector on the ANM, for an even more unknown purpose.
    :::
  `},
  'posAdopt': {
    sig: '', args: [], wip: 2, md: `
    :wip2[Copies [\`pos_3\`](#anm/concepts&a=position) into \`pos\`, and zeros out \`pos_3\`...]
  `},
  'visible': {
    sig: 'b', args: ['visible'], md: `
    :tipshow[Set the visibility flag (1 = visible). Invisible graphics are skipped during rendering.]

    Generally speaking this is not a huge deal as the most expensive parts of rendering are typically
    skipped anyways whenever :ref{r=anm:alpha} and :ref{r=anm:alpha2} are both 0. (and the latter defaults to 0).

    The visibility flag is automatically set to 1 whenever a successful [interrupt](#anm/concepts&a=interrupt) occurs.
  `},
  'v0-26': {
    sig: 's', args: ['arg'], wip: 2, md: `
    :tipshow[Uhhhhh. Geeze.  I dunno.  Might be a precursor to :ref{r=anm:renderMode}?]

    Sets a word-sized field. Only ever called with the arguments 1, 2, or (:game[08]&ndash;) 18.
    * **1** &mdash; :wip2[Don't know.  Used by player and bullet ANMs in all pre-:game[10] games.
      There's something added in the IN background code at \`th08.exe+0x0a0ce\` where it does something with color...]
    * **2** &mdash; enables spherical billboarding when used on 3D background sprites.
    * **18** &mdash; :wip2[...also enables sperical billboarding? See \`th08.exe+0x0a929\` in the background rendering code.]
    * Additionally, enemy rendering code at \`th08.exe+0x42e1e6\` sets the z-rotation on any *slotted VM* where this
      field is nonzero. (slotted VMs only; the primary VM looks at the flag on the enemy set by ECL \`ins_145\` instead)
  `},
  'v8-flag-316': {sig: '', args: [], wip: 2, md: `:wip2[Enables an unknown bitflag. Clear with :ref{r=anm:v8-flag-317}.]`},
  'v8-flag-317': {sig: '', args: [], wip: 2, md: `:wip2[Clears the bitflag from :ref{r=anm:v8-flag-316}.]`},
  'v8-flag-419': {sig: 'S', args: ['enable'], wip: 2, md: `:wip2[Sets the state of an unknown bitflag.]`},
  'v8-flag-431': {sig: 'S', args: ['enable'], wip: 2, md: `:wip2[Sets the state of an unknown bitflag.]`},
  'slowdown-immune': {sig: 'S', args: ['enable'], md: `Makes a VM immune to game speed changes. Only used by photo games.`},
  'v4-texCircle2': {sig: '', args: [], wip: 2, md: ':wip2[unidentified member of texCircle family, likely :ref{r=anm:textureArcEven}]'},
  'v4-texCircle3': {sig: '', args: [], wip: 2, md: ':wip2[unidentified member of texCircle family, likely :ref{r=anm:textureArc}]'},
  'vd-imaginary-439': {
    sig: 'S', args: ['_'], md: `
    :tipshow[ANM \`ins_439\` does not exi[s](http://www.scpwiki.com/scp-3930)t.]
    It is used by :game[165] in \`photo.anm\`, where it does nothing because, again, *it does not exist.*
    We thank you for your understanding.

    To make matters worse, in :game[18], this ID gets reused for another instruction with a different signature!
  `},
  'posMode': {
    sig: 'S', args: ['flag'], wip: 1, md: `
    :tipshow[Sets the state of a bitflag that controls how positioning works.]

    I'm working on a page that explains in more detail, but the short of it is: VM positioning in pre-v4 games is awkward.  :ref{r=anm:pos} has virtually no effect on many types of sprites (e.g. enemies) due to how position is defined in these games.  For these types of sprites, you can use :ref{r=anm:posMode}\`(1)\` to cause :ref{r=anm:pos} to define a *relative* offset instead.
  `},
  'blink': {
    sig: 'S', args: ['arg'], wip: 2, md: `
    :::wip2
    :tipshow[
    **Never used.** Does some bit math and then sets what *appears* to be the color flag
    (which picks between :ref{r=anm:rgb} and :ref{r=anm:rgb2})?
    ] Somebody plz test.

    Specifically, I think it sets the color flag equal to \`floor(arg / 256) % 2\`.  Thus, calling it with an
    increasing argument should lead to blinking.
    :::
  `},
  'fadeNearCamera': {
    sig: 'Sff', args: ['enabled', 'far', 'near'], md: `
    :tipshow[Makes a sprite fade to zero opacity as it approaches the camera.]

    The object will have 100% opacity at a distance of \`far\` from the camera, and 0% opacity at a distance of \`near\`.

    :::details{summary="Video by Dai"}
    ~~~anm
    :ref{r=anm:fadeNearCamera}(1, 600.0, 400.0);
    ~~~

    ::streamable[fw4vz3]
    :::
  `},
});
