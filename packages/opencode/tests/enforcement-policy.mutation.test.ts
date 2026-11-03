import { describe, expect, test } from "bun:test";
import {
  type EnforcementPolicyInput,
  computeEnforcementPolicy,
} from "../src/enforcement-policy";
import type { PathKind } from "../src/path-kind";

type Lifecycle = "created" | "edited" | "deleted";

function policy(
  events: Array<[string, Lifecycle]>,
  extra: Partial<EnforcementPolicyInput> = {},
) {
  return computeEnforcementPolicy({
    effectiveMode: "advisory",
    lifecycleEvents: events.map(([normalizedPath, lifecycle]) => ({
      normalizedPath,
      lifecycle,
    })),
    pathKinds: [],
    ...extra,
  });
}

const signal = (level: "exact" | "heuristic", evidence: string[]) => ({
  level,
  evidence,
  reminderText: `e2e ${level}`,
});

describe("advisory relevance", () => {
  test.each([
    "code",
    "requirement",
    "scenario",
    "test",
    "adr",
    "fact",
    "flag",
    "event",
    "symbol",
    "kb",
  ] as PathKind[])("an edited %s file is relevant", (kind) => {
    expect(
      policy([["a", "edited"]], { pathKinds: [kind] }).dirtyFileCount,
    ).toBe(1);
  });

  test("edited unknown files and created non-code files are not", () => {
    expect(policy([["a", "edited"]]).kind).toBe("checkpoint_passed");
    expect(
      policy([["a", "created"]], { pathKinds: ["requirement"] }).kind,
    ).toBe("checkpoint_passed");
  });

  test("a deleted file of any kind is relevant", () => {
    expect(policy([["a", "deleted"]]).text).toBe(
      "- Deleted file had no linked Kibi entities. Update Kibi if this removal changes documented behavior or traceability.",
    );
  });

  test("an edited source file asks for an impact check", () => {
    expect(policy([["src/a.ts", "edited"]], { pathKinds: ["code"] }).text).toBe(
      [
        '- Edited source file detected. Run `kb_check({sourceFiles:["src/a.ts"], includeImpactDiagnostics:true, includeWorkingTreeDiff:true})` while the edit context is fresh.',
        "  Use the impact diagnostics to review symbol granularity, requirement ownership, and semantic review of linked requirements/tests before completing this task.",
      ].join("\n"),
    );
  });
});

describe("authority without a context", () => {
  test("no posture counts as authoritative; a partial root does not", () => {
    expect(policy([["a", "deleted"]]).kind).toBe("advisory_guidance");
    expect(policy([["a", "deleted"]], { posture: "root_partial" }).kind).toBe(
      "skip_non_authoritative",
    );
    expect(
      policy([["a", "deleted"]], { posture: "hybrid_root_plus_vendored" }).kind,
    ).toBe("advisory_guidance");
  });
});

describe("reminder kinds", () => {
  test("each kind is marked once; e2e kinds need a reminder", () => {
    expect(
      policy(
        [
          ["a", "edited"],
          ["b", "edited"],
          ["c", "deleted"],
          ["d", "deleted"],
        ],
        {
          pathKinds: ["code", "code", "code", "code"],
          e2eSignals: [
            signal("exact", []),
            signal("heuristic", []),
            signal("exact", []),
            { level: "none", evidence: [], reminderText: "ignored" },
          ],
        },
      ).reminderKindsToMark,
    ).toEqual(["kibi_write", "e2e_write", "kibi_delete", "e2e_delete"]);
    expect(
      policy([["a", "edited"]], {
        pathKinds: ["code"],
        e2eSignals: [{ level: "exact", evidence: [], reminderText: null }],
      }).reminderKindsToMark,
    ).toEqual(["kibi_write"]);
  });
});

describe("hard block text", () => {
  test("a single file without links or evidence", () => {
    expect(
      policy([["src/a.ts", "edited"]], {
        effectiveMode: "hard",
        pathKinds: ["code"],
      }).text,
    ).toBe(
      [
        "🛑 **Hard Kibi checkpoint required**",
        "Changed relevant files require Kibi verification before continuing:",
        "- `src/a.ts` (edited, code)",
        "- Inspect typed Kibi status `nextActions` and route to the canonical kibi-usage, kibi-freshness, or kibi-traceability skill.",
        "- Use the host-visible approved Kibi peer surface; if it is unavailable, report the blocked capability.",
        "- Never read or edit `.kb/` files directly.",
        "- Preserve source-linked evidence for `src/a.ts` through the typed traceability workflow.",
        "- Use the canonical traceability workflow when relationships or source-linked facts need updates.",
        "- Follow typed check/status next actions before completing the task; unresolved or blocked state is not completion.",
      ].join("\n"),
    );
  });

  test("many files with links, evidence and an unlinked deletion", () => {
    const result = policy(
      [
        ["a", "created"],
        ["b", "deleted"],
        ["c", "deleted"],
        ["d", "edited"],
        ["e", "edited"],
        ["f", "edited"],
      ],
      {
        effectiveMode: "hard",
        pathKinds: ["code", "code"],
        linkedEntityResults: [
          { ids: ["REQ-1", "REQ-2"], source: "symbols" },
          { ids: ["REQ-2"], source: "doc-path" },
        ],
        linkedEntityIds: [[], [], [], ["REQ-3"]],
        e2eSignals: [
          signal("exact", ["t1", "t2"]),
          signal("heuristic", ["t2"]),
        ],
      },
    );
    expect(result.kind).toBe("hard_block");
    expect(result).toMatchObject({ remainingCount: 1 });
    expect(result.text).toBe(
      [
        "🛑 **Hard Kibi checkpoint required**",
        "Changed relevant files require Kibi verification before continuing:",
        "- `a` (created, code; linked: REQ-1, REQ-2)",
        "- `b` (deleted, code; linked: REQ-2)",
        "- `c` (deleted, unknown)",
        "- `d` (edited, unknown; linked: REQ-3)",
        "- `e` (edited, unknown)",
        "- +1 more dirty files",
        "Linked IDs detected: REQ-1, REQ-2, REQ-3.",
        "Existing e2e evidence: t1, t2.",
        "- Inspect typed Kibi status `nextActions` and route to the canonical kibi-usage, kibi-freshness, or kibi-traceability skill.",
        "- Use the host-visible approved Kibi peer surface; if it is unavailable, report the blocked capability.",
        "- Never read or edit `.kb/` files directly.",
        "- Preserve source-linked evidence for `a` through the typed traceability workflow.",
        "- Deleted paths without linked IDs still require a source-linked traceability review before cleanup.",
        "- Follow typed check/status next actions before completing the task; unresolved or blocked state is not completion.",
      ].join("\n"),
    );
  });

  test("a linked deletion and an unlinked edit need no cleanup review", () => {
    const text = policy(
      [
        ["a", "deleted"],
        ["b", "edited"],
      ],
      {
        effectiveMode: "hard",
        linkedEntityIds: [["REQ-1"]],
      },
    ).text;
    expect(text).toContain(
      "- Use the canonical traceability workflow when relationships or source-linked facts need updates.",
    );
  });
});
