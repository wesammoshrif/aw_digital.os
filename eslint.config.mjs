import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Deutsche Typo-Anführungszeichen („ ") und Apostrophe im JSX sind
      // gewollt und valide; diese Regel würde sie quer durch die App als
      // Fehler melden (i18n-Codebase) — daher aus.
      "react/no-unescaped-entities": "off",
      // React-Compiler-Regeln (eslint-plugin-react-hooks v6): schlagen auf
      // legitime SSR-Muster an (z.B. localStorage erst im Effect lesen, sonst
      // Hydration-Mismatch). Als Migrations-Hinweis behalten, aber nicht als
      // Fehler die Pipeline-Annotationen zumüllen.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
]);

export default eslintConfig;
