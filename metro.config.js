const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname, {
  includeWebReplay: false,
});

// Payment credentials are server-only files, never Metro modules or watch inputs.
config.resolver.blockList = [
  ...config.resolver.blockList,
  /(?:^|[\\/])\.env\.midtrans(?:\.[^\\/]*)?$/,
];

module.exports = config;
