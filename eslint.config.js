import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'

// Flat ESLint config. Previously the repo had NO lint configuration at all,
// despite five `eslint-disable-next-line react-hooks/exhaustive-deps` comments
// in the source — i.e. the code was written against a linter that was never
// installed, so those load-bearing suppressions were never verified by anything.
//
// Severity policy: things that are outright bugs are errors; the large
// pre-existing a11y/React backlog is surfaced as warnings so `npm run lint`
// exits 0 today and CI stays green while the backlog is burned down. Flip
// `--max-warnings=0` on once warnings reach zero.
export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'public/**', 'coverage/**'],
  },

  js.configs.recommended,

  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: '18.2' },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,

      // React 17+ JSX transform — no React import needed in scope.
      'react/react-in-jsx-scope': 'off',
      // No type layer in this project; prop validation is handled by JSDoc
      // typedefs in jsconfig.json instead.
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'warn',
      'react/display-name': 'warn',

      // Correctness — these stay errors.
      'react-hooks/rules-of-hooks': 'error',
      'no-undef': 'error',
      'no-dupe-keys': 'error',
      'no-unreachable': 'error',
      'no-unsafe-negation': 'error',
      'no-self-assign': 'error',
      'no-constant-condition': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],

      // Pre-existing backlog — visible but non-blocking.
      'react-hooks/exhaustive-deps': 'warn',
      'react/no-unknown-property': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-noninteractive-element-interactions': 'warn',
      'jsx-a11y/label-has-associated-control': 'warn',
      'jsx-a11y/aria-props': 'warn',
      'jsx-a11y/role-has-required-aria-props': 'warn',
      'jsx-a11y/media-has-caption': 'off',
      // `autoFocus` is intentional on modal/drawer first fields and is the
      // recommended way to move focus into a dialog; the rule's blanket
      // objection does not apply to these deliberate uses.
      'jsx-a11y/no-autofocus': 'warn',

      // React Compiler advisories from eslint-plugin-react-hooks. These flag
      // patterns that block auto-memoisation — legitimate cleanup targets, not
      // bugs — and there are ~57 pre-existing instances. Kept as warnings so
      // they stay visible without failing CI on day one.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
    },
  },

  // Test files: vitest globals.
  {
    files: ['**/*.test.{js,jsx}', 'src/test/**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.vitest,
      },
    },
    rules: {
      // Test harnesses legitimately capture the value returned by a context hook
      // so assertions can drive it (e.g. `ctx = useCart()` inside a consumer that
      // is rendered by the test). That is a reassignment during render, which this
      // React-Compiler rule flags — but it is confined to tests, which are not
      // subject to the compiler, and the alternative (renderHook + result.current)
      // is not always available when the assertion needs the rendered DOM too.
      // Kept as an error everywhere else, where it genuinely matters.
      'react-hooks/globals': 'off',
    },
  },

  // Config files run in Node.
  {
    files: ['*.config.js', 'postcss.config.js', 'tailwind.config.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
]
