import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { CommentAnalysisResult } from "../src/comment-analysis";
import type { CacheKey, GuidanceCache } from "../src/guidance-cache";
import {
  MAX_BULLETS,
  type PromptContext,
  SENTINEL,
  buildPrompt,
  enforceBudget,
  hasOverlappingEntityIds,
  insertBulletAfterHeader,
} from "../src/prompt";

const supported = { supported: true as const, pluginVersion: "1.0.0" };

function prompt(context: PromptContext): string {
  return buildPrompt(context, supported);
}

function words(count: number, word = "w"): string {
  return Array.from({ length: count }, () => word).join(" ");
}

function headerOf(text: string): string {
  return text.split("\n")[2] ?? "";
}

const suggestion: CommentAnalysisResult = {
  filePath: "src/a.ts",
  suggestionType: "fact",
  confidence: "high",
  reasoning: "r",
  fingerprint: "f",
  sourceKind: "block-comment",
};

describe("enforceBudget", () => {
  test("a block within budget is returned unchanged", () => {
    expect(enforceBudget("h\n- a\n- b\ntail", 2)).toBe("h\n- a\n- b\ntail");
    expect(enforceBudget("h\nx\ny", 1)).toBe("h\nx\ny");
  });

  test("extra bullets and the lines after the first bullet are dropped", () => {
    expect(enforceBudget("h\nsub\n- a\n- b\n- c\ntail\nmore", 2)).toBe(
      "h\nsub\n- a\n- b",
    );
  });

  test("a zero bullet budget keeps only the header", () => {
    expect(enforceBudget("h\n- a", 0)).toBe("h");
  });

  test("non-bullet lines before any kept bullet stay in the header", () => {
    expect(enforceBudget("h\n- a\ntail", 0)).toBe("h\ntail");
  });

  test("exactly the word budget is kept, including trailing whitespace", () => {
    const block = `${words(117)}\n`;
    expect(enforceBudget(block, 5)).toBe(block);
    const doubled = `w  ${words(116)}`;
    expect(enforceBudget(doubled, 5)).toBe(doubled);
    const mixed = `${words(114)}\n- a\ntail`;
    expect(enforceBudget(mixed, 5)).toBe(mixed);
  });

  test("over the word budget the bullet trim is used when it fits", () => {
    const header = words(115);
    expect(enforceBudget(`${header}\n- a\ntail`, 5)).toBe(`${header}\n- a`);
  });

  test("otherwise the block is cut to the word budget", () => {
    expect(enforceBudget(`w  ${words(119)}`, 5)).toBe(words(117));
  });
});

describe("insertBulletAfterHeader", () => {
  test.each([
    ["h", "h\n- b"],
    ["h\nr", "h\n- b\nr"],
    ["h\nr\ns", "h\n- b\nr\ns"],
  ])("%p", (block, expected) => {
    expect(insertBulletAfterHeader(block, "- b")).toBe(expected);
  });
});

describe("hasOverlappingEntityIds", () => {
  test.each([
    [null, "Kibi entities: REQ-a", false],
    ["REQ-a REQ-b", "REQ-b REQ-c", true],
    ["REQ-a", "REQ-c", false],
    ["REQ-a", "no ids here", false],
    ["", "REQ-a", false],
  ] as const)("%p and %p: %p", (textA, textB, expected) => {
    expect(hasOverlappingEntityIds(textA, textB)).toBe(expected);
  });
});

describe("base guidance", () => {
  test("names the native command when the host supports it", () => {
    const text = buildPrompt(undefined, supported);
    expect(text.startsWith(SENTINEL)).toBe(true);
    expect(text.endsWith("apply, and repair semantics.")).toBe(true);
    expect(
      buildPrompt(undefined, { supported: false, reason: "no hooks" }).endsWith(
        "use `/kibi:kibi-bootstrap:mcp` to route to the canonical `kibi-bootstrap` skill.",
      ),
    ).toBe(true);
  });
});

describe("hard gate", () => {
  const tail =
    "Inspect typed Kibi status `nextActions`, then route to the canonical kibi-usage, kibi-freshness, or kibi-traceability skill. Use the host-visible approved peer surface and never read or edit `.kb` directly.";

  test("without a reason or more files", () => {
    expect(
      prompt({
        recentEdits: [],
        hardGateBlock: { shownPaths: ["a.ts"], remainingCount: 0 },
      }),
    ).toBe(
      [
        SENTINEL,
        "",
        "🛑 Kibi hard gate blocked",
        "STOP implementation until this authoritative Kibi checkpoint is satisfied.",
        "Affected files:",
        "- `a.ts`",
        tail,
      ].join("\n"),
    );
  });

  test("with a reason and more files", () => {
    expect(
      prompt({
        recentEdits: [],
        hardGateBlock: {
          shownPaths: ["a.ts", "b.ts"],
          remainingCount: 2,
          reason: "stale",
        },
      }),
    ).toBe(
      [
        SENTINEL,
        "",
        "🛑 Kibi hard gate blocked",
        "STOP implementation until this authoritative Kibi checkpoint is satisfied.",
        "Reason: stale.",
        "Affected files:",
        "- `a.ts`",
        "- `b.ts`",
        "- +2 more dirty files",
        tail,
      ].join("\n"),
    );
  });
});

describe("posture and degraded advisory", () => {
  const degraded = {
    showDegradedAdvisory: true,
    maintenanceDegraded: true,
    degradedMode: "warn-once" as const,
  };
  const advisory =
    "⚠️  **Maintenance degraded**\n\nThe Kibi workspace is in a maintenance-degraded state. Guidance remains advisory.";

  test("vendored only is the bare sentinel", () => {
    expect(
      prompt({
        recentEdits: [],
        posture: "vendored_only",
        riskClass: "behavior_candidate",
      }),
    ).toBe(SENTINEL);
  });

  test("the degraded advisory shows even when vendored", () => {
    expect(
      prompt({ recentEdits: [], posture: "vendored_only", ...degraded }),
    ).toBe(`${SENTINEL}\n\n${advisory}`);
  });

  test.each([
    [{ ...degraded, showDegradedAdvisory: false }],
    [{ ...degraded, maintenanceDegraded: false }],
    [{ ...degraded, degradedMode: "structured-only" as const }],
  ])("the advisory needs all three flags: %p", (flags) => {
    expect(
      prompt({ recentEdits: [], posture: "vendored_only", ...flags }),
    ).toBe(SENTINEL);
  });

  test("the advisory leads an existing block", () => {
    const plain = prompt({ recentEdits: [], riskClass: "kb_doc_structural" });
    expect(
      prompt({ recentEdits: [], riskClass: "kb_doc_structural", ...degraded }),
    ).toBe(plain.replace(`${SENTINEL}\n\n`, `${SENTINEL}\n\n${advisory}\n\n`));
  });

  test("bootstrap health only matters without a posture", () => {
    const needs = {
      needsBootstrap: true,
      missingConfig: false,
      missingDocDirs: [],
      hasKbEvidence: false,
    };
    expect(
      prompt({
        recentEdits: [],
        posture: "root_active",
        workspaceHealth: needs,
      }),
    ).toBe(SENTINEL);
    expect(
      prompt({
        recentEdits: [],
        workspaceHealth: { ...needs, needsBootstrap: false },
      }),
    ).toBe(SENTINEL);
    expect(prompt({ recentEdits: [] })).toBe(SENTINEL);
    expect(headerOf(prompt({ recentEdits: [], workspaceHealth: needs }))).toBe(
      "🔧 **Bootstrap required**",
    );
  });
});

describe("risk class and legacy selection", () => {
  test("only code risk classes use the comment suggestion", () => {
    expect(
      prompt({
        recentEdits: [],
        riskClass: "kb_doc_structural",
        recentCommentSuggestion: suggestion,
      }),
    ).toBe(prompt({ recentEdits: [], riskClass: "kb_doc_structural" }));
    expect(
      headerOf(
        prompt({
          recentEdits: [],
          riskClass: "traceability_candidate",
          recentCommentSuggestion: suggestion,
        }),
      ),
    ).toBe("🎯 **Durable knowledge detected: FACT**");
  });

  test.each([
    ["scenario"],
    ["test"],
    ["adr"],
    ["fact"],
    ["flag"],
    ["event"],
    ["symbol"],
  ] as const)("a %s edit gets the KB documentation block", (kind) => {
    expect(prompt({ recentEdits: [{ path: "x", kind }] })).toBe(
      prompt({ recentEdits: [], riskClass: "kb_doc_structural" }),
    );
  });

  test("a requirement edit gets the requirement block", () => {
    expect(prompt({ recentEdits: [{ path: "x", kind: "requirement" }] })).toBe(
      prompt({ recentEdits: [], riskClass: "req_policy_candidate" }),
    );
  });

  test.each([["kb"], ["unknown"]] as const)(
    "a %s edit gets no block",
    (kind) => {
      expect(prompt({ recentEdits: [{ path: "x", kind }] })).toBe(SENTINEL);
    },
  );

  test("a code edit with a suggestion uses it", () => {
    expect(
      prompt({
        recentEdits: [{ path: "x", kind: "code" }],
        recentCommentSuggestion: suggestion,
      }),
    ).toBe(
      prompt({
        recentEdits: [],
        riskClass: "behavior_candidate",
        recentCommentSuggestion: suggestion,
      }),
    );
  });
});

describe("guidance cache", () => {
  function stubCache(satisfied: boolean) {
    const checked: CacheKey[] = [];
    const recorded: Array<[CacheKey, string]> = [];
    const cache = {
      isSatisfied: (key: CacheKey) => {
        checked.push(key);
        return satisfied;
      },
      recordSatisfied: (key: CacheKey, type: string) => {
        recorded.push([key, type]);
      },
    } as unknown as GuidanceCache;
    return { cache, checked, recorded };
  }

  const base = {
    workspaceRoot: "/ws",
    branch: "main",
    posture: "root_active" as const,
    riskClass: "kb_doc_structural" as const,
  };

  test.each([
    ["no edits", { recentEdits: [] }, "unknown"],
    [
      "the last edit",
      {
        recentEdits: [
          { path: "a", kind: "code" as const },
          { path: "b", kind: "scenario" as const },
        ],
        focusEdit: null,
      },
      "scenario",
    ],
    [
      "the focus edit",
      {
        recentEdits: [{ path: "a", kind: "code" as const }],
        focusEdit: { path: "t", kind: "test" as const },
      },
      "test",
    ],
  ])("the file bucket comes from %s", (_name, edits, bucket) => {
    const { cache, checked, recorded } = stubCache(false);
    prompt({ ...base, ...edits, cache });
    const key = { ...base, fileBucket: bucket };
    expect(checked).toEqual([key]);
    expect(recorded).toEqual([[key, "guidance"]]);
  });

  test("the posture in the key defaults to an active root", () => {
    const { cache, checked } = stubCache(false);
    const { posture: _posture, ...rest } = base;
    prompt({ ...rest, recentEdits: [], cache });
    expect(checked[0]?.posture).toBe("root_active");
  });

  test("satisfied guidance without reminders is skipped and not recorded", () => {
    const { cache, recorded } = stubCache(true);
    expect(
      prompt({
        ...base,
        recentEdits: [],
        cache,
        fileOperationReminder: {
          path: "a",
          lifecycleReminder: null,
          e2eReminder: null,
        },
      }),
    ).toBe(SENTINEL);
    expect(recorded).toEqual([]);
  });

  test.each([
    [{ lifecycleReminder: "- life", e2eReminder: null }, "- life"],
    [{ lifecycleReminder: null, e2eReminder: "- e2e" }, "- e2e"],
  ])(
    "satisfied guidance still shows file reminders: %p",
    (reminder, bullet) => {
      const { cache, recorded } = stubCache(true);
      expect(
        prompt({
          ...base,
          recentEdits: [],
          cache,
          fileOperationReminder: { path: "a", ...reminder },
        }),
      ).toBe(`${SENTINEL}\n\n🧠 **File operation detected**\n${bullet}`);
      expect(recorded).toHaveLength(1);
    },
  );
});

describe("file operation reminders", () => {
  test("both reminders form a block of their own, trimmed", () => {
    expect(
      prompt({
        recentEdits: [],
        fileOperationReminder: {
          path: "a",
          lifecycleReminder: "- life",
          e2eReminder: "- e2e\n",
        },
      }),
    ).toBe(`${SENTINEL}\n\n🧠 **File operation detected**\n- life\n- e2e`);
  });

  test("empty reminders add nothing", () => {
    expect(
      prompt({
        recentEdits: [],
        fileOperationReminder: {
          path: "a",
          lifecycleReminder: "",
          e2eReminder: null,
        },
      }),
    ).toBe(SENTINEL);
  });

  test("entity reminders are kept when the block names no IDs", () => {
    expect(
      prompt({
        recentEdits: [],
        fileOperationReminder: {
          path: "a",
          lifecycleReminder: "- Kibi entities: REQ-a",
          e2eReminder: null,
        },
      }),
    ).toBe(
      `${SENTINEL}\n\n🧠 **File operation detected**\n- Kibi entities: REQ-a`,
    );
  });

  test("reminders fold in after the header of a semantic block", () => {
    const plain = prompt({ recentEdits: [], riskClass: "kb_doc_structural" });
    const [sentinel, blank, header, ...rest] = plain.split("\n");
    expect(
      prompt({
        recentEdits: [],
        riskClass: "kb_doc_structural",
        fileOperationReminder: {
          path: "a",
          lifecycleReminder: "- life",
          e2eReminder: "- e2e",
        },
      }),
    ).toBe([sentinel, blank, header, "- e2e", "- life", ...rest].join("\n"));
  });
});

describe("completion reminder", () => {
  const reminder =
    "- Kibi impact evidence is required before completion/commit: run `kb_check` before completing this task.";

  test.each([
    ["behavior_candidate"],
    ["traceability_candidate"],
    ["req_policy_candidate"],
  ] as const)("%s gets the reminder", (riskClass) => {
    const plain = prompt({ recentEdits: [], riskClass });
    expect(
      prompt({ recentEdits: [], riskClass, completionReminder: true }),
    ).toBe(`${plain}\n${reminder}`);
  });

  test.each([
    [{ riskClass: "kb_doc_structural" as const, completionReminder: true }],
    [{ riskClass: "behavior_candidate" as const }],
    [
      {
        riskClass: "behavior_candidate" as const,
        completionReminder: true,
        maintenanceDegraded: true,
      },
    ],
    [
      {
        riskClass: "behavior_candidate" as const,
        completionReminder: true,
        posture: "root_uninitialized" as const,
      },
    ],
    [
      {
        riskClass: "behavior_candidate" as const,
        completionReminder: true,
        posture: "root_partial" as const,
      },
    ],
  ])("no reminder for %p", (context) => {
    expect(prompt({ recentEdits: [], ...context })).not.toContain(reminder);
  });

  test("no reminder without a block", () => {
    expect(
      prompt({
        recentEdits: [],
        riskClass: "behavior_candidate",
        completionReminder: true,
        posture: "vendored_only",
      }),
    ).toBe(SENTINEL);
  });

  test("the reminder takes one bullet of the budget", () => {
    const context: PromptContext = {
      recentEdits: [],
      riskClass: "behavior_candidate",
      fileOperationReminder: {
        path: "a",
        lifecycleReminder: "- life",
        e2eReminder: "- e2e",
      },
    };
    const plain = prompt(context);
    const bullets = (text: string) =>
      text.split("\n").filter((line) => line.startsWith("-"));
    expect(bullets(plain)).toHaveLength(MAX_BULLETS);
    const withReminder = prompt({ ...context, completionReminder: true });
    expect(bullets(withReminder)).toEqual([
      ...bullets(plain).slice(0, MAX_BULLETS - 1),
      reminder,
    ]);
  });
});

describe("freshness", () => {
  const freshness = {
    state: "evidence-required" as const,
    requiresEvidence: true,
    allowsCompletion: false,
    reason: "Because.",
    missingEvidence: ["kb_check"],
  };

  test("changed paths are listed, five at most", () => {
    const text = prompt({
      recentEdits: [],
      kbFreshness: freshness,
      freshnessChangedPaths: ["a", "b", "c", "d", "e", "f"],
    } as PromptContext);
    expect(text.split("\n").slice(2, 6)).toEqual([
      "🧠 **Kibi freshness required**",
      "Changed: `a`, `b`, `c`, `d`, `e`",
      "State: evidence-required. Because.",
      "Missing: kb_check",
    ]);
  });
});

describe("source-linked bullets", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  function write(root: string, relativePath: string, content: string): void {
    const target = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }

  function workspace(status = "open"): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-oc-prompt-"));
    roots.push(root);
    write(
      root,
      ".kb/symbols.yaml",
      [
        "symbols:",
        "  - id: SYM-a",
        "    sourceFile: src/a.ts",
        "    relationships:",
        "      - type: implements",
        "        target: REQ-a",
        "      - type: implements",
        "        target: REQ-b",
        "",
      ].join("\n"),
    );
    write(
      root,
      ".kb/requirements/REQ-a.md",
      `---\nid: REQ-a\ntitle: A\nstatus: ${status}\nlinks:\n  - type: requires_property\n    target: FACT-one\n  - type: requires_property\n    target: FACT-two\n---\n`,
    );
    write(
      root,
      ".kb/facts/FACT-one.md",
      "---\nid: FACT-one\ntitle: One holds\nstatus: active\n---\n",
    );
    write(
      root,
      ".kb/facts/FACT-two.md",
      "---\nid: FACT-two\ntitle: Two holds\nstatus: active\n---\n",
    );
    return root;
  }

  function linked(
    root: string,
    extra: Partial<PromptContext> = {},
  ): PromptContext {
    return {
      recentEdits: [{ path: "src/a.ts", kind: "code" }],
      riskClass: "behavior_candidate",
      workspaceRoot: root,
      ...extra,
    };
  }

  test("links and one grounding fact follow the header", () => {
    const root = workspace();
    const plain = prompt({ recentEdits: [], riskClass: "behavior_candidate" });
    const [sentinel, blank, header, ...rest] = plain.split("\n");
    expect(prompt(linked(root))).toBe(
      [
        sentinel,
        blank,
        header,
        "- Existing Kibi links: REQ-a, REQ-b",
        "- REQ-a must keep true: One holds +1 more.",
        ...rest,
      ].join("\n"),
    );
  });

  test.each([["behavior_candidate"], ["traceability_candidate"]] as const)(
    "a retired requirement adds only the links for %s",
    (riskClass) => {
      const root = workspace("superseded");
      const plain = prompt({ recentEdits: [], riskClass });
      const [sentinel, blank, header, ...rest] = plain.split("\n");
      expect(prompt(linked(root, { riskClass }))).toBe(
        [
          sentinel,
          blank,
          header,
          "- Existing Kibi links: REQ-a, REQ-b",
          ...rest,
        ].join("\n"),
      );
    },
  );

  test("an absolute focus path finds the same links", () => {
    const root = workspace();
    expect(
      prompt(
        linked(root, {
          focusEdit: { path: path.join(root, "src/a.ts"), kind: "code" },
        }),
      ),
    ).toBe(prompt(linked(root)));
  });

  test.each([
    ["no edits", { recentEdits: [] }],
    ["an unlinked file", { recentEdits: [{ path: "src/b.ts", kind: "code" }] }],
    ["another risk class", { riskClass: "req_policy_candidate" }],
    ["no workspace root", { workspaceRoot: undefined }],
  ] as const)("no links for %s", (_name, extra) => {
    const root = workspace();
    const context = linked(root, extra as Partial<PromptContext>);
    expect(prompt(context)).toBe(
      prompt({ ...context, workspaceRoot: undefined }),
    );
  });

  test("no links when the semantic block is suppressed", () => {
    const root = workspace();
    const cache = {
      isSatisfied: () => true,
      recordSatisfied: () => {},
    } as unknown as GuidanceCache;
    expect(
      prompt(
        linked(root, {
          cache,
          branch: "main",
          fileOperationReminder: {
            path: "src/a.ts",
            lifecycleReminder: null,
            e2eReminder: "- e2e",
          },
        }),
      ),
    ).toBe(`${SENTINEL}\n\n🧠 **File operation detected**\n- e2e`);
  });

  test("a lifecycle reminder repeating the linked IDs is dropped", () => {
    const root = workspace();
    const withReminder = (lifecycleReminder: string) =>
      prompt(
        linked(root, {
          fileOperationReminder: {
            path: "src/a.ts",
            lifecycleReminder,
            e2eReminder: null,
          },
        }),
      );
    expect(withReminder("- Kibi entities: REQ-b")).toBe(prompt(linked(root)));
    expect(withReminder("- Kibi entities: REQ-z")).toContain(
      "- Kibi entities: REQ-z",
    );
    expect(withReminder("- Linked: REQ-b")).toContain("- Linked: REQ-b");
  });
});
