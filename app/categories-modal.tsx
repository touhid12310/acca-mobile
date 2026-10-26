import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Portal } from 'react-native-paper';

import { useTheme } from '../src/contexts/ThemeContext';
import CategoriesScreen from './categories';

/**
 * The Categories screen presented as a sheet, for opening it from inside the
 * transaction sheet: on iOS a normal push lands underneath the sheet, out of
 * sight. Portal.Host keeps the screen's react-native-paper dialogs inside
 * this sheet, and the dark theme's transparent background gets a solid
 * surface because nothing is drawn behind an iOS sheet.
 */
export default function CategoriesModalScreen() {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.container,
        Platform.OS === 'ios' && isDark ? { backgroundColor: colors.surface } : null,
      ]}
    >
      <Portal.Host>
        <CategoriesScreen />
      </Portal.Host>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
