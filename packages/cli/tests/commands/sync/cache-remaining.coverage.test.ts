import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { hashManifestWithCoordinates } from "../../../src/commands/sync/cache.js";

const workspaces: string[] = [];
let previousExitCode: string | number | undefined | null;

afterEach(() => {
  process.exitCode = previousExitCode ?? 0;
  for (const workspace of workspaces.splice(0)) {
    rmSync(workspace, { recursive: true, force: true });
  }
});

function workspace(): string {
  previousExitCode = process.exitCode;
  const root = mkdtempSync(path.join(tmpdir(), "kibi-sync-cache-remaining-"));
  workspaces.push(root);
  mkdirSync(path.join(root, ".kb"), { recursive: true });
  return root;
}

describe("hashManifestWithCoordinates remaining referenced-source states", () => {
  test("records outside-workspace, missing, and unreadable referenced sources", () => {
    const root = workspace();
    const manifest = path.join(root, ".kb", "symbols.yaml");
    writeFileSync(
      manifest,
      [
        "symbols:",
        "  - id: SYM-ABS",
        "    sourceFile: /etc/passwd",
        "  - id: SYM-REL",
        "    source: ../secret.ts",
        "  - id: SYM-MISS",
        "    sourceFile: src/missing.ts",
        "  - id: SYM-BOOM",
        "    sourceFile: src/present.ts",
        "",
      ].join("\n"),
    );
    mkdirSync(path.join(root, "src"), { recursive: true });
    writeFileSync(path.join(root, "src", "present.ts"), "export const x = 1;\n");

    const withOutside = hashManifestWithCoordinates(root, manifest, null);
    expect(withOutside).toMatch(/^[a-f0-9]{64}$/);

    const throwing = hashManifestWithCoordinates(root, manifest, null, {
      existsSync: (target) => {
        if (String(target).includes("present.ts")) {
          throw new Error("stat failed");
        }
        return existsSync(target);
      },
      readFileSync,
    });
    expect(throwing).toMatch(/^[a-f0-9]{64}$/);
    expect(throwing).not.toBe(withOutside);
  });
});
