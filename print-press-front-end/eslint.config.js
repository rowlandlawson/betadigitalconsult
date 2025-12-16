const nextEslint = require('eslint-config-next');
const prettier = require('eslint-config-prettier');

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  nextEslint,
  prettier,
  {
    // Custom rules or overrides can go here
    rules: {
        "react/display-name": "off",
    }
  }
];