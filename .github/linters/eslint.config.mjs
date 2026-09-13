/**
 * Configuracao do ESLint (flat config) usada pelo Super-Linter na
 * etapa de qualidade da pipeline. O Super-Linter procura este arquivo
 * em `.github/linters/` por padrao.
 */

export default [
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        document: 'readonly',
        process: 'readonly',
        window: 'readonly',
      },
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],
    },
  },
];
