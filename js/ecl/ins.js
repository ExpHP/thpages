
export const GROUPS_V8 = [
  {
    min: 0,
    max: 299,
    title: "System",
  },
  {
    min: 300,
    max: 499,
    title: "General",
  },
  {
    min: 500,
    max: 599,
    title: "Child management",
  },
  {
    min: 600,
    max: 699,
    title: 'Drawing',
  },
];

export const INS_17 = {
  641: {
    number: 641,
    game: 14,
    args: 'S',
    argnames: ['etId'],
    description: `Subtracts 1 from the index used by [ins=611,13] and [ins=612,13], unless it's already 0. This basically changes where the next transformation will be appended.`,
    documented: true,
  },

  712: {
    number: 712,
    game: 14,
    args: 'ff',
    argnames: ["w", "h"],
    description: "Cancels all bullets in rectangle of width %1 and height %2. The area is affected by rotation set by [ins=564,14].",
    documented: true,
  },
};

export const ARGTYPES = {
  "S": "int",
  "f": "float",
  "m": "string",
  "o": "label",
};
