// Base eslint configuration for the monorepo
export const baseIgnores = {
  ignores: [
    "**/node_modules/**",
    "**/dist/**",
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/*.cjs",
  ],
};

export default [baseIgnores];
