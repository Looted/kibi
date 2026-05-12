/**
 * Build script for the Kibi TUI entry point.
 *
 * Compiles src/tui.tsx → dist/tui.js using Bun's built-in bundler
 * with JSX support via the @opentui/solid pragma.
 */
import { build } from "bun";

const result = await build({
  entrypoints: ["src/tui.tsx"],
  outdir: "dist",
  naming: "[name].js",
  target: "bun",
  format: "esm",
  jsx: {
    runtime: "automatic",
    importSource: "@opentui/solid",
  },
  minify: false,
  sourcemap: "none",
  external: ["@opencode-ai/*", "@opentui/*", "kibi-cli"],
});

if (!result.success) {
  console.error("[build-tui] TUI build failed:");
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

console.log("[build-tui] dist/tui.js written");
