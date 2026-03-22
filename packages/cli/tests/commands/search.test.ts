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

describe("kibi search", () => {
  let tmpDir: string;
  const kibiBin = path.resolve(__dirname, "../../bin/kibi");

  beforeAll(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-test-search-"));
    execSync("git init -b main", { cwd: tmpDir, stdio: "pipe" });
    execSync(`bun ${kibiBin} init`, { cwd: tmpDir, stdio: "pipe" });

    mkdirSync(path.join(tmpDir, "documentation", "requirements"), {
      recursive: true,
    });
    mkdirSync(path.join(tmpDir, "src"), { recursive: true });

    writeFileSync(
      path.join(tmpDir, "documentation", "requirements", "REQ-001.md"),
      `---
id: REQ-001
title: OAuth login flow
status: open
---

The markdown body mentions latent discovery token.
`,
    );

    writeFileSync(
      path.join(tmpDir, "src", "hidden.ts"),
      "export const hidden = 'latent discovery token';\n",
    );

    execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });
  });

  afterAll(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("searches markdown content but not raw code bodies", () => {
    const output = execSync(
      `bun ${kibiBin} search "latent discovery token" --format json`,
      {
        cwd: tmpDir,
        encoding: "utf8",
      },
    );

    const result = JSON.parse(output) as {
      count: number;
      results: Array<{ entity: { id: string } }>;
    };
    expect(result.count).toBe(1);
    expect(result.results[0]?.entity.id).toBe("REQ-001");
  });
});
