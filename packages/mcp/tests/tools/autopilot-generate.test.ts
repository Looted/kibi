import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildGenericMarkdownCandidates } from "../../src/tools/autopilot-candidates.js";
import { handleKbAutopilotGenerate } from "../../src/tools/autopilot-generate.js";
import {
  createVendoredTree,
  ensureDocs,
  writeRootConfig,
} from "./autopilot-workspace-fixture";

describe("autopilot generate", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "kibi-autopilot-"));
    process.env.KIBI_WORKSPACE = tmp;
  });

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
    delete process.env.KIBI_WORKSPACE;
  });

  test("generic markdown heuristics produce only ADR/REQ/FACT candidates and suppress low confidence", async () => {
    const readme = `# ADR: Use service mesh

# Requirements

# Observations
`;
    await fs.writeFile(path.join(tmp, "README.md"), readme);

    await fs.mkdir(path.join(tmp, "documentation"), { recursive: true });
    await fs.writeFile(
      path.join(tmp, "documentation", "REQ-001.md"),
      `---
id: REQ-001
title: Documented req
status: open
---
`,
    );

    const prolog: any = {
      query: async () => ({ success: true, bindings: {} }),
    };

    const res = await handleKbAutopilotGenerate(prolog as any, {
      includeGenericMarkdown: true,
      minConfidence: 0.8,
    });
    const candidates = res.structuredContent.candidates as any[];
    expect(candidates.length).toBeGreaterThanOrEqual(1);
    const types = candidates.map((c) => c.entityType);
    expect(types.every((t) => ["adr", "req", "fact"].includes(t))).toBe(true);
  });

  test("generic ADR markdown candidates use proposed status", async () => {
    await fs.mkdir(path.join(tmp, "docs"), { recursive: true });
    const sourcePath = path.join(tmp, "docs", "bootstrap.md");
    await fs.writeFile(sourcePath, `# ADR: Adopt Kibi\n`);

    const candidates = buildGenericMarkdownCandidates(
      { markdownFiles: [sourcePath] },
      { ids: new Set<string>(), workspaceRoot: tmp },
      0.8,
    );

    const adrCandidate = candidates.find((candidate) => candidate.entityType === "adr");
    expect(adrCandidate).toBeDefined();
    expect((adrCandidate?.applyPlan[0] as any).properties.status).toBe("proposed");
  });

  test("day-0 root_uninitialized generates candidates and generic ADRs use proposed status", async () => {
    await fs.mkdir(path.join(tmp, "docs"), { recursive: true });
    await fs.writeFile(
      path.join(tmp, "docs", "bootstrap.md"),
      `# ADR: Adopt Kibi

# Requirements

# Observations
`,
    );

    const prolog: any = {
      query: async () => ({ success: false, bindings: {}, error: "no entities" }),
    };

    const res = await handleKbAutopilotGenerate(prolog as any, {
      includeGenericMarkdown: true,
      minConfidence: 0.8,
    });

    expect(res.structuredContent.activationState).toBe("root_uninitialized");
    expect(res.structuredContent.applyBlocked).toBe(false);

    const candidates = res.structuredContent.candidates as any[];
    expect(candidates.length).toBeGreaterThan(0);

    const adrCandidate = candidates.find((candidate) => candidate.entityType === "adr");
    expect(adrCandidate).toBeDefined();
    expect(adrCandidate.applyPlan[0].properties.status).toBe("proposed");
  });

  test("vendored_only workspaces are blocked with zero candidates", async () => {
    createVendoredTree(tmp);

    const prolog: any = {
      query: async () => ({ success: true, bindings: {} }),
    };

    const res = await handleKbAutopilotGenerate(prolog as any, {
      includeGenericMarkdown: true,
    });

    expect(res.structuredContent.activationState).toBe("vendored_only");
    expect(res.structuredContent.applyBlocked).toBe(true);
    expect(res.structuredContent.candidates).toEqual([]);
  });

  test("root_active_thin workspaces are blocked with zero candidates", async () => {
    ensureDocs(tmp);
    writeRootConfig(tmp, {});
    await fs.mkdir(path.join(tmp, "docs"), { recursive: true });
    await fs.writeFile(path.join(tmp, "docs", "bootstrap.md"), `# ADR: Already active
`);

    const fakeCounts = JSON.stringify({
      rows: [
        { id: "req", type: "req", count: 0 },
        { id: "scenario", type: "scenario", count: 0 },
        { id: "test", type: "test", count: 0 },
      ],
    });

    const prolog: any = {
      query: async (goal: string) => {
        if (goal.includes("coverage_report_json")) {
          return { success: true, bindings: { JsonString: fakeCounts } };
        }
        return { success: true, bindings: {} };
      },
    };

    const res = await handleKbAutopilotGenerate(prolog as any, {
      includeGenericMarkdown: true,
    });

    expect(res.structuredContent.activationState).toBe("root_active_thin");
    expect(res.structuredContent.applyBlocked).toBe(true);
    expect(res.structuredContent.candidates).toEqual([]);
  });
});
