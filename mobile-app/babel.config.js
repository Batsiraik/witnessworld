module.exports = function (api) {
  api.cache(true);
  return {
    // Absolute path so Metro/Babel always resolve from this app folder (avoids "Cannot find module 'babel-preset-expo'").
    presets: [require.resolve('babel-preset-expo')],
    plugins: ['react-native-reanimated/plugin'],
  };
};
