import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  FrontmatterError,
  extractFromMarkdownString,
} from "../../src/extractors/markdown.js";
import {
  applyEvidenceFloorPins,
  planEvidenceFloorPins,
} from "../../src/operations/migration/evidence-floor.js";
import {
  EVIDENCE_FLOOR_RULE,
  type EvidenceFloorRow,
  collectEvidenceFloorViolations,
  evidenceFloorViolations,
} from "../../src/public/operations/evidence-floor.js";

// implements REQ-kibi-evidence-floors

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-evidence-floor-"));
  roots.push(root);
  for (const [relative, content] of Object.entries(files)) {
    const absolute = path.join(root, relative);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, content);
  }
  return root;
}

function requirement(id: string, frontmatter = "", links = ""): string {
  return `---\nid: ${id}\ntitle: ${id} title\ntype: req\nstatus: open\n${frontmatter}${links}---\n\nThe system must keep ${id} true.\n`;
}

const row = (overrides: Partial<EvidenceFloorRow>): EvidenceFloorRow => ({
  id: "REQ-A",
  evidenceLevel: "asserted",
  requiredEvidence: "tested",
  requiredEvidenceSource: "firmness",
  status: "below",
  proofStatus: "missing",
  proofGaps: ["missing_scenario"],
  ...overrides,
});

describe("evidence-floor findings", () => {
  test("a requirement below its floor is a finding that names level and floor", () => {
    const [finding] = evidenceFloorViolations([row({})]);
    expect(finding?.rule).toBe(EVIDENCE_FLOOR_RULE);
    expect(finding?.entityId).toBe("REQ-A");
    expect(finding?.description).toBe(
      "REQ-A is asserted but needs tested (the floor of a firm requirement)",
    );
    expect(finding?.suggestion).toContain("kibi proof explain REQ-A");
    expect(finding?.evidence).toMatchObject({
      requiredEvidenceSource: "firmness",
      status: "below",
    });
  });

  test("an explicit floor says it comes from required_evidence", () => {
    const [finding] = evidenceFloorViolations([
      row({
        evidenceLevel: "unverified",
        requiredEvidence: "asserted",
        requiredEvidenceSource: "explicit",
      }),
    ]);
    expect(finding?.description).toBe(
      "REQ-A is unverified but needs asserted (its required_evidence)",
    );
    expect(finding?.suggestion).toContain("approve");
  });

  test("stale-only evidence passes unless fresh evidence is required", () => {
    const pending = row({
      status: "pending_reproof",
      proofStatus: "unresolved",
      proofGaps: ["stale_proof_receipt", "missing_production_symbol_coverage"],
    });
    expect(evidenceFloorViolations([pending])).toEqual([]);
    const [finding] = evidenceFloorViolations([pending], {
      freshEvidence: true,
    });
    expect(finding?.description).toContain(
      "its receipts are older than the code",
    );
    expect(finding?.suggestion).toContain("kibi prove");
  });

  test("the rule only runs when selected and a store is attached", async () => {
    const context = {
      workspaceRoot: "/nonexistent",
      signal: new AbortController().signal,
      clock: () => new Date(),
    };
    expect(
      await collectEvidenceFloorViolations(context, new Set(["no-cycles"])),
    ).toEqual([]);
    expect(
      await collectEvidenceFloorViolations(
        context,
        new Set([EVIDENCE_FLOOR_RULE]),
      ),
    ).toEqual([]);
  });

  test("a KB before schema 11 is not judged yet", async () => {
    const root = workspace({
      ".kb/manifest.json": JSON.stringify({
        manifestVersion: 1,
        schemaVersion: 10,
        semanticAdvisorBackfill: "not_applicable",
      }),
    });
    let queried = false;
    const violations = await collectEvidenceFloorViolations(
      {
        workspaceRoot: root,
        signal: new AbortController().signal,
        clock: () => new Date(),
        prolog: {
          query: async () => {
            queried = true;
            return { success: true, bindings: {} };
          },
        } as never,
      },
      new Set([EVIDENCE_FLOOR_RULE]),
    );
    expect(violations).toEqual([]);
    expect(queried).toBe(false);
  });
});

describe("required_evidence front matter", () => {
  test("a requirement keeps a valid floor", () => {
    const { entity } = extractFromMarkdownString(
      requirement("REQ-A", "required_evidence: proved\n"),
      ".kb/requirements/REQ-A.md",
    );
    expect(entity.required_evidence).toBe("proved");
  });

  test("an unknown level or another entity type is rejected", () => {
    expect(() =>
      extractFromMarkdownString(
        requirement("REQ-A", "required_evidence: proven\n"),
        ".kb/requirements/REQ-A.md",
      ),
    ).toThrow(FrontmatterError);
    expect(() =>
      extractFromMarkdownString(
        "---\nid: SCEN-A\ntitle: A scenario\ntype: scenario\nstatus: active\nrequired_evidence: tested\n---\n\nGiven a user, when they act, then it works.\n",
        ".kb/scenarios/SCEN-A.md",
      ),
    ).toThrow("required_evidence is only allowed on type: req");
  });
});

describe("schema 11 migration", () => {
  const scenario = (id: string, tests: string[] = []) =>
    `---\nid: ${id}\ntitle: ${id} title\ntype: scenario\nstatus: active\n${tests.length > 0 ? `links:\n${tests.map((t) => `  - type: verified_by\n    target: ${t}\n`).join("")}` : ""}---\n\nGiven a user, when they act, then it works.\n`;
  const contractTest = (id: string) =>
    `---\nid: ${id}\ntitle: ${id} title\ntype: test\nstatus: passing\nverification_scope: end_to_end\nproof_contract:\n  version: kibi.proof-contract.v1\n  integration: self-proof\n  required_proofs:\n    - symbol_id: SYM-E2E\n      target: default\n  success_policy: all_required_first_attempt\n---\n\nRuns the flow end to end.\n`;
  const plainTest = (id: string) =>
    `---\nid: ${id}\ntitle: ${id} title\ntype: test\nstatus: passing\n---\n\nRuns the flow.\n`;
  const specifiedBy = (scenarioId: string) =>
    `links:\n  - type: specified_by\n    target: ${scenarioId}\n`;

  function fixture(): string {
    return workspace({
      // Firm (no origin), no scenario: cannot reach tested.
      ".kb/requirements/REQ-NO-PATH.md": requirement("REQ-NO-PATH"),
      // Firm, scenario verified only by a test without a proof contract.
      ".kb/requirements/REQ-PLAIN.md": requirement(
        "REQ-PLAIN",
        "",
        specifiedBy("SCEN-PLAIN"),
      ),
      ".kb/scenarios/SCEN-PLAIN.md": scenario("SCEN-PLAIN", ["TEST-PLAIN"]),
      ".kb/tests/TEST-PLAIN.md": plainTest("TEST-PLAIN"),
      // Firm with a proof path (the test validates the scenario through a
      // relationship shard): keeps the tested floor.
      ".kb/requirements/REQ-PROVED.md": requirement(
        "REQ-PROVED",
        "",
        specifiedBy("SCEN-PROVED"),
      ),
      ".kb/scenarios/SCEN-PROVED.md": scenario("SCEN-PROVED"),
      ".kb/tests/TEST-PROVED.md": contractTest("TEST-PROVED"),
      ".kb/relationships/00.yaml":
        "relationships:\n  - id: rel-000000000001\n    type: validates\n    from: TEST-PROVED\n    to: SCEN-PROVED\n    created_at: '2026-10-24T00:00:00Z'\n    created_by: kibi/upsert\n    source: mcp://kibi/upsert\n",
      // A closed requirement is still current (done, not retired).
      ".kb/requirements/REQ-CLOSED.md": requirement("REQ-CLOSED").replace(
        "status: open",
        "status: closed",
      ),
      // Not firm, explicit floor, exempt or superseded: left alone.
      ".kb/requirements/REQ-AGENT.md": requirement(
        "REQ-AGENT",
        "origin:\n  kind: agent\n",
      ),
      ".kb/requirements/REQ-EXPLICIT.md": requirement(
        "REQ-EXPLICIT",
        "required_evidence: tested\n",
        "links:\n  - type: supersedes\n    target: REQ-OLD\n",
      ),
      ".kb/requirements/REQ-OLD.md": requirement("REQ-OLD"),
      ".kb/requirements/REQ-EXEMPT.md": requirement(
        "REQ-EXEMPT",
        "proof_exempt: true\nproof_exempt_reason: Tooling outside product proof.\n",
      ),
    });
  }

  test("plans asserted floors only for current firm requirements without a proof path", () => {
    const plan = planEvidenceFloorPins(fixture());
    expect(plan.targets.map((target) => target.id).sort()).toEqual([
      "REQ-CLOSED",
      "REQ-NO-PATH",
      "REQ-PLAIN",
    ]);
    expect(plan.skipped).toEqual([]);
  });

  test("writes the floor into front matter only, and a second run is a no-op", () => {
    const root = fixture();
    expect(applyEvidenceFloorPins(root)).toBe(3);
    const written = readFileSync(
      path.join(root, ".kb/requirements/REQ-NO-PATH.md"),
      "utf8",
    );
    expect(written).toContain("required_evidence: asserted\n---");
    expect(written).toContain("The system must keep REQ-NO-PATH true.");
    const { entity } = extractFromMarkdownString(
      written,
      ".kb/requirements/REQ-NO-PATH.md",
    );
    expect(entity.required_evidence).toBe("asserted");
    expect(applyEvidenceFloorPins(root)).toBe(0);
  });
});
