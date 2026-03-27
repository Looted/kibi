import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

describe("kibi gaps", () => {
  let tmpDir: string;
  const kibiBin = path.resolve(__dirname, "../../bin/kibi");

  beforeAll(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-test-gaps-"));
    execSync("git init -b main", { cwd: tmpDir, stdio: "pipe" });
    execSync(`bun ${kibiBin} init`, { cwd: tmpDir, stdio: "pipe" });

    mkdirSync(path.join(tmpDir, "documentation", "requirements"), {
      recursive: true,
    });

    writeFileSync(
      path.join(tmpDir, "documentation", "requirements", "REQ-001.md"),
      `---
id: REQ-001
title: User authentication
status: open
priority: must
---
`,
    );

    execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });
  }, 30000); // kibi init + sync can take ~10s; allow 30s for slower CI environments

  afterAll(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("finds requirements missing scenarios", () => {
    const output = execSync(
      `bun ${kibiBin} gaps req --missing-rel specified_by --format json`,
      {
        cwd: tmpDir,
        encoding: "utf8",
      },
    );

    const result = JSON.parse(output) as {
      count: number;
      rows: Array<{ id: string }>;
    };
    expect(result.count).toBe(1);
    expect(result.rows[0]?.id).toBe("REQ-001");

    // Stabilize JSON contract for packed parity checks
    const rowIds = result.rows.map((row) => row.id).sort();
    expect(rowIds).toEqual(["REQ-001"]);
  });
});
