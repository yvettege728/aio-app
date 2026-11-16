// expo-splash-screen only supports a centered, square logo. aio's splash is a
// full-screen picture (gradient + mark + tagline), so after every other mod has
// run we swap in the full image and pin it to all four edges with aspect-fill.
// src/brand/BrandSplash.tsx draws the same image the same way, so the hand-off
// from native splash to the JS splash is invisible.
const fs = require("fs");
const path = require("path");
const { withFinalizedMod } = require("expo/config-plugins");

module.exports = function withFullBleedSplash(config, { image }) {
  return withFinalizedMod(config, [
    "ios",
    async (cfg) => {
      const root = cfg.modRequest.projectRoot;
      const iosRoot = cfg.modRequest.platformProjectRoot;
      const name = cfg.modRequest.projectName;
      const src = path.resolve(root, image);

      const set = path.join(iosRoot, name, "Images.xcassets", "SplashScreenLogo.imageset");
      if (fs.existsSync(set)) {
        for (const file of ["image.png", "image@2x.png", "image@3x.png"]) {
          fs.copyFileSync(src, path.join(set, file));
        }
      }

      const board = path.join(iosRoot, name, "SplashScreen.storyboard");
      if (fs.existsSync(board)) {
        let xml = fs.readFileSync(board, "utf8");
        xml = xml.replace(/(id="EXPO-SplashScreen"[^>]*?)contentMode="scaleAspectFit"/, '$1contentMode="scaleAspectFill"');
        xml = xml.replace(/\s*<constraint firstItem="EXPO-SplashScreen"[^>]*\/>/g, "");
        const pin = ["leading", "trailing", "top", "bottom"]
          .map((edge) => `\n                            <constraint firstItem="EXPO-SplashScreen" firstAttribute="${edge}" secondItem="EXPO-ContainerView" secondAttribute="${edge}" id="aio-splash-${edge}"/>`)
          .join("");
        xml = xml.replace(/<constraints>/, `<constraints>${pin}`);
        fs.writeFileSync(board, xml);
      }
      return cfg;
    },
  ]);
};
