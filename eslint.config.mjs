import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  {
    // React 19 compiler diagnostics were not part of the previous Next 15
    // lint baseline. Keep the security upgrade scoped; migrate these patterns
    // incrementally instead of turning existing behavior into release blockers.
    rules: {
      "react-hooks/error-boundaries": "off",
      "react-hooks/immutability": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
    },
  },
  globalIgnores([
    ".next/**",
    ".next-dev/**",
    "node_modules/**",
    "artifacts/**",
    ".webtest-results/**",
    "public/**",
    "_design-preview/**",
    ".superdesign/**",
    "wordpress-plugins/**",
  ]),
]);
