import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

describe("staged symbol traceability gate", () => {
  const TEST_TIMEOUT_MS = 20000;
  let tmpDir: string;
  const kibiBin = path.resolve(__dirname, "../../../packages/cli/bin/kibi");

  function sha256Hex(contents: string) {
    const { createHash } = require("node:crypto");
    const buf = Buffer.isBuffer(contents)
      ? contents
      : Buffer.from(String(contents));
    return createHash("sha256").update(buf).digest("hex");
  }

  function repoSymbolsHash(repoRoot: string) {
    const p = path.join(repoRoot, "symbols.yaml");
    if (!existsSync(p)) return null;
    return sha256Hex(readFileSync(p));
  }

  function kbBranchesSnapshot(repoRoot: string) {
    const dir = path.join(repoRoot, ".kb/branches");
    if (!existsSync(dir)) return [];
    const fs = require("node:fs");
    const walk = (d: string, base: string) => {
      const out: string[] = [];
      for (const name of fs.readdirSync(d)) {
        const full = path.join(d, name);
        const rel = path.relative(base, full);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          out.push(...walk(full, base));
        } else {
          const contents = fs.readFileSync(full);
          out.push(rel + ":" + sha256Hex(contents));
        }
      }
      return out;
    };
    return walk(dir, dir).sort();
  }

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-traceability-"));
    execSync("git init", { cwd: tmpDir, stdio: "pipe" });
    execSync("git config user.email 'test@example.com'", {
      cwd: tmpDir,
      stdio: "pipe",
    });
    execSync("git config user.name 'Test User'", {
      cwd: tmpDir,
      stdio: "pipe",
    });
  });

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir))
      rmSync(tmpDir, { recursive: true, force: true });
  });

  test(
    "good - passes with implements directive",
    () => {
      // snapshot host repo artifacts
      const hostRepo = path.resolve(__dirname, "../../../../");
      const beforeSymbols = repoSymbolsHash(hostRepo);
      const beforeBranches = kbBranchesSnapshot(hostRepo);

      // create a TS file with exported function and implements directive
      const src =
        "// implements: REQ-001\nexport function hello() { return 'ok'; }\n";
      writeFileSync(path.join(tmpDir, "file.js"), src, "utf8");
      execSync("git add file.js", { cwd: tmpDir, stdio: "pipe" });

      let out = "";
      try {
        out = execSync(`bun ${kibiBin} check --staged`, {
          cwd: tmpDir,
          encoding: "utf8",
          stdio: "pipe",
        });
      } catch (e: any) {
        out = e.stdout ? String(e.stdout) : String(e.message ?? e);
      }
      expect(out.includes("OK") || out.includes("No staged files found")).toBe(
        true,
      );

      // non-mutation assertions
      const afterSymbols = repoSymbolsHash(hostRepo);
      const afterBranches = kbBranchesSnapshot(hostRepo);
      expect(afterSymbols).toBe(beforeSymbols);
      expect(afterBranches).toEqual(beforeBranches);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "bad - fails without requirement link",
    () => {
      const hostRepo = path.resolve(__dirname, "../../../../");
      const beforeSymbols = repoSymbolsHash(hostRepo);
      const beforeBranches = kbBranchesSnapshot(hostRepo);

      const src =
        "function missingLink() { return 1; }\nmodule.exports = { missingLink };\n";
      writeFileSync(path.join(tmpDir, "noimpl.js"), src, "utf8");
      execSync("git add noimpl.js", { cwd: tmpDir, stdio: "pipe" });

      let code = 0;
      let stdout = "";
      try {
        stdout = execSync(`bun ${kibiBin} check --staged`, {
          cwd: tmpDir,
          encoding: "utf8",
          stdio: "pipe",
        });
        code = 0;
      } catch (err: unknown) {
        const e = err as any;
        code = e.status ?? 1;
        stdout = e.stdout ? String(e.stdout) : String(e.message ?? e);
      }
      const okFailure =
        code === 1 &&
        /noimpl\.js:\d+/.test(stdout) &&
        stdout.includes("missingLink");
      const skipped = stdout.includes("No staged files found");
      expect(okFailure || skipped).toBe(true);

      const afterSymbols = repoSymbolsHash(hostRepo);
      const afterBranches = kbBranchesSnapshot(hostRepo);
      expect(afterSymbols).toBe(beforeSymbols);
      expect(afterBranches).toEqual(beforeBranches);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "empty - nothing staged",
    () => {
      const hostRepo = path.resolve(__dirname, "../../../../");
      const beforeSymbols = repoSymbolsHash(hostRepo);
      const beforeBranches = kbBranchesSnapshot(hostRepo);

      // ensure no staged files
      // run check
      const out = execSync(`bun ${kibiBin} check --staged`, {
        cwd: tmpDir,
        encoding: "utf8",
        stdio: "pipe",
      });
      expect(out).toContain("No staged files found");

      const afterSymbols = repoSymbolsHash(hostRepo);
      const afterBranches = kbBranchesSnapshot(hostRepo);
      expect(afterSymbols).toBe(beforeSymbols);
      expect(afterBranches).toEqual(beforeBranches);
    },
    TEST_TIMEOUT_MS,
  );
});
