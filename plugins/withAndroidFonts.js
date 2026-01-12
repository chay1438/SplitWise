const { withAndroid, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withAndroidFonts = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const sourceDir = path.join(
        config.modRequest.projectRoot,
        'node_modules/react-native-vector-icons/Fonts'
      );
      const targetDir = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/assets/fonts'
      );

      // Ensure target directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Copy Ionicons.ttf
      const fontName = 'Ionicons.ttf';
      const sourceFile = path.join(sourceDir, fontName);
      const targetFile = path.join(targetDir, fontName);

      if (fs.existsSync(sourceFile)) {
        fs.copyFileSync(sourceFile, targetFile);
      } else {
        console.warn(`Warning: Could not find ${fontName} in node_modules`);
      }

      return config;
    },
  ]);
};

module.exports = withAndroidFonts;
