import { afterAll, describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrologProcess } from "../../src/prolog.js";

const CORE_SRC = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../core/src",
);

describe("a refused module load through a live Prolog session", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "kibi-permission-error-"));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  test("names what Prolog refused instead of a store lock", async () => {
    // The session loads kb.pl from this checkout; discovery.pl is loaded
    // from it too, then again from a second copy of the core.
    const copy = path.join(dir, "src");
    cpSync(CORE_SRC, copy, { recursive: true });
    const quoted = (file: string) => `'${file.replaceAll("'", "''")}'`;
    const prolog = new PrologProcess({ oneShot: false });
    try {
      await prolog.start();
      const own = await prolog.query(
        `use_module(${quoted(path.join(CORE_SRC, "discovery.pl"))})`,
      );
      expect(own.success).toBe(true);
      const other = await prolog.query(
        `use_module(${quoted(path.join(copy, "discovery.pl"))})`,
      );
      expect(other.success).toBe(false);
      expect(other.error).toContain(
        "Prolog refused to redefine module discovery (Already loaded from",
      );
      expect(other.error).toContain(
        "this is a permission_error, not a branch-store lock",
      );
      expect(other.error).not.toContain("Access denied or KB locked");
    } finally {
      await prolog.terminate();
    }
  }, 120_000);
});
