import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const bundles = [
  { source: "hook-runner.ts", name: "hook-runner.mjs" },
  { source: "signoff-display.ts", name: "signoff-display.mjs" },
] as const;
const checkOnly = process.argv.includes("--check");
const outputDirectory = checkOnly
  ? await fs.mkdtemp(path.join(os.tmpdir(), "kibi-claude-hook-bundle-"))
  : path.join(packageRoot, "bin");

try {
  await fs.mkdir(outputDirectory, { recursive: true });
  for (const bundle of bundles) {
    const bundlePath = path.join(packageRoot, "bin", bundle.name);
    const outputPath = path.join(outputDirectory, bundle.name);
    const result = await Bun.build({
      entrypoints: [path.join(packageRoot, "src", bundle.source)],
      outdir: outputDirectory,
      naming: bundle.name,
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

    if (checkOnly) {
      let expected: Buffer;
      try {
        expected = await fs.readFile(bundlePath);
      } catch {
        throw new Error(`Missing generated hook bundle: ${bundlePath}`);
      }
      const actual = await fs.readFile(outputPath);
      if (!expected.equals(actual)) {
        throw new Error(
          `bin/${bundle.name} is out of date; run \`bun run build:hook-bundle\``,
        );
      }
    }
  }
} finally {
  if (checkOnly) {
    await fs.rm(outputDirectory, { recursive: true, force: true });
  }
}
