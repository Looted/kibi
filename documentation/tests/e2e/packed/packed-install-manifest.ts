// implements REQ-kibi-operation-interface-parity
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Tarballs } from "./helpers.js";
import { hostSwiplPlatformPackage } from "./packed-packages.js";

export function writePackedInstallManifest(
  prefix: string,
  tarballs: Tarballs,
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
    // Capability-plugin defaults required by kibi-cli; Jev stays optional/out.
    "kibi-plugin-sdk": `file:${tarballs["plugin-sdk"]}`,
    "kibi-plugin-builtin": `file:${tarballs["plugin-builtin"]}`,
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
