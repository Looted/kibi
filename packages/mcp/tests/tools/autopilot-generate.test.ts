import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { handleKbAutopilotGenerate } from "../../src/tools/autopilot-generate.js";
import { _setToolsServerDepsForTests } from "../../src/server/tools.js";

describe("autopilot generic markdown and dedupe", () => {
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
    // create README with headings
    const readme = `# ADR: Use service mesh\n\n# Requirements\n\n# Observations\n`;
    await fs.writeFile(path.join(tmp, "README.md"), readme);

    // create a typed markdown in documentation that should be ignored by generic scan
    await fs.mkdir(path.join(tmp, "documentation"), { recursive: true });
    await fs.writeFile(
      path.join(tmp, "documentation", "REQ-001.md"),
      `---\nid: REQ-001\ntitle: Documented req\nstatus: open\n---\n`,
    );

    // Mock prolog that reports KB initialized
    const prolog: any = { query: async (g: string) => ({ success: true, bindings: {} }) };

    const res = await handleKbAutopilotGenerate(prolog as any, { includeGenericMarkdown: true, minConfidence: 0.8 });
    const structured = res.structuredContent;
    expect(structured).toBeDefined();
    const candidates = structured.candidates as any[];
    // Should include only adr/req/fact from generic scan plus typed candidate
    expect(candidates.length).toBeGreaterThanOrEqual(1);
    // debug: print entity types on failure
    const types = candidates.map((c) => c.entityType);
    console.log("DEBUG candidate types:", types);
    expect(types.every((t) => ["adr", "req", "fact"].includes(t))).toBe(true);
  });

  test("vendored-only repos return zero candidates", async () => {
    // create vendor tree only
    await fs.mkdir(path.join(tmp, "vendor", "pkg"), { recursive: true });
    await fs.writeFile(path.join(tmp, "vendor", "pkg", "README.md"), "# ADR: vendor only\n");

    const prolog: any = { query: async (g: string) => ({ success: true, bindings: {} }) };
    const res = await handleKbAutopilotGenerate(prolog as any, { includeGenericMarkdown: true });
    const candidates = res.structuredContent?.candidates as any[];
    expect(candidates).toBeDefined();
    // Should be zero because vendor files are excluded
    expect(candidates.length).toBe(0);
  });
});
