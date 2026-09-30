import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const outputDirectory = path.join(packageRoot, "dist");

await fs.mkdir(outputDirectory, { recursive: true });
const result = await Bun.build({
  entrypoints: [path.join(packageRoot, "src", "hook-runner.ts")],
  outdir: outputDirectory,
  naming: "hook-runner.js",
  target: "node",
  format: "esm",
  packages: "bundle",
  sourcemap: "none",
});

if (!result.success) {
  throw new Error(
    result.logs.map((log) => log.message).join("\n") || "Bun build failed",
  );
}
