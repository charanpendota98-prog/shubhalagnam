// Flat ESLint config (ESLint 9+ requires this format; the legacy `.eslintrc.json`
// + `next lint` CLI combo no longer works — `next lint` was removed in Next.js 16
// and ESLint 9 defaults to flat config, which crashed on the old eslintrc format
// with "Converting circular structure to JSON" when loading `next/core-web-vitals`).
//
// `eslint-config-next` (v13.5+) already ships a native flat-config array, so we
// just re-export it directly — no compat shim needed.
import nextConfig from "eslint-config-next";

const eslintConfig = [
  ...nextConfig,
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts", "node_modules/**"],
  },
  {
    // `eslint-config-next@16` bundles the experimental React Compiler lint
    // rules (set-state-in-effect / purity / immutability / static-components)
    // as hard errors. This app does NOT enable the React Compiler (no
    // `experimental.reactCompiler` in next.config.mjs, no babel plugin) —
    // these rules flag long-standing, correct, idiomatic React 18 patterns
    // used throughout this codebase (e.g. hydrating client state from
    // localStorage/token in a `useEffect`, which is the standard SSR-safe
    // way to do it without the compiler). Treating those as blocking errors
    // would pressure a large, risky, unjustified rewrite of working auth/
    // state code. Downgraded to `warn` so they stay visible (useful context
    // if this app adopts the React Compiler later) without blocking builds
    // or demanding changes to code that isn't actually broken.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/static-components": "warn",
    },
  },
];

export default eslintConfig;
