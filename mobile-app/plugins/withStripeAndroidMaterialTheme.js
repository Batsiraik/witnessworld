/**
 * Stripe React Native card UI expects a Material Components theme on Android.
 * Expo's default prebuild uses Theme.AppCompat — CardField can crash on mount without this.
 *
 * Runs at `expo prebuild`; commit this file (android/ is gitignored).
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withStripeAndroidMaterialTheme(config) {
  return withDangerousMod(config, [
    'android',
    async (cfg) => {
      const root = cfg.modRequest.platformProjectRoot;
      const stylesPath = path.join(root, 'app', 'src', 'main', 'res', 'values', 'styles.xml');
      if (fs.existsSync(stylesPath)) {
        let s = fs.readFileSync(stylesPath, 'utf8');
        if (s.includes('Theme.AppCompat.DayNight.NoActionBar')) {
          s = s.replace(
            /parent="Theme\.AppCompat\.DayNight\.NoActionBar"/g,
            'parent="Theme.MaterialComponents.DayNight.NoActionBar"'
          );
          fs.writeFileSync(stylesPath, s);
        }
      }
      const gradlePath = path.join(root, 'app', 'build.gradle');
      if (fs.existsSync(gradlePath)) {
        let g = fs.readFileSync(gradlePath, 'utf8');
        if (!g.includes('com.google.android.material:material')) {
          g = g.replace(
            /dependencies\s*\{\s*\n\s*\/\/ The version of react-native/,
            `dependencies {
    implementation 'com.google.android.material:material:1.12.0'
    // The version of react-native`
          );
          fs.writeFileSync(gradlePath, g);
        }
      }
      return cfg;
    },
  ]);
}
