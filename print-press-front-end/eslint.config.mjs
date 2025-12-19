import nextEslint from 'eslint-config-next';
import prettier from 'eslint-config-prettier';

/** @type {import('eslint').Linter.FlatConfig[]} */
const eslintConfig = [
  ...(Array.isArray(nextEslint) ? nextEslint : [nextEslint]),
  ...(Array.isArray(prettier) ? prettier : [prettier]),
  {
    // Custom rules or overrides can go here
    rules: {
      'react/display-name': 'off',
      '@next/next/no-page-custom-font': 'off',
    },
  },
];

export default eslintConfig;
