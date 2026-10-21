// Metro 0.83+ uses Array#toReversed (Node 20+). Polyfill for older Node in dev shells.
if (!Array.prototype.toReversed) {
  // eslint-disable-next-line no-extend-native
  Array.prototype.toReversed = function toReversed() {
    return [...this].reverse();
  };
}

const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
  /node_modules\/vite\/.*/,
  /node_modules\/vitest\/.*/,
  /.*\.(test|spec)\.(ts|tsx|js|jsx)$/,
];

module.exports = config;
