const groupByAny: unique symbol = Symbol();
export type GroupByAny = typeof groupByAny;
export interface GroupByFn {
  <T, K>(array: T[], keyFn: (item: T) => K): IterableIterator<{key: K, values: T[]}>;
  // This overload technically shouldn't be necesssary (it's a subset of the other), but it makes TS happier.
  <T, K>(array: T[], keyFn: (item: T) => K | GroupByAny): IterableIterator<{key: K | GroupByAny, values: T[]}>;
  any: GroupByAny;
}

/**
 * Split an array into groups of consecutive values with matching keys, according to a key function.
 *
 * The key function is allowed to return a special value, `groupBy.any`, that is considered
 * to be compatible with any other key, allowing them to be transparent to the groupings.
 *
 * Notice that, if `groupBy.any` is used, it can also show up as a `key` in the output.
 * This will only happen in the case where every single item produced `groupBy.any`
 * (and there was at least one item).
 **/
const groupBy: GroupByFn = function* <T, K>(array: T[], keyFn: (item: T) => K | GroupByAny) {
  let groupKey: K | GroupByAny = groupBy.any;
  let groupValues: T[] = [];
  for (const x of array) {
    const newKey = keyFn(x);
    if (Object.is(newKey, groupKey) || newKey === groupBy.any || groupKey === groupBy.any) {
      if (groupKey === groupBy.any) {
        groupKey = newKey;
      }
      groupValues.push(x);
      continue;
    }

    yield {key: groupKey, values: groupValues};
    groupValues = [x];
    groupKey = newKey;
  }
  if (groupValues.length > 0) {
    yield {key: groupKey, values: groupValues};
  }
};
groupBy.any = groupByAny;

export default groupBy;
