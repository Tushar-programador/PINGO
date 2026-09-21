module.exports = {
  preset: 'jest-expo',
  // Source files use NodeNext-style relative imports with explicit `.js`
  // extensions (per tsconfig.base.json `moduleResolution: "NodeNext"`), but
  // the actual files are `.ts`. Jest's resolver doesn't rewrite `.js` -> `.ts`
  // on its own, so map it here.
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
