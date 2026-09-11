// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { files: ['**/*.cjs'], languageOptions: { sourceType: 'commonjs', globals: { __dirname: 'readonly', __filename: 'readonly', module: 'readonly', require: 'readonly', exports: 'readonly' } } },
  {
    ignores: ['dist/*'],
  },
]);
