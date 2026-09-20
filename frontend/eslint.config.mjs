import nextConfig from "eslint-config-next";

export default [
  ...nextConfig,
  {
    ignores: [".next/**", "node_modules/**", "public/**"],
    linterOptions: { reportUnusedDisableDirectives: "off" },
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
      "react-hooks/exhaustive-deps": "off",
      "@next/next/no-img-element": "off",
      "@next/next/no-location-assign-relative": "off",
      "@next/next/no-location-assign-relative-destination": "off",
      "@next/next/no-html-link-for-pages": "off",
      "import/no-anonymous-default-export": "off",
      "react/no-unescaped-entities": "off",
    },
  },
];
