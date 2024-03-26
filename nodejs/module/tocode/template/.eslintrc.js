module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended'
  ],
  rules: {
    '@typescript-eslint/no-non-null-assertion': 'error',
    "@typescript-eslint/no-explicit-any": "off",
    '@typescript-eslint/ban-ts-comment': 'off',
    'no-useless-escape': 'off'
  },
  env: {
    node: true
  },
  ignorePatterns: ['.eslintrc.js', "/src/*/*.js"],
}
