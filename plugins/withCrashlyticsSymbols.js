const { withXcodeProject } = require('@expo/config-plugins');

// iOS: upload the app's dSYM files to Firebase Crashlytics after each build so
// native crash reports show function names and lines instead of raw addresses.
// @react-native-firebase/crashlytics adds the Android side (the Crashlytics
// Gradle plugin uploads the R8 mapping file) but leaves this build phase to
// the app. Inputs follow Firebase's "Upload dSYMs" setup guide.
const PHASE_NAME = 'Upload Crashlytics symbols';

module.exports = function withCrashlyticsSymbols(config) {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const phases = project.hash.project.objects.PBXShellScriptBuildPhase || {};
    const exists = Object.values(phases).some(
      (phase) => phase && typeof phase === 'object' && phase.name === `"${PHASE_NAME}"`
    );

    if (!exists) {
      project.addBuildPhase(
        [],
        'PBXShellScriptBuildPhase',
        PHASE_NAME,
        project.getFirstTarget().uuid,
        {
          shellPath: '/bin/sh',
          shellScript: '"${PODS_ROOT}/FirebaseCrashlytics/run"',
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
