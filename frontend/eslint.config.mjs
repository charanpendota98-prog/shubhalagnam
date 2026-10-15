// Flat ESLint config (ESLint 9+ requires this format; Next 16 removed `next lint`).
import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts", "node_modules/**"],
  },
  {
    // This React 18 application does not enable the React Compiler. The compiler
    // diagnostic `set-state-in-effect` flags necessary SSR-safe browser-state
    // hydration and ordinary async data-loading effects as performance smells.
    // Keep the compiler-specific check out of the routine lint gate, while
    // retaining the Rules of Hooks, exhaustive-deps, and the other compiler
    // diagnostics below. Avoid moving hydration into render or deferring updates
    // just to satisfy a static rule; those would introduce worse behavior.
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/static-components": "warn",
    },
  },
];

export default eslintConfig;
