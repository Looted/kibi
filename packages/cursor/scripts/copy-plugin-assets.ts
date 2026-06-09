import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const distRoot = path.join(packageRoot, "dist");
const pluginAssets = [
  ".cursor-plugin",
  "hooks",
  "skills",
  "rules",
  "commands",
  "mcp.json",
];

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

await fs.promises.mkdir(distRoot, { recursive: true });

for (const assetName of pluginAssets) {
  const source = path.join(packageRoot, assetName);
  const target = path.join(distRoot, assetName);
  await fs.promises.rm(target, { recursive: true, force: true });

  try {
    const sourceStats = await fs.promises.stat(source);
    if (sourceStats.isDirectory()) {
      await fs.promises.cp(source, target, { recursive: true });
    } else {
      await fs.promises.cp(source, target);
    }
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      continue;
    }

    throw error;
  }
}
