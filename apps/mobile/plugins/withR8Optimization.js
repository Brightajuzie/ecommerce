const { withAppBuildGradle } = require("expo/config-plugins");

// Expo's Android template points release builds at AGP's default
// "proguard-android.txt", which contains -dontoptimize: R8 shrinks and
// obfuscates but never optimizes (r8.json reported noOptimizationPercentage
// 100). Swap in "proguard-android-optimize.txt" so R8 also optimizes code.
// android/ is generated at build time (prebuild), so this has to be a config
// plugin rather than a direct edit of android/app/build.gradle.
const DEFAULT_RULES = 'getDefaultProguardFile("proguard-android.txt")';
const OPTIMIZE_RULES = 'getDefaultProguardFile("proguard-android-optimize.txt")';

module.exports = function withR8Optimization(config) {
  return withAppBuildGradle(config, (cfg) => {
    const gradle = cfg.modResults.contents;
    if (gradle.includes(OPTIMIZE_RULES)) return cfg;
    if (!gradle.includes(DEFAULT_RULES)) {
      // Fail loudly if a future Expo template changes this line, instead of
      // silently shipping without optimization.
      throw new Error(
        `withR8Optimization: expected ${DEFAULT_RULES} in android/app/build.gradle but did not find it.`,
      );
    }
    cfg.modResults.contents = gradle.replace(DEFAULT_RULES, OPTIMIZE_RULES);
    return cfg;
  });
};
