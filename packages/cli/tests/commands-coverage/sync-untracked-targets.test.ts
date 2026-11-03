import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { adoptUpsertOnlySymbolManifest } from "../../src/commands/sync/untracked-targets.js";
import { KB_PATHS } from "../../src/utils/kb-paths.js";
import {
  createGitWorkspace,
  removeTempDir,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) removeTempDir(root);
});

function workspace(): string {
  const root = createGitWorkspace("main");
  roots.push(root);
  return root;
}

const pendingDir = (root: string) =>
  path.join(root, ".kb", "recovery", "pending-sources");

describe("adoptUpsertOnlySymbolManifest", () => {
  test("declines a manifest path that cannot be read as a file", async () => {
    const root = workspace();
    mkdirSync(path.join(root, KB_PATHS.symbolsManifest), { recursive: true });
    expect(await adoptUpsertOnlySymbolManifest(root, async () => true)).toBe(
      false,
    );
  });

  test("declines a manifest whose YAML does not parse", async () => {
    const root = workspace();
    const manifest = path.join(root, KB_PATHS.symbolsManifest);
    mkdirSync(path.dirname(manifest), { recursive: true });
    writeFileSync(manifest, "symbols: [unclosed\n  - : :\n");
    expect(await adoptUpsertOnlySymbolManifest(root, async () => true)).toBe(
      false,
    );
  });

  test("adopts only object entries with string ids", async () => {
    const root = workspace();
    const manifest = path.join(root, KB_PATHS.symbolsManifest);
    mkdirSync(path.dirname(manifest), { recursive: true });
    writeFileSync(
      manifest,
      "symbols:\n  - plain-string\n  - null\n  - id: 7\n  - id: SYM-KEPT\n",
    );
    const seen: string[][] = [];
    const adopted = await adoptUpsertOnlySymbolManifest(root, async (ids) => {
      seen.push([...ids]);
      return true;
    });
    expect(adopted).toBe(true);
    expect(seen).toStrictEqual([["SYM-KEPT"]]);
    expect(existsSync(pendingDir(root))).toBe(true);
    expect(readdirSync(pendingDir(root))).toHaveLength(1);
  });
});
