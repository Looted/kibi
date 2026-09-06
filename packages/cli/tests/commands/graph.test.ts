import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "../helpers/isolated-env.js";

describe("kibi graph", () => {
  let tmpDir: string;
  const kibiBin = path.resolve(__dirname, "../../bin/kibi");

  beforeAll(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-test-graph-"));
    execSync("git init -b main", { cwd: tmpDir, stdio: "pipe" });
    execSync(`bun ${kibiBin} init`, { cwd: tmpDir, stdio: "pipe" });

    mkdirSync(path.join(tmpDir, ".kb", "requirements"), {
      recursive: true,
    });
    mkdirSync(path.join(tmpDir, ".kb", "scenarios"), {
      recursive: true,
    });

    writeFileSync(
      path.join(tmpDir, ".kb", "requirements", "REQ-001.md"),
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
      path.join(tmpDir, ".kb", "scenarios", "SCEN-001.md"),
      `---
id: SCEN-001
title: Login flow
status: active
---
`,
    );

    execSync("git add .kb", { cwd: tmpDir, stdio: "pipe" });

    execSync(`bun ${kibiBin} sync`, { cwd: tmpDir, stdio: "pipe" });
  }, 120000); // journaled-engine init + sync exceeds 30s under prove load

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

    // Stabilize JSON contract for packed parity checks
    const nodeIds = result.nodes.map((node) => node.id).sort();
    expect(nodeIds).toEqual(["REQ-001", "SCEN-001"]);
    expect(result.edges.length).toBe(1);
  });
});
