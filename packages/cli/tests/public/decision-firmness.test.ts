import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  effectiveFirmness,
  firmnessRef,
  whyThisChangedWords,
} from "../../src/decision-firmness.js";
import {
  FrontmatterError,
  extractFromMarkdownString,
} from "../../src/extractors/markdown.js";
import { buildIntentClaimCandidates } from "../../src/operations/bootstrap/intent-claims.js";
import { markdownCandidates } from "../../src/operations/bootstrap/markdown-candidates.js";
import { normalizeBootstrapContext } from "../../src/operations/bootstrap/presentation.js";
import { SubjectKeyRegistry } from "../../src/operations/bootstrap/requirement-claims.js";
import { validateBootstrapPayload } from "../../src/operations/bootstrap/validation.js";
import {
  applyFirmSupersedeAcknowledgement,
  planFirmSupersedeAcknowledgement,
} from "../../src/operations/migration/firm-supersede.js";
import {
  applySchema6MigrationAction,
  buildSchema6MigrationFragment,
} from "../../src/operations/migration/schema6.js";
import {
  applySupersedesReasonAcknowledgement,
  planSupersedesReasonAcknowledgement,
} from "../../src/operations/migration/supersedes-reason.js";
import { validateUpsertInput } from "../../src/operations/mutation/validation.js";
import {
  DECISION_FIRM_SUPERSEDED_RULE,
  DECISION_FIRM_UNREFERENCED_RULE,
  SUPERSEDES_REASON_ACKNOWLEDGED_RULE,
  SUPERSEDES_REASON_MISSING_RULE,
  collectDecisionFirmnessViolations,
  evaluateDecisionFirmness,
} from "../../src/public/operations/decision-firmness.js";
import { readAuthoredEntity } from "../../src/public/operations/entity-context.js";
import { readKbManifest } from "../../src/utils/kb-manifest.js";

// implements REQ-kb-decision-firmness, REQ-kb-decision-firmness-from-origin

const WHY =
  "## Why this changed\n\nThe load test in TEST-export-load showed the nightly batch misses its window, which the old decision never measured.\n";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-firmness-"));
  roots.push(root);
  for (const [relative, content] of Object.entries(files)) {
    const absolute = path.join(root, relative);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, content);
  }
  return root;
}

function decision(
  type: "req" | "adr",
  id: string,
  frontmatter: string,
  body = "Body.\n",
): NonNullable<ReturnType<typeof readAuthoredEntity>> {
  const parsed = readAuthoredEntity(
    `---\nid: ${id}\ntitle: ${id} title\ntype: ${type}\n${frontmatter}---\n\n${body}`,
    `.kb/${type === "req" ? "requirements" : "adr"}/${id}.md`,
  );
  if (parsed === null) throw new Error("fixture did not parse");
  return parsed;
}

function edges(...pairs: [string, string][]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const [from, to] of pairs)
    map.set(from, new Set([...(map.get(from) ?? []), to]));
  return map;
}

describe("firmness helpers", () => {
  test("absent firmness follows the origin, only on requirements and ADRs", () => {
    expect(effectiveFirmness("req", undefined, { kind: "agent" })).toBe(
      "default",
    );
    expect(effectiveFirmness("req", undefined, { kind: "import" })).toBe(
      "firm",
    );
    expect(effectiveFirmness("adr", undefined, { kind: "human" })).toBe("firm");
    expect(effectiveFirmness("req", undefined, { kind: "migration" })).toBe(
      "firm",
    );
    expect(effectiveFirmness("req", undefined)).toBe("firm");
    expect(effectiveFirmness("adr", "firm")).toBe("firm");
    expect(effectiveFirmness("adr", "exploratory")).toBe("exploratory");
    expect(effectiveFirmness("req", "default", { kind: "human" })).toBe(
      "default",
    );
    expect(effectiveFirmness("req", "bogus", { kind: "agent" })).toBe(
      "default",
    );
    expect(effectiveFirmness("scenario", "firm")).toBeUndefined();
  });

  test("a firm decision's ref is origin.ref, or approval_ref on a requirement", () => {
    expect(firmnessRef({ type: "adr", origin: { kind: "human" } })).toBe(
      undefined,
    );
    expect(
      firmnessRef({ type: "adr", origin: { kind: "human", ref: "PR#12" } }),
    ).toBe("PR#12");
    expect(firmnessRef({ type: "req", approval_ref: "TICKET-4" })).toBe(
      "TICKET-4",
    );
    expect(firmnessRef({ type: "adr", approval_ref: "TICKET-4" })).toBe(
      undefined,
    );
  });

  test("counts prose under Why this changed, nested headings included", () => {
    expect(whyThisChangedWords("No section here.\n")).toBe(0);
    expect(whyThisChangedWords("## Why this changed\n\nToo short.\n")).toBe(2);
    expect(
      whyThisChangedWords(
        "## Why this changed\n\nOne two three.\n\n### Evidence\n\nfour five.\n\n## Decision\n\nsix seven eight.\n",
      ),
    ).toBe(5);
  });
});

describe("decision firmness rules", () => {
  test("a firm decision needs a ref to human words", () => {
    const findings = evaluateDecisionFirmness(
      [
        decision(
          "adr",
          "ADR-firm-bare",
          "firmness: firm\norigin:\n  kind: agent\n",
        ),
        decision(
          "adr",
          "ADR-firm-ok",
          "firmness: firm\norigin:\n  kind: human\n  ref: review-comment-9\n",
        ),
        decision(
          "req",
          "REQ-firm-approved",
          "firmness: firm\napproval_ref: TICKET-4\n",
        ),
        decision("req", "REQ-default", ""),
      ],
      new Map(),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      rule: DECISION_FIRM_UNREFERENCED_RULE,
      entityId: "ADR-firm-bare",
      source: ".kb/adr/ADR-firm-bare.md",
    });
    expect(findings[0]?.suggestion).toContain("firmness: default");
  });

  test("only a firm decision may supersede a firm one", () => {
    const firmOld = decision(
      "adr",
      "ADR-old",
      "firmness: firm\norigin:\n  kind: human\n  ref: chat-1\n",
    );
    const findings = evaluateDecisionFirmness(
      [
        firmOld,
        decision(
          "adr",
          "ADR-agent-new",
          "origin:\n  kind: agent\n",
          `New.\n\n${WHY}`,
        ),
      ],
      edges(["ADR-agent-new", "ADR-old"]),
    );
    expect(findings.map((finding) => finding.rule)).toEqual([
      DECISION_FIRM_SUPERSEDED_RULE,
    ]);
    expect(findings[0]?.evidence).toEqual({
      firmness: "default",
      firmTargets: ["ADR-old"],
    });
    expect(
      evaluateDecisionFirmness(
        [
          firmOld,
          decision(
            "adr",
            "ADR-human-new",
            "firmness: firm\norigin:\n  kind: human\n  ref: chat-2\n",
            `New.\n\n${WHY}`,
          ),
        ],
        edges(["ADR-human-new", "ADR-old"]),
      ),
    ).toEqual([]);
  });

  test("a supersede must explain why unless the migration acknowledged it", () => {
    const entities = [
      decision("req", "REQ-old", ""),
      decision("req", "REQ-new", "", "New statement.\n"),
      decision("adr", "ADR-old", ""),
      decision("adr", "ADR-legacy", "", "Legacy.\n"),
      decision("req", "REQ-explained", "", `Statement.\n\n${WHY}`),
      decision("req", "REQ-older", ""),
    ];
    const findings = evaluateDecisionFirmness(
      entities,
      edges(
        ["REQ-new", "REQ-old"],
        ["ADR-legacy", "ADR-old"],
        ["REQ-explained", "REQ-older"],
      ),
      undefined,
      new Set(["ADR-legacy -> ADR-old"]),
    );
    expect(findings.map((finding) => [finding.rule, finding.entityId])).toEqual(
      [
        [SUPERSEDES_REASON_MISSING_RULE, "REQ-new"],
        [SUPERSEDES_REASON_ACKNOWLEDGED_RULE, "workspace"],
      ],
    );
    expect(findings[0]?.suggestion).toContain("## Why this changed");
    expect(findings[1]?.evidence).toEqual({ total: 1, ids: ["ADR-legacy"] });
  });

  test("an explanation under 12 words, or under another heading, does not count", () => {
    const twelve =
      "The nightly batch missed its window twice, so the old limit failed.";
    const eleven =
      "The nightly batch missed its window twice, so the limit failed.";
    const findings = evaluateDecisionFirmness(
      [
        decision("req", "REQ-a", ""),
        decision("req", "REQ-b", ""),
        decision("req", "REQ-c", ""),
        decision(
          "req",
          "REQ-short",
          "",
          `Short.\n\n## Why this changed\n\n${eleven}\n`,
        ),
        decision(
          "req",
          "REQ-enough",
          "",
          `Enough.\n\n## Why this changed\n\n${twelve}\n`,
        ),
        decision(
          "req",
          "REQ-elsewhere",
          "",
          `Elsewhere.\n\n## Rationale\n\n${twelve}\n`,
        ),
      ],
      edges(
        ["REQ-short", "REQ-a"],
        ["REQ-enough", "REQ-b"],
        ["REQ-elsewhere", "REQ-c"],
      ),
    );
    expect(whyThisChangedWords(`## Why this changed\n\n${eleven}\n`)).toBe(11);
    expect(whyThisChangedWords(`## Why this changed\n\n${twelve}\n`)).toBe(12);
    expect(findings.map((finding) => [finding.rule, finding.entityId])).toEqual(
      [
        [SUPERSEDES_REASON_MISSING_RULE, "REQ-elsewhere"],
        [SUPERSEDES_REASON_MISSING_RULE, "REQ-short"],
      ],
    );
  });

  test("an acknowledgement covers only the edges it lists", () => {
    const findings = evaluateDecisionFirmness(
      [
        decision("adr", "ADR-old", ""),
        decision("adr", "ADR-other", ""),
        decision("adr", "ADR-legacy", "", "Legacy.\n"),
      ],
      edges(["ADR-legacy", "ADR-old"], ["ADR-legacy", "ADR-other"]),
      new Set([SUPERSEDES_REASON_MISSING_RULE]),
      new Set(["ADR-legacy -> ADR-old"]),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]?.evidence).toEqual({
      type: "adr",
      supersedes: ["ADR-other"],
    });
  });

  test("a superseded or retired replacement needs no reason", () => {
    expect(
      evaluateDecisionFirmness(
        [
          decision("req", "REQ-a", ""),
          decision("req", "REQ-b", ""),
          decision("req", "REQ-c", "", `C.\n\n${WHY}`),
          decision("adr", "ADR-gone", "status: deprecated\n"),
          decision("adr", "ADR-x", ""),
        ],
        edges(["REQ-b", "REQ-a"], ["REQ-c", "REQ-b"], ["ADR-gone", "ADR-x"]),
      ),
    ).toEqual([]);
  });

  test("a person's or imported rule without firmness is firm, and only explicit firm needs a ref", () => {
    const rules = [
      decision("req", "REQ-imported", "origin:\n  kind: import\n"),
      decision("adr", "ADR-legacy", "origin:\n  kind: migration\n"),
      decision("req", "REQ-hand", ""),
      decision("req", "REQ-agent-old", "origin:\n  kind: agent\n"),
    ];
    const replacements = [
      decision("req", "REQ-a", "origin:\n  kind: agent\n", `A.\n\n${WHY}`),
      decision("adr", "ADR-b", "origin:\n  kind: agent\n", `B.\n\n${WHY}`),
      decision("req", "REQ-c", "origin:\n  kind: agent\n", `C.\n\n${WHY}`),
      decision("req", "REQ-d", "origin:\n  kind: agent\n", `D.\n\n${WHY}`),
    ];
    const supersedes = edges(
      ["REQ-a", "REQ-imported"],
      ["ADR-b", "ADR-legacy"],
      ["REQ-c", "REQ-hand"],
      ["REQ-d", "REQ-agent-old"],
    );
    const findings = evaluateDecisionFirmness(
      [...rules, ...replacements],
      supersedes,
      undefined,
      undefined,
      { schemaVersion: 10 },
    );
    expect(findings.map((finding) => [finding.rule, finding.entityId])).toEqual(
      [
        [DECISION_FIRM_SUPERSEDED_RULE, "ADR-b"],
        [DECISION_FIRM_SUPERSEDED_RULE, "REQ-a"],
        [DECISION_FIRM_SUPERSEDED_RULE, "REQ-c"],
      ],
    );
    expect(findings[0]?.suggestion).not.toContain("schema 10");
    // Edges the schema 10 migration recorded no longer block, others do.
    expect(
      evaluateDecisionFirmness(
        [...rules, ...replacements],
        supersedes,
        undefined,
        undefined,
        {
          schemaVersion: 10,
          firmSupersedeAcknowledged: new Set([
            "ADR-b -> ADR-legacy",
            "REQ-a -> REQ-imported",
          ]),
        },
      ).map((finding) => finding.entityId),
    ).toEqual(["REQ-c"]);
    // Before the upgrade the finding says the migration acknowledges it.
    expect(
      evaluateDecisionFirmness(
        [...rules, ...replacements],
        supersedes,
        undefined,
        undefined,
        {
          schemaVersion: 9,
        },
      )[0]?.suggestion,
    ).toContain("kibi migrate --yes");
  });

  test("an acknowledgement never covers an explicitly firm decision", () => {
    expect(
      evaluateDecisionFirmness(
        [
          decision(
            "adr",
            "ADR-firm",
            "firmness: firm\norigin:\n  kind: human\n  ref: ticket-1\n",
          ),
          decision(
            "adr",
            "ADR-new",
            "origin:\n  kind: agent\n",
            `New.\n\n${WHY}`,
          ),
        ],
        edges(["ADR-new", "ADR-firm"]),
        undefined,
        undefined,
        { firmSupersedeAcknowledged: new Set(["ADR-new -> ADR-firm"]) },
      ).map((finding) => finding.entityId),
    ).toEqual(["ADR-new"]);
  });

  test("superseding the non-firm replacement does not clear a firm decision", () => {
    const findings = evaluateDecisionFirmness(
      [
        decision(
          "adr",
          "ADR-firm",
          "firmness: firm\norigin:\n  kind: human\n  ref: ticket-1\n",
        ),
        decision("adr", "ADR-d", "origin:\n  kind: agent\n", `D.\n\n${WHY}`),
        decision("adr", "ADR-e", "origin:\n  kind: agent\n", `E.\n\n${WHY}`),
      ],
      edges(["ADR-d", "ADR-firm"], ["ADR-e", "ADR-d"]),
    );
    expect(findings.map((finding) => [finding.rule, finding.entityId])).toEqual(
      [[DECISION_FIRM_SUPERSEDED_RULE, "ADR-d"]],
    );
  });

  test("reads links, shards and the manifest from the workspace", () => {
    const root = workspace({
      ".kb/requirements/REQ-old.md":
        "---\nid: REQ-old\ntitle: Old\n---\nOld.\n",
      ".kb/requirements/REQ-new.md":
        "---\nid: REQ-new\ntitle: New\nlinks:\n  - type: supersedes\n    target: REQ-old\n---\nNew.\n",
      ".kb/adr/ADR-a.md": "---\nid: ADR-a\ntitle: A\n---\nA.\n",
      ".kb/adr/ADR-b.md": "---\nid: ADR-b\ntitle: B\n---\nB.\n",
      ".kb/relationships/11.yaml":
        'relationships:\n  - id: rel-adr-b\n    type: supersedes\n    from: ADR-b\n    to: ADR-a\n    created_at: "2026-10-12T00:00:00Z"\n    created_by: test\n    source: test\n',
      ".kb/manifest.json": JSON.stringify({
        manifestVersion: 1,
        schemaVersion: 8,
        semanticAdvisorBackfill: "not_applicable",
      }),
    });
    expect(
      collectDecisionFirmnessViolations(
        new Set([SUPERSEDES_REASON_MISSING_RULE]),
        root,
      ).map((finding) => finding.entityId),
    ).toEqual(["ADR-b", "REQ-new"]);
    expect(collectDecisionFirmnessViolations(new Set(["other"]), root)).toEqual(
      [],
    );
  });

  test("a KB older than schema 9 is told the schema upgrade acknowledges its supersedes", () => {
    const files = {
      ".kb/requirements/REQ-old.md":
        "---\nid: REQ-old\ntitle: Old\n---\nOld.\n",
      ".kb/requirements/REQ-new.md":
        "---\nid: REQ-new\ntitle: New\nlinks:\n  - type: supersedes\n    target: REQ-old\n---\nNew.\n",
    };
    const manifest = (schemaVersion: number) =>
      JSON.stringify({
        manifestVersion: 1,
        schemaVersion,
        semanticAdvisorBackfill: "not_applicable",
      });
    const suggestionAt = (schemaVersion: number) =>
      collectDecisionFirmnessViolations(
        new Set([SUPERSEDES_REASON_MISSING_RULE]),
        workspace({ ...files, ".kb/manifest.json": manifest(schemaVersion) }),
      )[0]?.suggestion ?? "";
    const legacy = suggestionAt(8);
    expect(legacy).toContain("## Why this changed");
    expect(legacy).toContain(
      "Supersedes recorded before schema 9 are acknowledged by the plan's schema-config-upgrade (kibi migrate --yes); add the reason only when you next touch the requirement.",
    );
    const current = suggestionAt(9);
    expect(current).toContain("## Why this changed");
    expect(current).not.toContain("schema-config-upgrade");
  });

  test("a shard edge from a deleted entity does not hide a firm decision", () => {
    const root = workspace({
      ".kb/requirements/REQ-firm.md":
        "---\nid: REQ-firm\ntitle: Firm\nfirmness: firm\n---\nFirm.\n",
      ".kb/relationships/22.yaml":
        'relationships:\n  - id: rel-gone\n    type: supersedes\n    from: REQ-gone\n    to: REQ-firm\n    created_at: "2026-10-12T00:00:00Z"\n    created_by: test\n    source: test\n',
    });
    expect(
      collectDecisionFirmnessViolations(
        new Set([DECISION_FIRM_UNREFERENCED_RULE]),
        root,
      ).map((finding) => finding.entityId),
    ).toEqual(["REQ-firm"]);
  });
});

describe("schema 9 migration", () => {
  const files = {
    ".kb/requirements/REQ-old.md": "---\nid: REQ-old\ntitle: Old\n---\nOld.\n",
    ".kb/requirements/REQ-new.md":
      "---\nid: REQ-new\ntitle: New\nlinks:\n  - type: supersedes\n    target: REQ-old\n---\nNew.\n",
    ".kb/manifest.json": JSON.stringify({
      manifestVersion: 1,
      schemaVersion: 8,
      semanticAdvisorBackfill: "not_applicable",
    }),
  };

  test("acknowledges existing supersedes in the manifest only", async () => {
    const root = workspace(files);
    expect(planSupersedesReasonAcknowledgement(root)).toEqual([
      {
        id: "REQ-new",
        type: "req",
        path: ".kb/requirements/REQ-new.md",
        edges: ["REQ-new -> REQ-old"],
      },
    ]);
    const fragment = buildSchema6MigrationFragment({
      workspaceRoot: root,
      currentSchemaVersion: 8,
    });
    const action = fragment.actions.find(
      (candidate) => candidate.id === "supersedes-reason-acknowledge",
    );
    expect(action).toMatchObject({
      safety: "automatic",
      affectedEntityIds: ["REQ-new"],
      affectedFiles: [".kb/manifest.json"],
    });
    expect(fragment.sourceRewriteActionIds).toContain(
      "supersedes-reason-acknowledge",
    );
    expect(
      buildSchema6MigrationFragment({
        workspaceRoot: root,
        currentSchemaVersion: 9,
      }).actions.map((candidate) => candidate.id),
    ).not.toContain("supersedes-reason-acknowledge");
    if (action === undefined) throw new Error("no action");
    await applySchema6MigrationAction(action, {
      workspaceRoot: root,
      clock: () => new Date("2026-10-12T00:00:00Z"),
    });
    expect(readKbManifest(root)?.supersedesReasonAcknowledged).toEqual([
      "REQ-new -> REQ-old",
    ]);
    expect(planSupersedesReasonAcknowledgement(root)).toEqual([]);
    expect(applySupersedesReasonAcknowledgement(root)).toBe(0);
    expect(
      collectDecisionFirmnessViolations(
        new Set([SUPERSEDES_REASON_MISSING_RULE]),
        root,
      ),
    ).toEqual([]);
  });

  test("acknowledges retired supersedes too, and needs a manifest", () => {
    const root = workspace({
      ".kb/requirements/REQ-a.md": "---\nid: REQ-a\ntitle: A\n---\nA.\n",
      ".kb/requirements/REQ-b.md":
        "---\nid: REQ-b\ntitle: B\nlinks:\n  - type: supersedes\n    target: REQ-a\n---\nB.\n",
      ".kb/requirements/REQ-c.md":
        "---\nid: REQ-c\ntitle: C\nlinks:\n  - type: supersedes\n    target: REQ-b\n---\nC.\n",
    });
    expect(
      planSupersedesReasonAcknowledgement(root).map((target) => target.id),
    ).toEqual(["REQ-b", "REQ-c"]);
    expect(() => applySupersedesReasonAcknowledgement(root)).toThrow(
      "kibi migrate --yes",
    );
  });
});

describe("schema 10 migration", () => {
  const files = {
    ".kb/requirements/REQ-legacy.md":
      "---\nid: REQ-legacy\ntitle: Legacy\norigin:\n  kind: migration\n---\nLegacy.\n",
    ".kb/requirements/REQ-agent-new.md":
      "---\nid: REQ-agent-new\ntitle: New\norigin:\n  kind: agent\nlinks:\n  - type: supersedes\n    target: REQ-legacy\n---\nNew.\n",
    ".kb/requirements/REQ-agent-old.md":
      "---\nid: REQ-agent-old\ntitle: Agent old\norigin:\n  kind: agent\n---\nOld.\n",
    ".kb/requirements/REQ-agent-next.md":
      "---\nid: REQ-agent-next\ntitle: Agent next\norigin:\n  kind: agent\nlinks:\n  - type: supersedes\n    target: REQ-agent-old\n---\nNext.\n",
    ".kb/manifest.json": JSON.stringify({
      manifestVersion: 1,
      schemaVersion: 9,
      semanticAdvisorBackfill: "not_applicable",
    }),
  };

  test("acknowledges supersedes of decisions that become firm, in the manifest only", async () => {
    const root = workspace(files);
    expect(planFirmSupersedeAcknowledgement(root)).toEqual([
      "REQ-agent-new -> REQ-legacy",
    ]);
    expect(
      collectDecisionFirmnessViolations(
        new Set([DECISION_FIRM_SUPERSEDED_RULE]),
        root,
      ).map((finding) => finding.entityId),
    ).toEqual(["REQ-agent-new"]);
    const fragment = buildSchema6MigrationFragment({
      workspaceRoot: root,
      currentSchemaVersion: 9,
    });
    const action = fragment.actions.find(
      (candidate) => candidate.id === "firm-supersede-acknowledge",
    );
    expect(action).toMatchObject({
      safety: "automatic",
      affectedEntityIds: ["REQ-agent-new"],
      affectedFiles: [".kb/manifest.json"],
    });
    expect(fragment.sourceRewriteActionIds).toContain(
      "firm-supersede-acknowledge",
    );
    expect(
      buildSchema6MigrationFragment({
        workspaceRoot: root,
        currentSchemaVersion: 10,
      }).actions.map((candidate) => candidate.id),
    ).not.toContain("firm-supersede-acknowledge");
    if (action === undefined) throw new Error("no action");
    await applySchema6MigrationAction(action, {
      workspaceRoot: root,
      clock: () => new Date("2026-10-13T00:00:00Z"),
    });
    expect(readKbManifest(root)?.firmSupersedeAcknowledged).toEqual([
      "REQ-agent-new -> REQ-legacy",
    ]);
    expect(planFirmSupersedeAcknowledgement(root)).toEqual([]);
    expect(applyFirmSupersedeAcknowledgement(root)).toBe(0);
    expect(
      collectDecisionFirmnessViolations(
        new Set([DECISION_FIRM_SUPERSEDED_RULE]),
        root,
      ),
    ).toEqual([]);
  });

  test("needs a manifest to record the acknowledgement", () => {
    const { ".kb/manifest.json": _manifest, ...sources } = files;
    expect(() => applyFirmSupersedeAcknowledgement(workspace(sources))).toThrow(
      "kibi migrate --yes",
    );
  });
});

describe("bootstrap records imported rules as firm", () => {
  const reqStep = (steps: readonly Readonly<Record<string, unknown>>[]) =>
    steps.find((step) => step.type === "req") as
      | { properties: Record<string, unknown> }
      | undefined;

  test("a cited intent claim is an import with firmness firm and its reference", () => {
    const result = buildIntentClaimCandidates(
      normalizeBootstrapContext({
        knowledgeSources: [
          {
            id: "spec",
            title: "Recorder spec",
            locator: "docs/recorder.md",
            kind: "specification",
            authority: "authoritative",
            component: "recorder",
          },
        ],
        intentClaims: [
          {
            sourceId: "spec",
            reference: "REC-1",
            statement: "Beginning to record while idle must start a new take.",
            excerpt: "Beginning to record while idle must start a new take.",
          },
        ],
      }),
      new Set(),
      0.5,
    );
    const req = reqStep(result.candidates[0]?.applyPlan ?? []);
    expect(req?.properties.origin).toEqual({
      kind: "import",
      ref: "spec:REC-1",
    });
    expect(req?.properties.firmness).toBe("firm");
    expect(() => validateBootstrapPayload(req ?? {}, new Date())).not.toThrow();
  });

  test("a normative markdown line is an import with firmness firm and its line", () => {
    const built = markdownCandidates(
      {
        provider: "markdown",
        kind: "generic_markdown",
        label: "docs/inbox.md",
        relativePath: "docs/inbox.md",
        content: "# Requirements\n\n- Inbox must update in real time.\n",
        data: {},
      } as never,
      new Set(),
      0.5,
      new SubjectKeyRegistry(),
    );
    const req = reqStep(built.candidates[0]?.applyPlan ?? []);
    expect(req?.properties.origin).toEqual({
      kind: "import",
      ref: "docs/inbox.md#L3",
    });
    expect(req?.properties.firmness).toBe("firm");
  });
});

describe("firmness in authored front matter", () => {
  test("requirements and ADRs carry firmness; other types reject it", () => {
    const adr = extractFromMarkdownString(
      "---\nid: ADR-f\ntitle: F\ntype: adr\nstatus: accepted\nfirmness: exploratory\n---\n",
      "/tmp/adr/ADR-f.md",
    );
    expect(adr.entity.firmness).toBe("exploratory");
    const req = extractFromMarkdownString(
      "---\nid: REQ-f\ntitle: F\ntype: req\n---\nF must hold.\n",
      "/tmp/requirements/REQ-f.md",
    );
    expect(req.entity.firmness).toBeUndefined();
    expect(() =>
      extractFromMarkdownString(
        "---\nid: REQ-f\ntitle: F\ntype: req\nfirmness: strong\n---\n",
        "/tmp/requirements/REQ-f.md",
      ),
    ).toThrow(FrontmatterError);
    expect(() =>
      extractFromMarkdownString(
        "---\nid: SCEN-f\ntitle: F\ntype: scenario\nfirmness: firm\n---\n",
        "/tmp/scenarios/SCEN-f.md",
      ),
    ).toThrow(FrontmatterError);
  });

  test("kb_upsert names firmness as the field a fact cannot carry", () => {
    expect(() =>
      validateUpsertInput(
        {
          type: "fact",
          id: "FACT-firm-observation",
          properties: {
            title: "A firm observation",
            fact_kind: "observation",
            firmness: "firm",
          },
        },
        new Date("2026-10-12T00:00:00Z"),
      ),
    ).toThrow(
      "Entity validation failed: firmness is only valid on req and adr entities; remove it from this fact",
    );
  });
});
