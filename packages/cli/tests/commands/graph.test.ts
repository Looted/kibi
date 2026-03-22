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

describe("kibi graph", () => {
  let tmpDir: string;
  const kibiBin = path.resolve(__dirname, "../../bin/kibi");

  beforeAll(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-test-graph-"));
    execSync("git init -b main", { cwd: tmpDir, stdio: "pipe" });
    execSync(`bun ${kibiBin} init`, { cwd: tmpDir, stdio: "pipe" });

    mkdirSync(path.join(tmpDir, "documentation", "requirements"), {
      recursive: true,
    });
    mkdirSync(path.join(tmpDir, "documentation", "scenarios"), {
      recursive: true,
    });

    writeFileSync(
      path.join(tmpDir, "documentation", "requirements", "REQ-001.md"),
      `---
id: REQ-001
title: User authentication
status: open
links:
  - type: specified_by
    target: SCEN-001
---
`,
    );

    writeFileSync(
      path.join(tmpDir, "documentation", "scenarios", "SCEN-001.md"),
      `---
id: SCEN-001
title: Login flow
status: active
---
`,
    );

    execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });
  });

  afterAll(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("returns bounded traversal from a requirement seed", () => {
    const output = execSync(
      `bun ${kibiBin} graph --from REQ-001 --relationships specified_by --depth 1 --format json`,
      {
        cwd: tmpDir,
        encoding: "utf8",
      },
    );

    const result = JSON.parse(output) as {
      nodes: Array<{ id: string }>;
      edges: Array<{ type: string }>;
    };
    expect(result.nodes.map((node) => node.id)).toContain("REQ-001");
    expect(result.nodes.map((node) => node.id)).toContain("SCEN-001");
    expect(result.edges[0]?.type).toBe("specified_by");
  });
});
