import globals from 'globals'
import pluginJs from '@eslint/js'
import pluginReact from 'eslint-plugin-react'
import eslintConfigPrettier from 'eslint-config-prettier'
import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat()

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ['**/*.{js,mjs,cjs,jsx}'] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  pluginReact.configs.flat.recommended,
  ...compat.extends('eslint-config-standard'),
  eslintConfigPrettier,
  {
    rules: {
      'import/prefer-default-export': 0,
      'no-console': 'warn',
      'no-nested-ternary': 0,
      'no-underscore-dangle': 0,
      'no-unused-expressions': ['error', { allowTernary: true }],
      camelcase: 0,
      'react/self-closing-comp': 1,
      'react/jsx-filename-extension': [1, { extensions: ['.js', 'jsx'] }],
      'react/prop-types': 0,
      'react/destructuring-assignment': 0,
      'react/jsx-no-comment-textnodes': 0,
      'react/jsx-props-no-spreading': 0,
      'react/no-array-index-key': 0,
      'react/no-unescaped-entities': 0,
      'react/require-default-props': 0,
      'react/react-in-jsx-scope': 0,
      semi: ['error', 'never'],
    },
  },
]
