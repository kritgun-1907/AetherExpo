// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix for network timeout issues
config.resolver.assetExts.push('db');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];

// Increase transformer timeout
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

// Add resolver for better asset handling
config.resolver = {
  ...config.resolver,
  resolverMainFields: ['react-native', 'browser', 'main'],
};

module.exports = config;