// @ts-check
import globals from 'globals';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import eslintImportSort from 'eslint-plugin-simple-import-sort';

const __dirname = dirname(fileURLToPath(import.meta.url));

const config = tseslint.config(
  eslint.configs.recommended,
  prettierConfig,
  eslintPluginPrettierRecommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: __dirname,
      },
      globals: {
        ...globals.es2021,
        ...globals.node,
      },
    },
    plugins: {
      unicorn: eslintPluginUnicorn,
      'simple-import-sort': eslintImportSort,
    },
    rules: {
      'simple-import-sort/imports': 'warn',
      'simple-import-sort/exports': 'warn',
      'linebreak-style': ['error', 'unix'],
      semi: ['error', 'always'],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/default-param-last': 'error',
      '@typescript-eslint/no-mixed-enums': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/no-unsafe-declaration-merging': 'error',
      '@typescript-eslint/no-unsafe-enum-comparison': 'error',
      '@typescript-eslint/no-unnecessary-template-expression': 'error',
      '@typescript-eslint/no-use-before-define': 'error',
      '@typescript-eslint/no-useless-empty-export': 'error',
      '@typescript-eslint/prefer-as-const': 'warn',
      '@typescript-eslint/prefer-enum-initializers': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/prefer-regexp-exec': 'error',
      '@typescript-eslint/prefer-string-starts-ends-with': 'error',
      '@typescript-eslint/prefer-ts-expect-error': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/only-throw-error': 'error',
      'require-await': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'no-duplicate-imports': 'error',
      'no-self-compare': 'error',
      camelcase: ['off'],
      curly: ['error', 'all'],
      eqeqeq: 'error',
      'func-names': ['error', 'always'],
      'max-depth': ['error', 4],
      'no-redeclare': 'error',
      'max-lines': ['error', 1000],
      'max-lines-per-function': ['error', 100],
      'max-params': ['error', 4],
      'max-nested-callbacks': ['error', 4],
      'no-console': 'error',
      'no-alert': 'error',
      'no-unneeded-ternary': 'error',
      'no-unreachable': 'error',
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/array-type': [
        'error',
        { default: 'array-simple', readonly: 'array-simple' },
      ],
      'unicorn/catch-error-name': [
        'error',
        {
          name: '_error',
          ignore: ['_?error'],
        },
      ],
      'unicorn/better-regex': ['warn'],
      'unicorn/throw-new-error': ['error'],
      'unicorn/switch-case-braces': ['error', 'always'],
      'unicorn/require-number-to-fixed-digits-argument': ['error'],
      'unicorn/require-array-join-separator': ['error'],
      'unicorn/prevent-abbreviations': ['off'],
      'unicorn/prefer-string-trim-start-end': ['error'],
      'unicorn/prefer-string-starts-ends-with': ['error'],
      'unicorn/no-abusive-eslint-disable': ['error'],
      'unicorn/no-array-for-each': ['error'],
      'unicorn/no-array-push-push': ['error'],
      'unicorn/no-null': 'error',
      'unicorn/no-empty-file': ['error'],
      'unicorn/no-for-loop': ['error'],
      'unicorn/no-useless-length-check': ['error'],
      'unicorn/no-useless-switch-case': ['error'],
      'unicorn/no-useless-undefined': ['error'],
      'unicorn/prefer-array-find': ['error'],
      '@typescript-eslint/no-magic-numbers': 'error',
      'unicorn/prefer-array-index-of': ['error'],
      'unicorn/prefer-array-some': ['error'],
      'unicorn/prefer-at': ['error'],
      'unicorn/prefer-includes': ['error'],
      'unicorn/prefer-modern-math-apis': ['error'],
      'unicorn/prefer-negative-index': ['error'],
      'unicorn/consistent-function-scoping': 'error',
      'unicorn/prefer-string-replace-all': ['error'],
      'unicorn/prefer-string-slice': ['error'],
      'unicorn/no-instanceof-array': ['error'],
      '@typescript-eslint/naming-convention': ['off'],
      'unicorn/prefer-node-protocol': 'error',
      'unicorn/filename-case': ['error', { case: 'kebabCase' }],
      'unicorn/no-array-callback-reference': 'error',
      'unicorn/explicit-length-check': ['error'],
      'no-restricted-imports': [
        'error',
        {
          patterns: ['.*', '../'],
        },
      ],
      quotes: ['error', 'single', { avoidEscape: true }],
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
  },
  {
    ignores: [
      'node_modules/',
      'build/',
      '.vscode/',
      '.husky/',
      '.git/',
      'dist/',
      '*.js',
      '*.cjs',
      '*.mjs',
    ],
  }
);

export default config;
