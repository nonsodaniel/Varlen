const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Faster startup via deferred module evaluation (lazy requires)
config.transformer.inlineRequires = true;

// Enable minification in production
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

// Optimise asset handling
config.resolver.assetExts = [
  ...config.resolver.assetExts.filter((ext) => ext !== 'svg'),
  'svg',
];

module.exports = config;
