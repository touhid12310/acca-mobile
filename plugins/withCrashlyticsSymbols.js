const fs = require('fs');
const path = require('path');
const { withDangerousMod, withXcodeProject } = require('@expo/config-plugins');

// iOS: upload the app's dSYM files to Firebase Crashlytics after each build so
// native crash reports show function names and lines instead of raw addresses.
// @react-native-firebase/crashlytics adds the Android side (the Crashlytics
// Gradle plugin uploads the R8 mapping file) but leaves this build phase to
// the app. Inputs follow Firebase's "Upload dSYMs" setup guide.
const PHASE_NAME = 'Upload Crashlytics symbols';

// RNFirebase links the Firebase SDK through Swift Package Manager by default,
// so there is usually no Pods/FirebaseCrashlytics. Try the CocoaPods path, then
// the SPM checkout, and only warn when neither exists or the upload fails — a
// missing symbol upload must never fail the build. Kept on one line: the xcode
// lib only escapes double quotes when it writes the pbxproj string.
const SHELL_SCRIPT = [
  'SPM_RUN="${BUILD_DIR%/Build/*}/SourcePackages/checkouts/firebase-ios-sdk/Crashlytics/run";',
  'if [ -x "${PODS_ROOT}/FirebaseCrashlytics/run" ]; then "${PODS_ROOT}/FirebaseCrashlytics/run" || echo "warning: Crashlytics dSYM upload failed";',
  'elif [ -f "$SPM_RUN" ]; then /bin/sh "$SPM_RUN" || echo "warning: Crashlytics dSYM upload failed";',
  'else echo "warning: Crashlytics run script not found, skipping dSYM upload"; fi',
].join(' ');

// RNFirebase's own "[RNFB] Crashlytics Configuration" phase (autolinked from
// its react-native.config.js) runs upload-symbols with
// -gsp "${PROJECT_DIR}/GoogleService-Info.plist" when Firebase comes through
// SPM, and `set -e` makes a missing file fail the archive. Expo copies the
// plist into ios/<ProjectName>/, so also put a copy in ios/ itself.
const withPlistAtProjectDir = (config) =>
  withDangerousMod(config, [
    'ios',
    async (config) => {
      const source = config.ios?.googleServicesFile;
      if (source) {
        fs.copyFileSync(
          path.resolve(config.modRequest.projectRoot, source),
          path.join(config.modRequest.platformProjectRoot, 'GoogleService-Info.plist')
        );
      }
      return config;
    },
  ]);

module.exports = function withCrashlyticsSymbols(config) {
  config = withPlistAtProjectDir(config);
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const phases = project.hash.project.objects.PBXShellScriptBuildPhase || {};
    const existing = Object.values(phases).find(
      (phase) => phase && typeof phase === 'object' && phase.name === `"${PHASE_NAME}"`
    );

    if (existing) {
      // An earlier prebuild may have written the old Pods-only script.
      existing.shellScript = `"${SHELL_SCRIPT.replace(/"/g, '\\"')}"`;
    } else {
      project.addBuildPhase(
        [],
        'PBXShellScriptBuildPhase',
        PHASE_NAME,
        project.getFirstTarget().uuid,
        {
          shellPath: '/bin/sh',
          shellScript: SHELL_SCRIPT,
          inputPaths: [
            '"${DWARF_DSYM_FOLDER_PATH}/${DWARF_DSYM_FILE_NAME}"',
            '"${DWARF_DSYM_FOLDER_PATH}/${DWARF_DSYM_FILE_NAME}/Contents/Resources/DWARF/${PRODUCT_NAME}"',
            '"${DWARF_DSYM_FOLDER_PATH}/${DWARF_DSYM_FILE_NAME}/Contents/Info.plist"',
            '"$(TARGET_BUILD_DIR)/$(UNLOCALIZED_RESOURCES_FOLDER_PATH)/GoogleService-Info.plist"',
            '"$(TARGET_BUILD_DIR)/$(EXECUTABLE_PATH)"',
          ],
        }
      );
    }

    return config;
  });
};
