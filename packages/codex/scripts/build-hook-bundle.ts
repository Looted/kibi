import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const sourcePath = path.join(packageRoot, "src", "hook-runner.ts");
const bundleName = "hook-runner.mjs";
const bundlePath = path.join(packageRoot, "bin", bundleName);
const checkOnly = process.argv.includes("--check");
const outputDirectory = checkOnly
  ? await fs.mkdtemp(path.join(os.tmpdir(), "kibi-codex-hook-bundle-"))
  : path.dirname(bundlePath);
const outputPath = path.join(outputDirectory, bundleName);

try {
  await fs.mkdir(outputDirectory, { recursive: true });
  const result = await Bun.build({
    entrypoints: [sourcePath],
    outdir: outputDirectory,
    naming: bundleName,
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
        "bin/hook-runner.mjs is out of date; run `bun run build:hook-bundle`",
      );
    }
  }
} finally {
  if (checkOnly) {
    await fs.rm(outputDirectory, { recursive: true, force: true });
  }
}
