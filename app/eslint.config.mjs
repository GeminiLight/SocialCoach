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
    // Unmodified upstream Draco decoder; keep its Apache / MIT notices.
    "public/3d/draco/**",
    // Reproducible upstream PDF/OCR workers; sources remain in the package lock.
    "public/local-reading/**",
  ]),
]);

export default eslintConfig;
