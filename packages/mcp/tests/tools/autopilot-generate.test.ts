import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PrologProcess } from "kibi-cli/prolog";
import { buildGenericMarkdownCandidates } from "../../src/tools/autopilot-candidates.js";
import { handleKbAutopilotGenerate } from "../../src/tools/autopilot-generate.js";
import {
  createVendoredTree,
  ensureDocs,
  writeRootConfig,
} from "./autopilot-workspace-fixture";

type PrologQueryResult = Awaited<ReturnType<PrologProcess["query"]>>;

interface CandidateWithPlan {
  entityType?: string;
  title?: string;
  applyPlan?: Array<{
    properties?: {
      status?: string;
    };
  }>;
}

function getCandidateStatus(candidate: CandidateWithPlan | undefined): string | undefined {
  return candidate?.applyPlan?.[0]?.properties?.status;
}

describe("autopilot generate", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "kibi-autopilot-"));
    process.env.KIBI_WORKSPACE = tmp;
  });

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
    process.env.KIBI_WORKSPACE = undefined;
  });

  function createPrologStub(
    queryImpl: (goal: string | string[]) => Promise<PrologQueryResult>,
  ): PrologProcess {
    const prolog = new PrologProcess();
    prolog.query = queryImpl;
    return prolog;
  }

  function emptyQueryResult(): PrologQueryResult {
    return { success: true, bindings: {} };
  }

  test("generic markdown heuristics produce only ADR/REQ/FACT candidates and suppress low confidence", async () => {
    const readme = "# ADR: Use service mesh\n\n# Requirements\n\n# Observations\n";
    await fs.writeFile(path.join(tmp, "README.md"), readme);

    await fs.mkdir(path.join(tmp, "documentation"), { recursive: true });
    await fs.writeFile(
      path.join(tmp, "documentation", "REQ-001.md"),
      "---\nid: REQ-001\ntitle: Documented req\nstatus: open\n---\n",
    );

    const prolog = createPrologStub(async () => emptyQueryResult());

    const res = await handleKbAutopilotGenerate(prolog, {
      includeGenericMarkdown: true,
      minConfidence: 0.8,
    });
    const candidates = res.structuredContent.candidates as Array<Record<string, unknown>>;
    expect(candidates.length).toBeGreaterThanOrEqual(1);
    const types = candidates.map((candidate) => candidate.entityType);
    expect(types.every((type) => ["adr", "req", "fact"].includes(String(type)))).toBe(true);
  });

  test("generic ADR markdown candidates use proposed status", async () => {
    await fs.mkdir(path.join(tmp, "docs"), { recursive: true });
    const sourcePath = path.join(tmp, "docs", "bootstrap.md");
    await fs.writeFile(sourcePath, "# ADR: Adopt Kibi\n");

    const candidates = buildGenericMarkdownCandidates(
      { markdownFiles: [sourcePath] },
      { ids: new Set<string>() },
      0.8,
    );

    const adrCandidate = candidates.find(
      (candidate) => candidate.entityType === "adr",
    ) as CandidateWithPlan | undefined;
    expect(adrCandidate).toBeDefined();
    expect(getCandidateStatus(adrCandidate)).toBe("proposed");
  });

  test("day-0 root_uninitialized generates candidates and generic ADRs use proposed status", async () => {
    await fs.mkdir(path.join(tmp, "docs"), { recursive: true });
    await fs.writeFile(
      path.join(tmp, "docs", "bootstrap.md"),
      "# ADR: Adopt Kibi\n\n# Requirements\n\n# Observations\n",
    );

    const prolog = createPrologStub(async () => ({
      success: false,
      bindings: {},
      error: "no entities",
    }));

    const res = await handleKbAutopilotGenerate(prolog, {
      includeGenericMarkdown: true,
      minConfidence: 0.8,
    });

    expect(res.structuredContent.activationState).toBe("root_uninitialized");
    expect(res.structuredContent.applyBlocked).toBe(false);

    const candidates = res.structuredContent
      .candidates as Array<CandidateWithPlan>;
    expect(candidates.length).toBeGreaterThan(0);

    const adrCandidate = candidates.find(
      (candidate) => candidate.entityType === "adr",
    );
    expect(adrCandidate).toBeDefined();
    expect(getCandidateStatus(adrCandidate)).toBe("proposed");
  });

  test("root_partial workspaces may scan but block apply", async () => {
    writeRootConfig(tmp, {
      paths: {
        requirements: "documentation/requirements/**/*.md",
      },
    });
    await fs.mkdir(path.join(tmp, "documentation", "requirements"), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(tmp, "documentation", "requirements", "REQ-123.md"),
      "---\nid: REQ-123\ntitle: Partial workspace requirement\nstatus: open\n---\n# Content\n",
    );

    const prolog = createPrologStub(async () => emptyQueryResult());

    const res = await handleKbAutopilotGenerate(prolog, {
      includeGenericMarkdown: false,
    });

    expect(res.structuredContent.activationState).toBe("root_partial");
    expect(res.structuredContent.applyBlocked).toBe(true);
    expect(res.structuredContent.candidates).toHaveLength(1);
  });

  test("duplicate title suppression emits flat records", async () => {
    await fs.writeFile(path.join(tmp, "README.md"), "# ADR: Shared Decision\n");
    await fs.mkdir(path.join(tmp, "docs"), { recursive: true });
    await fs.writeFile(path.join(tmp, "docs", "duplicate.md"), "# ADR: Shared Decision\n");

    const prolog = createPrologStub(async () => emptyQueryResult());

    const res = await handleKbAutopilotGenerate(prolog, {
      includeGenericMarkdown: true,
      minConfidence: 0.8,
    });

    const suppressed = res.structuredContent.suppressedCandidates as Array<Record<string, unknown>>;
    const duplicate = suppressed.find(
      (candidate) => candidate.reason === "duplicate_title",
    );

    expect(duplicate).toBeDefined();
    expect(duplicate?.candidateId).toEqual(expect.any(String));
    expect(duplicate?.sourcePath).toEqual(expect.any(String));
    expect(duplicate?.entityType).toBe("adr");
    expect(duplicate && Object.hasOwn(duplicate, "candidate")).toBe(false);
  });

  test("generic candidates shadowed by typed sources use shadowed_by_typed_source", async () => {
    await fs.mkdir(path.join(tmp, "documentation", "adr"), { recursive: true });
    await fs.writeFile(
      path.join(tmp, "documentation", "adr", "ADR-001.md"),
      "---\nid: ADR-001\ntitle: \"ADR: Adopt Kibi\"\nstatus: proposed\n---\n# ADR Content\n",
    );
    await fs.mkdir(path.join(tmp, "docs"), { recursive: true });
    await fs.writeFile(path.join(tmp, "docs", "decision.md"), "# ADR: Adopt Kibi\n");

    const prolog = createPrologStub(async () => emptyQueryResult());

    const res = await handleKbAutopilotGenerate(prolog, {
      includeGenericMarkdown: true,
      minConfidence: 0.8,
    });

    const candidates = res.structuredContent.candidates as Array<Record<string, unknown>>;
    expect(
      candidates.filter((candidate) => candidate.title === "ADR: Adopt Kibi"),
    ).toHaveLength(1);

    const suppressed = res.structuredContent.suppressedCandidates as Array<Record<string, unknown>>;
    const shadowed = suppressed.find(
      (candidate) => candidate.reason === "shadowed_by_typed_source",
    );

    expect(shadowed).toBeDefined();
    expect(shadowed?.candidateId).toEqual(expect.any(String));
    expect(shadowed?.sourcePath).toEqual(expect.any(String));
    expect(shadowed?.entityType).toBe("adr");
    expect(shadowed && Object.hasOwn(shadowed, "candidate")).toBe(false);
  });

  test("vendored_only workspaces are blocked with zero candidates", async () => {
    createVendoredTree(tmp);

    const prolog = createPrologStub(async () => emptyQueryResult());

    const res = await handleKbAutopilotGenerate(prolog, {
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
    await fs.writeFile(path.join(tmp, "docs", "bootstrap.md"), "# ADR: Already active\n");

    const fakeCounts = JSON.stringify({
      rows: [
        { id: "req", type: "req", count: 0 },
        { id: "scenario", type: "scenario", count: 0 },
        { id: "test", type: "test", count: 0 },
      ],
    });

    const prolog = createPrologStub(async (goal) => {
      const queryText = Array.isArray(goal) ? goal.join(" ") : goal;
      if (queryText.includes("coverage_report_json")) {
        return { success: true, bindings: { JsonString: fakeCounts } };
      }
      return emptyQueryResult();
    });

    const res = await handleKbAutopilotGenerate(prolog, {
      includeGenericMarkdown: true,
    });

    expect(res.structuredContent.activationState).toBe("root_active_thin");
    expect(res.structuredContent.applyBlocked).toBe(true);
    expect(res.structuredContent.candidates).toEqual([]);
  });
});
