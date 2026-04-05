const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure web platform extensions are resolved first
config.resolver.sourceExts = [
  'web.tsx', 'web.ts', 'web.jsx', 'web.js',
  ...config.resolver.sourceExts,
];

// Alias react-native to react-native-web for web builds
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'react-native': path.resolve(__dirname, 'node_modules/react-native-web'),
};

module.exports = config;
