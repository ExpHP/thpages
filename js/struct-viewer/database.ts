import {Game} from '~/js/tables/game';

/** Format of a struct that has just been read from the database. */
export type Struct = {
  name: TypeName,
  rows: StructRow[],
  size: number,
};

export type StructRow = {
  offset: number,
  size: number,
  data: StructRowData,
};

export type StructRowData =
  | {type: 'gap'}
  | {type: 'field'} & StructField
  ;

export type StructField = {
  name: FieldName;
  ctype: CTypeString;
};

export type TypeName = string & { readonly __tag: unique symbol };
export type FieldName = string & { readonly __tag: unique symbol };
export type CTypeString = string & { readonly __tag: unique symbol };

function structFromData(structName: string, data: [number, string, string | null][]): Struct {
  const rows = [];
  for (let i = 0; i < data.length - 1; i++) {
    const [offset, name, type] = data[i];
    const [nextOffset] = data[i + 1];
    const size = nextOffset - offset;

    if (type) {
      rows.push({offset, size, data: {type: 'field', name: name as FieldName, ctype: type as CTypeString} as const});
    } else {
      rows.push({offset, size, data: {type: 'gap'} as const});
    }
  }
  const [size] = data[data.length - 1];
  return {rows, name: structName as TypeName, size};
}

class StructFieldDatabase {
  constructor() {

  }

  getGamesForStruct(struct: string): Game[] {
    throw new Error("TODO: getGamesForStruct");
  }
  getStructsForGame(game: Game): string[] {
    throw new Error("TODO: getStructsForGame");
  }
}


export const testStruct1 = structFromData('zAnmManager', [
  [0x0, "__thread", "struct zThread"],
  [0x1c, "__unknown", null],
  [0xd8, "useless_count", "int32_t"],
  [0xdc, "world_list_head", "struct zAnmVmList*"],
  [0xe0, "world_list_tail", "struct zAnmVmList*"],
  [0xe4, "ui_list_head", "struct zAnmVmList*"],
  [0xe8, "ui_list_tail", "struct zAnmVmList*"],
  [0xec, "fast_array", "struct zAnmFastVm[0x1fff]"],
  [0xc27ad8, "__lolk_next_snapshot_fast_id", "int32_t"],
  [0xc27adc, "__lolk_next_snapshot_discriminator", "int32_t"],
  [0xc27ae0, "__lolk_vm_snapshot_list_head", "struct zAnmVmList"],
  [0xc27af0, "__lolk_fast_snapshot_array", "struct zAnmFastVm[0x1fff]"],
  [0x184f4dc, "freelist_head", "struct zAnmFastVmList"],
  [0x184f4ec, "__unknown", null],
  [0x184f4f0, "preloaded", "struct zAnmPreloadedArray"],
  [0x184f56c, "__matrix_184f56c__used_during_rendering", "struct D3DMATRIX"],
  [0x184f5ac, "__vm_184f5ac", "struct zAnmVm"],
  [0x184fba8, "__unknown", null],
  [0x184fc18, "vertex_buffers", "struct zAnmVertexBuffers"],
  [0x1c6fc30, "layer_list_dummy_heads", "struct zAnmVm[0x2b]"],
  [0x1c7fd84, "last_discriminator__19bit", "int32_t"],
  [0x1c7fd88, "__unknown", null],
  [0x1c7fd90, "__exact_size_known", "struct zCOMMENT[0x0]"],
  [0x1c7fd90, "__end", null],
]);

export const testStruct2 = structFromData('zAnmManager', [
  [0x0, "__unknown", null],
  [0xd8, "__useless_count_of_render_loop_iterations", "int32_t"],
  [0xdc, "__anm_vm_dc", "struct zAnmVm"],
  [0x6dc, "world_list_head", "struct zAnmVmList*"],
  [0x6e0, "world_list_tail", "struct zAnmVmList*"],
  [0x6e4, "ui_list_head", "struct zAnmVmList*"],
  [0x6e8, "ui_list_tail", "struct zAnmVmList*"],
  [0x6ec, "fast_array", "struct zAnmFastVm[0x3fff]"],
  [0x18600d4, "__lolk_next_snapshot_fast_id", "int32_t"],
  [0x18600d8, "__lolk_next_snapshot_discriminator", "int32_t"],
  [0x18600dc, "__lolk_vm_snapshot_list_head", "struct zAnmVmList"],
  [0x18600ec, "freelist_head", "struct zAnmFastVmList"],
  [0x18600fc, "__unknown", null],
  [0x1860100, "preloaded", "struct zAnmPreloadedArray"],
  [0x186017c, "__matrix_186017c", "struct D3DMATRIX"],
  [0x18601bc, "__vm_18601bc", "struct zAnmVm"],
  [0x18607bc, "__unknown", null],
  [0x186082c, "vertex_buffers", "struct zAnmVertexBuffers"],
  [0x1c80844, "layer_list_dummy_heads__unused_as_of_1.00b", "struct zAnmVm[0x2b]"],
  [0x1c90a44, "last_discriminator__18bit", "int32_t"],
  [0x1c90a48, "__color__1c90a48", "struct D3DCOLOR"],
  [0x1c90a4c, "__unknown", null],
  [0x1c90a50, "__exact_size_known", "struct zCOMMENT[0x0]"],
  [0x1c90a50, "__end", null],
]);
