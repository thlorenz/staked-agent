import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { FlatCompat } from "@eslint/eslintrc";
import { baseIgnores } from "../eslint.config.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  baseIgnores,
  {
    ignores: [
      "next-env.d.ts",
      "scripts/*.cjs",
    ],
  },
];

export default eslintConfig;
