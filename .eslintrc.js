// https://docs.expo.dev/guides/using-eslint/
// ESLint 8 (legacy config). Plugins are resolved from this folder, so the
// @typescript-eslint packages and eslint-import-resolver-typescript used by
// eslint-config-expo are direct devDependencies.
module.exports = {
  root: true,
  extends: 'expo',
  ignorePatterns: ['/dist/*', '/.expo/*', '/android/*', '/ios/*', 'expo-env.d.ts'],
  rules: {
    // React Compiler checks added in eslint-plugin-react-hooks v7. The app
    // doesn't run the React Compiler (no `experiments.reactCompiler` in
    // app.json), and the web app's react-hooks v5 has no such rules, so they
    // warn instead of failing the lint. Switch them back to 'error' before
    // enabling the compiler.
    'react-hooks/set-state-in-effect': 'warn',
    'react-hooks/refs': 'warn',
    'react-hooks/immutability': 'warn',
  },
};
