const { withAndroidManifest } = require('@expo/config-plugins');

// Android turns some settings into hardware the app *requires*: a portrait-only
// orientation implies android.hardware.screen.portrait, READ_SMS implies
// telephony, Wi-Fi state permissions imply wifi, CAMERA and RECORD_AUDIO imply
// a camera and a microphone. Google Play then hides the app from devices
// without them (tablets, Chromebooks, Wi-Fi-only devices, Android XR) and its
// pre-review check blocks the release ("Required hardware feature declarations
// are restricting your app's availability", 1.9.7).
//
// None of them is essential: SMS import, the camera and voice input are
// optional features that already check for permission at runtime. Declare
// each one with android:required="false"; tools:replace makes that win over a
// library manifest that declares the same feature as required.
const OPTIONAL_FEATURES = [
  'android.hardware.screen.portrait',
  'android.hardware.telephony',
  'android.hardware.wifi',
  'android.hardware.camera',
  'android.hardware.camera.autofocus',
  'android.hardware.microphone',
];

module.exports = function withOptionalHardwareFeatures(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    manifest.$ = manifest.$ || {};
    manifest.$['xmlns:tools'] =
      manifest.$['xmlns:tools'] || 'http://schemas.android.com/tools';

    const features = (manifest['uses-feature'] || []).filter(
      (feature) => !OPTIONAL_FEATURES.includes(feature.$ && feature.$['android:name'])
    );
    for (const name of OPTIONAL_FEATURES) {
      features.push({
        $: {
          'android:name': name,
          'android:required': 'false',
          'tools:replace': 'android:required',
        },
      });
    }
    manifest['uses-feature'] = features;

    return config;
  });
};
