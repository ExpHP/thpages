import * as JP from './jsonParse';

test("output type is correctly deduced", () => {
  const parser = JP.object({
    version: JP.number,
    sillyFeature: JP.optional(JP.string),
    things: JP.array(JP.object({
      mapped: JP.number.then((x) => [x, 2 * x] as [number, number]),
      triple: JP.tuple([JP.number, JP.number, JP.array(JP.number)]),
    })),
    variant: JP.tagged('type', {
      'doubled': JP.object({x: JP.number.then((x) => 2*x)}),
      'tripled': JP.object({x: JP.number.then((x) => 3*x)}),
    }),
  });

  type Output = {
    version: number,
    sillyFeature?: string,
    things: {
      mapped: [number, number];
      triple: [number, number, number[]];
    }[];
    variant: {x: number};
  };
  const value: Output = parser.parse(JSON.parse(JSON.stringify({
    version: 1,
    things: [{mapped: 3, triple: [1, 2, [3]]}],
    variant: {type: 'doubled', x: 2},
  })));

  // only purpose of this was to check for type errors.
  expect(value).toBeTruthy();
});

describe('tuple length warning', () => {
  const spy = jest.spyOn(console, 'warn');
  beforeEach(() => spy.mockReset());
  afterAll(() => spy.mockRestore());

  test('warning is generated exactly once', () => {
    const parser = JP.tuple([JP.int, JP.int]);
    expect(console.warn).toHaveBeenCalledTimes(0);

    parser.parse([1, 2, 3]);
    expect(console.warn).toHaveBeenCalledTimes(1);

    parser.parse([1, 2, 3]);
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  test('warning isn\'t generated if parsing fails for other reasons', () => {
    const parser = JP.tuple([JP.string, JP.string]);
    expect(console.warn).not.toHaveBeenCalled();

    expect(() => parser.parse([1, 2, 3])).toThrow(JP.JsonError);
    expect(console.warn).not.toHaveBeenCalled();
  })
});

describe('recursive parser', () => {
  test('it works', () => {
    type BinaryTree = null | [BinaryTree, BinaryTree];
    const binaryTree: JP.Parser<BinaryTree> = JP.lazy(() => (
      JP.or(
        JP.null_,
        JP.tuple([binaryTree, binaryTree]),
        JP.fail("expected binary tree of lists"),
      )
    ));

    const goodBinaryTree = [null, [[[null, null], [null, null]], null]];
    const badBinaryTree1 = [null];
    const badBinaryTree2 = [null, [[[null], [null, null]], null]];
    expect(binaryTree.parse(goodBinaryTree)).toEqual(goodBinaryTree);
    expect(() => binaryTree.parse(badBinaryTree1)).toThrow(JP.JsonError);
    expect(() => binaryTree.parse(badBinaryTree2)).toThrow(JP.JsonError);
  });

  test('mutual recursion works', () => {
    type Tree = null | Node;
    type Node = Tree[];

    const node: JP.Parser<Node> = JP.lazy(() => JP.array(tree));
    const tree: JP.Parser<Tree> = JP.lazy(() => JP.or(JP.null_, node, JP.fail("expected tree")));

    const goodTree = [null, [[null, null, [null, null]], null]];
    const badTree = [null, [[null, null, [1, null]], null]];
    expect(tree.parse(goodTree)).toEqual(goodTree);
    expect(node.parse(goodTree)).toEqual(goodTree);
    expect(() => tree.parse(badTree)).toThrow(JP.JsonError);
  });

  test('it is safe to call .then at recursion sites', () => {
    const doubleChain: JP.Parser<number> = JP.lazy(() => (
      JP.tagged("type", {
        leaf: JP.object(({x: JP.number})),
        // this is the .then() call that we are testing
        double: JP.object(({x: doubleChain.then((x) => 2*x)})),
      }).then(({x}) => x)  // and this one is to encourage chaos
    ));

    const value = doubleChain.parse({type: "double", x: {type: "double", x: {type: "leaf", x: 10}}});
    expect(value).toBe(40);
  });
});
