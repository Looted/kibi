// implements REQ-kibi-operation-interface-parity
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Tarballs } from "./helpers.js";

export function writePackedInstallManifest(
  prefix: string,
  tarballs: Tarballs,
): void {
  writeFileSync(
    join(prefix, "package.json"),
    JSON.stringify(
      {
        name: "kibi-packed-e2e",
        private: true,
        dependencies: {
          "kibi-core": `file:${tarballs.core}`,
          "kibi-cli": `file:${tarballs.cli}`,
          "kibi-runtime": `file:${tarballs.runtime}`,
          "kibi-mcp": `file:${tarballs.mcp}`,
          "kibi-opencode": `file:${tarballs.opencode}`,
          "kibi-codex": `file:${tarballs.codex}`,
          "kibi-cursor": `file:${tarballs.cursor}`,
        },
      },
      null,
      2,
    ),
    "utf8",
  );
}
