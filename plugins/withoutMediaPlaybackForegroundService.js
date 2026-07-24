const { withAndroidManifest } = require('@expo/config-plugins');

// expo-audio ships an Android manifest that always declares the
// FOREGROUND_SERVICE_MEDIA_PLAYBACK permission and an AudioControlsService
// (a `mediaPlayback` foreground service used for background audio + media-session
// controls). AccountE only uses expo-audio for voice recording and short in-app
// (foreground) playback in the chat feature — it never plays audio in the
// background — so this foreground service is unnecessary.
//
// Leaving it in forces Google Play's "Foreground service permissions" declaration,
// which requires a demonstration video of background media playback the app
// doesn't actually do. We strip both the permission and the service from the
// merged manifest via `tools:node="remove"` so the declaration no longer applies.
const MEDIA_PLAYBACK_PERMISSION =
  'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK';
const AUDIO_CONTROLS_SERVICE = 'expo.modules.audio.service.AudioControlsService';

module.exports = function withoutMediaPlaybackForegroundService(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    // The manifest merger only honours tools:node="remove" when the tools
    // namespace is declared on the root <manifest> element.
    manifest.$ = manifest.$ || {};
    manifest.$['xmlns:tools'] =
      manifest.$['xmlns:tools'] || 'http://schemas.android.com/tools';

    // 1. Remove the media-playback foreground-service permission.
    manifest['uses-permission'] = (manifest['uses-permission'] || []).filter(
      (perm) => perm.$ && perm.$['android:name'] !== MEDIA_PLAYBACK_PERMISSION
    );
    manifest['uses-permission'].push({
      $: { 'android:name': MEDIA_PLAYBACK_PERMISSION, 'tools:node': 'remove' },
    });

    // 2. Remove expo-audio's mediaPlayback foreground service.
    const application = manifest.application && manifest.application[0];
    if (application) {
      application.service = (application.service || []).filter(
        (svc) => svc.$ && svc.$['android:name'] !== AUDIO_CONTROLS_SERVICE
      );
      application.service.push({
        $: { 'android:name': AUDIO_CONTROLS_SERVICE, 'tools:node': 'remove' },
      });
    }

    return config;
  });
};
