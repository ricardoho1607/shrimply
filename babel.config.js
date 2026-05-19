module.exports = function (api) {
  api.cache(true);
  const plugins = ['babel-plugin-transform-import-meta'];

  if (process.env.NODE_ENV === 'production') {
    plugins.push('transform-remove-console');
  }

  plugins.push('react-native-reanimated/plugin');

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
