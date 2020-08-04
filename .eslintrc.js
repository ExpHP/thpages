module.exports = {
  "extends": [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "google",
  ],
  "env": {
    "es6": true,
  },
  "parserOptions": {
    "sourceType": "module",
    "ecmaVersion": 8,
  },
  "plugins": ["import"],
  "globals": {
    // do NOT do env: browser: true, we do not want trash like "name"
    "document": true,
    "window": true,
    "setTimeout": true,
    "showdown": true,
    "hljs": true,
  },
  "rules": {
    "require-jsdoc": "off",
    "max-len": "off",
    "no-unused-vars": "warn",
    "quotes": "off", // bit harsh for an inherited codebase
    "operator-linebreak": ["error", "before"],
    // allow `let a, b;` but not `let a = 2, b = 3;`
    "one-var": ["error", {"initialized": "never"}],
  },
  "ignorePatterns": ["js/lib/*"],
};
