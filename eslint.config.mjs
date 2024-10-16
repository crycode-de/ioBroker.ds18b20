import tseslint from 'typescript-eslint';

import crycode from '@crycode/eslint-config';

export default tseslint.config(
  ...crycode.configs.ts,
  ...crycode.configs.stylistic,

  {
    ignores: [
      '.dev-server/',
      'build/',
      'test/',
    ],
  },

  {
    files: [
      'src/**/*',
    ],

    languageOptions: {
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: [
          './tsconfig.json',
        ],
      },
    },

    rules: {
      '@typescript-eslint/unified-signatures': 'off',
    },

  },
);
