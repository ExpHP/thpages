import groupBy from './group-by';

describe('groupBy', () => {
  it('produces no groups for an empty array', () => {
    const groups = [...groupBy([], () => null)];
    expect(groups).toEqual([]);
  });

  it('can produce a group if the key never changes', () => {
    const groups = [...groupBy([1, 2, 3], () => null)];
    expect(groups).toEqual([{key: null, values: [1, 2, 3]}]);
  });

  it('can produce multiple groups', () => {
    const groups = [...groupBy([5, 5, 1, 1], (x) => x)];
    expect(groups).toEqual([{key: 5, values: [5, 5]}, {key: 1, values: [1, 1]}]);
  });

  it('only groups consecutive items', () => {
    const groups = [...groupBy([5, 5, 1, 1, 5], (x) => x)];
    expect(groups).toEqual([{key: 5, values: [5, 5]}, {key: 1, values: [1, 1]}, {key: 5, values: [5]}]);
  });

  it('supports groupBy.any', () => {
    const groups = [...groupBy([groupBy.any, 5, groupBy.any, 5, groupBy.any, 1, groupBy.any], (x) => x)];
    expect(groups).toEqual([
      {key: 5, values: [groupBy.any, 5, groupBy.any, 5, groupBy.any]},
      {key: 1, values: [1, groupBy.any]},
    ]);
  });

  it('can produce a group even if all keys are any', () => {
    const groups = [...groupBy([1, 2, 3], () => groupBy.any)];
    expect(groups).toEqual([{key: groupBy.any, values: [1, 2, 3]}]);
  });
});
