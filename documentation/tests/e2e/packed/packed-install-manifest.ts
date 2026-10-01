// implements REQ-kibi-operation-interface-parity
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, sep } from "node:path";
import type { Tarballs } from "./helpers.js";
import { hostSwiplPlatformPackage } from "./packed-packages.js";

/** Prepare owned install metadata for an atomic staging-to-cache rename.
 * Return an exact rollback for a publisher that loses the rename race. */
export function relocatePackedInstallMetadata(
  prefix: string,
  stagingTarballsRoot: string,
  publishedTarballsRoot: string,
): () => void {
  const originals = new Map<string, Buffer>();
  for (const name of [
    "package.json",
    "pnpm-workspace.yaml",
    "package-lock.json",
    "node_modules/.package-lock.json",
  ]) {
    const file = join(prefix, name);
    if (existsSync(file)) originals.set(file, readFileSync(file));
  }
  const restore = () => {
    for (const [file, content] of originals) writeFileSync(file, content);
  };
  const from = JSON.stringify(`file:${stagingTarballsRoot}${sep}`).slice(1, -1);
  const to = JSON.stringify(`file:${publishedTarballsRoot}${sep}`).slice(1, -1);
  try {
    for (const [file, content] of originals) {
      const text = content.toString("utf8");
      const relocated = text.replaceAll(from, to);
      if (relocated !== text) writeFileSync(file, relocated, "utf8");
    }
  } catch (error) {
    restore();
    throw error;
  }
  return restore;
}

export function writePackedInstallManifest(
  prefix: string,
  tarballs: Tarballs,
  options: { includeCompleteInventory?: boolean } = {},
): void {
  const packageFiles = {
    "kibi-core": `file:${tarballs.core}`,
    "kibi-agent-core": `file:${tarballs["agent-core"]}`,
    "kibi-cli": `file:${tarballs.cli}`,
    "kibi-runtime": `file:${tarballs.runtime}`,
    "kibi-mcp": `file:${tarballs.mcp}`,
    "kibi-opencode": `file:${tarballs.opencode}`,
    "kibi-codex": `file:${tarballs.codex}`,
    "kibi-cursor": `file:${tarballs.cursor}`,
    // Capability-plugin defaults required by kibi-cli; optional plugins stay
    // out unless a consumer explicitly needs the complete packed inventory.
    "kibi-plugin-sdk": `file:${tarballs["plugin-sdk"]}`,
    "kibi-plugin-builtin": `file:${tarballs["plugin-builtin"]}`,
    ...(options.includeCompleteInventory
      ? {
          "kibi-plugin-jev": `file:${tarballs["plugin-jev"]}`,
          "kibi-plugin-treesitter": `file:${tarballs["plugin-treesitter"]}`,
        }
      : {}),
    // kibi-cli and kibi-runtime depend on the resolver; its platform packages
    // are optional and absent from these local installs.
    "kibi-swipl": `file:${tarballs.swipl}`,
    // The host's bundled SWI-Prolog, when the tarball set carries one. Absent
    // for ci-pack sets, which use the system swipl.
    ...(tarballs.swiplPlatform
      ? { [hostSwiplPlatformPackage()]: `file:${tarballs.swiplPlatform}` }
      : {}),
  };
  const workspaceOverrides = [
    "overrides:",
    ...Object.entries(packageFiles).map(
      ([packageName, tarballPath]) =>
        `  ${packageName}: ${JSON.stringify(tarballPath)}`,
    ),
    "allowBuilds:",
    "  msgpackr-extract: true",
    "",
  ].join("\n");
  writeFileSync(
    join(prefix, "package.json"),
    JSON.stringify(
      {
        name: "kibi-packed-e2e",
        private: true,
        dependencies: packageFiles,
      },
      null,
      2,
    ),
    "utf8",
  );
  writeFileSync(
    join(prefix, "pnpm-workspace.yaml"),
    workspaceOverrides,
    "utf8",
  );
}
