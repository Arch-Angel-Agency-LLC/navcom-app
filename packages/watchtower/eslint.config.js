// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "coverage/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Console logging is this project's only visibility mechanism --
      // no web server, no UI, no persistence (see board.ts's own
      // docstring) -- so it's deliberate and pervasive, not something to
      // warn on by default. Call sites that DO want to flag an
      // intentional exception already carry
      // `// eslint-disable-next-line no-console` comments from before
      // this config existed; harmless now that the rule is off, but
      // left in place rather than stripped, since they still document
      // "this line logs on purpose."
      "no-console": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
);
