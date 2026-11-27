import { afterEach, describe, expect, test } from "bun:test";
import { KbRejection } from "../../../src/cli-errors.js";
import {
  type CaptureReads,
  MAX_RELATED_STATEMENT,
  REF_PLACEHOLDER,
  WHY_PLACEHOLDER,
  captureFollowUp,
  evidenceFloorOf,
  prologCaptureReads,
  relatedCurrentRequirements,
  withRequirementCapture,
} from "../../../src/operations/mutation/capture.js";
import type { ClaimSubjectGap } from "../../../src/operations/mutation/subject-warnings.js";
import type {
  UpsertInput,
  UpsertPayload,
} from "../../../src/operations/mutation/types.js";
import { symbolCoverageWarning } from "../../../src/operations/mutation/warnings.js";
import type { OperationContext } from "../../../src/public/operations/runtime-types.js";
import { fail, ok, scriptedProlog } from "../fake-prolog.js";
import { cleanupWorkspaces, tempWorkspace } from "../workspace.js";

afterEach(cleanupWorkspaces);

type Entity = Record<string, unknown>;

function context(workspaceRoot = "/kibi-capture-none"): OperationContext {
  return {
    workspaceRoot,
    signal: new AbortController().signal,
    clock: () => new Date(0),
  };
}

/** Capture reads over a fixed store; every read is recorded. */
function store(
  options: {
    entities?: Record<string, Entity>;
    taken?: string[];
    implementing?: string[];
    scenarios?: string[];
    covered?: string[];
    tested?: boolean;
    gaps?: ClaimSubjectGap[];
    current?: { id: string; title: string; semanticText: string }[];
    currentFails?: boolean;
    neighbours?: { id: string; title: string }[];
    integration?: boolean;
  } = {},
): CaptureReads & { reads: string[] } {
  const reads: string[] = [];
  return {
    reads,
    entity: async (id, type) => {
      reads.push(`entity:${type}:${id}`);
      return options.entities?.[id];
    },
    exists: async (id) => (options.taken ?? []).includes(id),
    implementingSymbols: async () => options.implementing ?? [],
    scenarios: async () => options.scenarios ?? [],
    covered: async (symbol) => (options.covered ?? []).includes(symbol),
    tested: async () => options.tested === true,
    subjectGaps: async () => options.gaps ?? [],
    currentRequirements: async () => {
      if (options.currentFails === true) throw new Error("engine down");
      return options.current ?? [];
    },
    neighbours: async (id, subjectKeys) => {
      reads.push(`neighbours:${id}:${subjectKeys.join(",")}`);
      return options.neighbours ?? [];
    },
    proofIntegration: async () => options.integration !== false,
  };
}

function req(extra: Partial<UpsertInput> = {}): UpsertInput {
  return {
    type: "req",
    id: "REQ-snippet-cap",
    properties: {
      title: "Snippets show at most seven lines",
      status: "open",
      origin: { kind: "agent", ref: "The person said in chat: keep it short" },
    },
    ...extra,
  } as UpsertInput;
}

async function refusal(promise: Promise<unknown>): Promise<KbRejection> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof KbRejection) return error;
    throw error;
  }
  throw new Error("expected a refusal");
}

describe("withRequirementCapture", () => {
  test("why is refused on other entity types and other payloads pass unchanged", async () => {
    const fact = { type: "fact", id: "F", properties: {} } as UpsertInput;
    expect(await withRequirementCapture(fact, context(), store())).toBe(fact);
    const refused = await refusal(
      withRequirementCapture(
        { ...fact, why: "because" } as UpsertInput,
        context(),
        store(),
      ),
    );
    expect(refused.message).toBe(
      "Upsert of F rejected: why is accepted only on a requirement; give a fact its reason in the document body.",
    );
    expect(refused.code).toBe("VALIDATION_FAILED");
    expect(refused.issues).toEqual([
      { rule: "requirement_why_invalid", field: "why" },
    ]);
  });

  test("why must be text, and must agree with a rationale sent beside it", async () => {
    for (const why of ["  ", 3])
      expect(
        (
          await refusal(
            withRequirementCapture(
              req({ why } as unknown as Partial<UpsertInput>),
              context(),
              store(),
            ),
          )
        ).message,
      ).toBe(
        "Upsert of REQ-snippet-cap rejected: why must be the reason the requirement exists, as text; write 'Reason not stated' when the person gave none.",
      );
    const disagree = req({ why: "Long ones get skipped." });
    (disagree.properties as Entity).rationale = "Other";
    expect(
      (await refusal(withRequirementCapture(disagree, context(), store())))
        .message,
    ).toBe(
      "Upsert of REQ-snippet-cap rejected: why and rationale disagree; send the reason once, in why.",
    );
    const agree = req({ why: " Long ones get skipped. " });
    (agree.properties as Entity).rationale = "Long ones get skipped.";
    const written = await withRequirementCapture(agree, context(), store());
    expect(written.properties.rationale).toBe("Long ones get skipped.");
  });

  test("a new requirement gets why as rationale and Context, origin.ref as Source, and its statement as semantic_text", async () => {
    const reads = store();
    const written = await withRequirementCapture(
      req({
        document: { body: "A hook snippet must show at most seven lines." },
        why: "  Longer snippets get skipped by agents.  ",
      }),
      context(),
      reads,
    );
    expect(written).not.toHaveProperty("why");
    expect(written.properties).toEqual({
      title: "Snippets show at most seven lines",
      status: "open",
      origin: { kind: "agent", ref: "The person said in chat: keep it short" },
      rationale: "Longer snippets get skipped by agents.",
      semantic_text: "A hook snippet must show at most seven lines.",
    });
    expect(written.document).toEqual({
      body: "A hook snippet must show at most seven lines.\n\n## Context\n\nLonger snippets get skipped by agents.\n\n## Source\n\n> The person said in chat: keep it short\n",
    });
    expect(reads.reads).toEqual(["entity:req:REQ-snippet-cap"]);
  });

  test("why fills an existing Why section and keeps a Source the body has", async () => {
    const written = await withRequirementCapture(
      req({
        document: {
          path: ".kb/requirements/REQ-snippet-cap.md",
          body: "Snippets stay short.\n\n## Why\n\nOld reason.\n\n## Source\n\n> the chat\n",
        },
        why: "New reason.",
      }),
      context(),
      store(),
    );
    expect(written.document).toEqual({
      path: ".kb/requirements/REQ-snippet-cap.md",
      body: "Snippets stay short.\n\n## Why\n\nNew reason.\n\n## Source\n\n> the chat\n",
    });
    // A Rationale section is the reason section too; a Notes one is not.
    const rationale = await withRequirementCapture(
      req({
        document: { body: "Short.\n\n## Notes\n\nn\n\n### Rationale\n\nold\n" },
        why: "New.",
        properties: { title: "T", status: "open" },
      }),
      context(),
      store(),
    );
    expect(rationale.document?.body).toBe(
      "Short.\n\n## Notes\n\nn\n\n### Rationale\n\nold\n\n## Context\n\nNew.\n",
    );
    const nested = await withRequirementCapture(
      req({
        document: { body: "Short.\n\n## **Rationale** here\n\nold\n" },
        why: "New.",
        properties: { title: "T", status: "open" },
      }),
      context(),
      store(),
    );
    expect(nested.document?.body).toBe("Short.\n\n## Rationale\n\nNew.\n");
  });

  test("an update without a body revises the stored file, keeping its statement and semantic_text", async () => {
    const root = tempWorkspace({
      ".kb/requirements/REQ-snippet-cap.md":
        "---\nid: REQ-snippet-cap\ntitle: Snippets\n---\nSnippets stay short.\n\n## Notes\n\nkept\n",
    });
    const written = await withRequirementCapture(
      req({
        why: "They get skipped.",
        properties: { title: "T", status: "open" },
      }),
      context(root),
      store({
        entities: {
          "REQ-snippet-cap": {
            source: ".kb/requirements/REQ-snippet-cap.md",
            semantic_text: "Snippets stay short.",
            origin: { ref: "stored words" },
          },
        },
      }),
    );
    expect(written.document?.body).toBe(
      "Snippets stay short.\n\n## Notes\n\nkept\n\n## Context\n\nThey get skipped.\n\n## Source\n\n> stored words\n",
    );
    expect(written.properties.semantic_text).toBeUndefined();
    expect(written.properties.rationale).toBe("They get skipped.");
  });

  test("a new origin.ref replaces the Source section the person's words are quoted in", async () => {
    const root = tempWorkspace({
      ".kb/requirements/REQ-snippet-cap.md":
        "---\nid: REQ-snippet-cap\ntitle: Snippets\n---\nSnippets stay short.\n\n## Context\n\nThey get skipped.\n\n## Source\n\n> old words\n",
    });
    const stored = store({
      entities: {
        "REQ-snippet-cap": {
          source: ".kb/requirements/REQ-snippet-cap.md",
          semantic_text: "Snippets stay short.",
          origin: { kind: "human", ref: "old words" },
        },
      },
    });
    const withRef = (ref: string, body?: string) =>
      withRequirementCapture(
        req({
          properties: {
            title: "T",
            status: "open",
            origin: { kind: "human", ref },
          },
          ...(body === undefined ? {} : { document: { body } }),
        }),
        context(root),
        stored,
      );
    expect((await withRef("new words")).document?.body).toBe(
      "Snippets stay short.\n\n## Context\n\nThey get skipped.\n\n## Source\n\n> new words\n",
    );
    // The same words, or a sent body with its own Source, are left alone.
    expect((await withRef("old words")).document).toBeUndefined();
    const own = "Snippets stay short.\n\n## Source\n\n> own words\n";
    expect((await withRef("new words", own)).document?.body).toBe(own);
  });

  test("without a body or a readable file the statement comes from semantic_text or the title", async () => {
    const fromTitle = await withRequirementCapture(
      req({
        why: "Because.",
        properties: { title: "Keep it short", status: "open" },
      }),
      context(),
      store(),
    );
    expect(fromTitle.document?.body).toBe(
      "Keep it short\n\n## Context\n\nBecause.\n",
    );
    expect(fromTitle.properties.semantic_text).toBe("Keep it short");
    const fromStored = await withRequirementCapture(
      req({ why: "Because.", properties: { status: "open" } }),
      context(),
      store({
        entities: {
          "REQ-snippet-cap": {
            source: "mcp://kibi/upsert",
            title: "Stored title",
            semantic_text: "Stored statement.",
          },
        },
      }),
    );
    expect(fromStored.document?.body).toBe(
      "Stored statement.\n\n## Context\n\nBecause.\n",
    );
    const sentText = await withRequirementCapture(
      req({
        why: "Because.",
        properties: { title: "T", status: "open", semantic_text: "Sent." },
      }),
      context(),
      store({ entities: { "REQ-snippet-cap": { title: "Stored title" } } }),
    );
    expect(sentText.document?.body).toBe("Sent.\n\n## Context\n\nBecause.\n");
    expect(sentText.properties.semantic_text).toBe("Sent.");
    const storedTitle = await withRequirementCapture(
      req({ why: "Because.", properties: { status: "open" } }),
      context(),
      store({ entities: { "REQ-snippet-cap": { title: "Stored title" } } }),
    );
    expect(storedTitle.document?.body).toBe(
      "Stored title\n\n## Context\n\nBecause.\n",
    );
    // A stored source file that cannot be read counts as no file.
    const unreadable = await withRequirementCapture(
      req({ why: "Because.", properties: { status: "open" } }),
      context(),
      store({
        entities: {
          "REQ-snippet-cap": {
            source: ".kb/requirements/REQ-snippet-cap.md",
            title: "Stored title",
          },
        },
      }),
    );
    expect(unreadable.document?.body).toBe(
      "Stored title\n\n## Context\n\nBecause.\n",
    );
  });

  test("with no reads given, the reads come from the context's store", async () => {
    const { prolog, goals } = scriptedProlog([ok({ Results: "[]" })]);
    const result = await captureFollowUp(req(), payload(["kept"]), {
      ...context(),
      prolog,
    } as OperationContext);
    expect(result).toEqual({
      warnings: ["kept"],
      nextActions: [],
      approvalsNeeded: [],
    });
    expect(goals).toHaveLength(1);
  });

  test("a resent body whose statement the file already holds keeps a separately written semantic_text", async () => {
    const onDisk =
      "Exports carry a signature block that auditors verify offline.\n\n## Context\n\nThe auditors asked.\n";
    const root = tempWorkspace({
      ".kb/requirements/REQ-snippet-cap.md": `---\nid: REQ-snippet-cap\ntitle: Exports\n---\n${onDisk}`,
    });
    const reads = store({
      entities: {
        "REQ-snippet-cap": {
          source: ".kb/requirements/REQ-snippet-cap.md",
          semantic_text: "Every export must be signed.",
        },
      },
    });
    const resent = await withRequirementCapture(
      req({ document: { body: `${onDisk}\n## Notes\n\nSee the ticket.\n` } }),
      context(root),
      reads,
    );
    expect(resent.properties.semantic_text).toBeUndefined();
    // A body that states something else still restates it.
    const restated = await withRequirementCapture(
      req({ document: { body: "Exports must be signed twice.\n" } }),
      context(root),
      reads,
    );
    expect(restated.properties.semantic_text).toBe(
      "Exports must be signed twice.",
    );
  });

  test("a body without semantic_text records its statement when none is stored or it states another", async () => {
    const body =
      "Totals must be rounded.\n\n## Context\n\nThe auditors asked.\n";
    const fresh = await withRequirementCapture(
      req({ document: { body } }),
      context(),
      store(),
    );
    expect(fresh.properties.semantic_text).toBe("Totals must be rounded.");
    expect(fresh.document).toEqual({ body });
    const restated = await withRequirementCapture(
      req({ document: { body } }),
      context(),
      store({
        entities: { "REQ-snippet-cap": { semantic_text: "Stored." } },
      }),
    );
    expect(restated.properties.semantic_text).toBe("Totals must be rounded.");
    const kept = req({ document: { body } });
    const stored = await withRequirementCapture(
      kept,
      context(),
      store({
        entities: {
          "REQ-snippet-cap": { semantic_text: "Totals must be rounded. " },
        },
      }),
    );
    expect(stored).toEqual(kept);
    const sent = req({ document: { body } });
    (sent.properties as Entity).semantic_text = "Sent.";
    const reads = store();
    expect(await withRequirementCapture(sent, context(), reads)).toEqual(sent);
    // Only the stored origin.ref is read, to compare the sent one with it.
    expect(reads.reads).toEqual(["entity:req:REQ-snippet-cap"]);
    const noRef = req({ document: { body } });
    (noRef.properties as Entity).semantic_text = "Sent.";
    (noRef.properties as Entity).origin = { kind: "agent" };
    const none = store();
    await withRequirementCapture(noRef, context(), none);
    expect(none.reads).toEqual([]);
    // A heading-only body states nothing, so nothing is recorded.
    const empty = req({ document: { body: "## Context\n\nx\n" } });
    expect(await withRequirementCapture(empty, context(), store())).toEqual(
      empty,
    );
    // Without a store nothing is read, and the body still decides.
    expect(
      (await withRequirementCapture(req({ document: { body } }), context()))
        .properties.semantic_text,
    ).toBe("Totals must be rounded.");
    const plain = req();
    expect(await withRequirementCapture(plain, context(), store())).toEqual(
      plain,
    );
  });
});

function payload(warnings: string[] = []): UpsertPayload {
  return { created: 1, updated: 0, relationships_created: 0, warnings };
}

const ENTITY = {
  title: "Snippets show at most seven lines",
  status: "open",
  firmness: "firm",
};

const CONTEXT_WARNING =
  "requirement REQ-snippet-cap has no body context: a '## Context' section that states why this exists is missing. kb_check blocks it under entity-context-missing.";

describe("captureFollowUp", () => {
  test("nothing to do for other types, without a store, or for a requirement the store lacks", async () => {
    const warnings = ["kept"];
    for (const [input, reads] of [
      [{ type: "fact", id: "F", properties: {} } as UpsertInput, store()],
      [req(), undefined],
      [req(), store()],
    ] as const)
      expect(
        await captureFollowUp(input, payload(warnings), context(), reads),
      ).toEqual({ warnings: ["kept"], nextActions: [], approvalsNeeded: [] });
    expect(await captureFollowUp(req(), payload(warnings), context())).toEqual({
      warnings: ["kept"],
      nextActions: [],
      approvalsNeeded: [],
    });
  });

  test("a missing Context becomes a kb_upsert step that asks for why", async () => {
    const result = await captureFollowUp(
      req(),
      payload(["advice", CONTEXT_WARNING]),
      context(),
      store({
        entities: { "REQ-snippet-cap": { ...ENTITY, firmness: "default" } },
      }),
    );
    expect(result.warnings).toEqual(["advice"]);
    expect(result.nextActions).toEqual([
      {
        operation: "kb_upsert",
        code: "entity-context-missing",
        input: {
          type: "req",
          id: "REQ-snippet-cap",
          properties: {
            title: "Snippets show at most seven lines",
            status: "open",
          },
          why: WHY_PLACEHOLDER,
        },
        reason:
          "kb_check blocks REQ-snippet-cap until its body says why it exists, in 12 words or more with its Source: send the person's reason as why, in their words. Never pad it to reach 12 words; cite their words as origin.ref, which the body keeps as its Source.",
        required: true,
      },
    ]);
  });

  test("on a firm requirement, the step asks for the person's words with the reason", async () => {
    const origin = { kind: "human", ref: "keep it short" };
    const result = await captureFollowUp(
      req(),
      payload([CONTEXT_WARNING]),
      context(),
      store({
        entities: {
          "REQ-snippet-cap": {
            ...ENTITY,
            firmness: "firm",
            origin,
            rationale: "Agents skip",
          },
        },
      }),
    );
    expect(result.nextActions[0]?.input).toEqual({
      type: "req",
      id: "REQ-snippet-cap",
      properties: {
        title: "Snippets show at most seven lines",
        status: "open",
        origin: { ...origin, ref: REF_PLACEHOLDER },
      },
      why: WHY_PLACEHOLDER,
    });
    expect(result.nextActions[0]?.reason).toContain(
      "is firm and its reason is credited to the person, so ask the person",
    );
    // A first reason over "Reason not stated" would be credited to the
    // person too, so it needs their words as well.
    const unstated = await captureFollowUp(
      req(),
      payload([CONTEXT_WARNING]),
      context(),
      store({
        entities: {
          "REQ-snippet-cap": {
            ...ENTITY,
            firmness: "firm",
            origin,
            rationale: "Reason not stated",
          },
        },
      }),
    );
    expect(unstated.nextActions[0]?.input).toEqual({
      type: "req",
      id: "REQ-snippet-cap",
      properties: {
        title: "Snippets show at most seven lines",
        status: "open",
        origin: { ...origin, ref: REF_PLACEHOLDER },
      },
      why: WHY_PLACEHOLDER,
    });
  });

  const INVENTORY = [
    {
      claim_key: "C1",
      claim_text: "one",
      role: "normative",
      status: "missing",
      span: { start: 0, end: 3 },
    },
    {
      claim_key: "C2",
      claim_text: "two",
      role: "normative",
      status: "missing",
      span: { start: 4, end: 7 },
    },
    {
      claim_key: "C3",
      claim_text: "three",
      role: "normative",
      status: "missing",
      subjects: ["hooks.snippets"],
      span: { start: 8, end: 13 },
    },
  ];

  test("claims without subjects get one step that fills the closest subject and names the others", async () => {
    const result = await captureFollowUp(
      req(),
      payload([
        "claim-subject-missing: REQ-snippet-cap is recorded; its inventory claim C1 (...)",
        "claim-subject-missing: REQ-other is recorded; kept",
      ]),
      context(),
      store({
        entities: { "REQ-snippet-cap": { semantic_inventory: INVENTORY } },
        gaps: [
          {
            claimKey: "C1",
            claimText: "one",
            candidates: ["hooks.limits", "hooks.snippets"],
            labels: ["hooks.limits", 'hooks.snippets ("Edit snippets")'],
          },
          {
            claimKey: "C2",
            claimText: "two",
            candidates: ["hooks.limits"],
            labels: ["hooks.limits"],
          },
        ],
      }),
    );
    expect(result.warnings).toEqual([
      "claim-subject-missing: REQ-other is recorded; kept",
    ]);
    expect(result.nextActions).toEqual([
      {
        operation: "kb_upsert",
        code: "claim-subject-missing",
        input: {
          type: "req",
          id: "REQ-snippet-cap",
          properties: {
            title: "REQ-snippet-cap",
            status: "open",
            semantic_inventory: [
              {
                claim_key: "C1",
                status: "missing",
                subjects: ["hooks.limits"],
              },
              {
                claim_key: "C2",
                status: "missing",
                subjects: ["hooks.limits"],
              },
              {
                claim_key: "C3",
                status: "missing",
                subjects: ["hooks.snippets"],
              },
            ],
          },
        },
        reason:
          'kb_check blocks REQ-snippet-cap until claims C1, C2 name the subjects they are about. subjects holds the closest existing subject by its words; use hooks.snippets ("Edit snippets") instead if one fits better, or a subject you define first as a subject fact.',
        required: true,
      },
      // Unmodeled claims are grounded at every level, with or without a floor.
      {
        operation: "kb_model",
        code: "missing_logic_grounding",
        input: {
          mode: "requirement",
          requirementId: "REQ-snippet-cap",
          text: "REQ-snippet-cap",
        },
        reason:
          "Each claim of REQ-snippet-cap (C1, C2, C3) is still unmodeled, so kb_check cannot tell when another requirement contradicts it: kb_model returns the facts to upsert.",
        required: true,
      },
    ]);
    const lone = await captureFollowUp(
      req(),
      payload(),
      context(),
      store({
        entities: { "REQ-snippet-cap": {} },
        gaps: [
          {
            claimKey: "C1",
            claimText: "one",
            candidates: ["hooks.limits"],
            labels: ["hooks.limits"],
          },
        ],
      }),
    );
    expect(lone.nextActions[0]?.reason).toBe(
      "kb_check blocks REQ-snippet-cap until claim C1 names the subject it is about. subjects holds the closest existing subject by its words, or a subject you define first as a subject fact.",
    );
    const none = await captureFollowUp(
      req(),
      payload(),
      context(),
      store({
        entities: {
          "REQ-snippet-cap": {
            semantic_inventory: [INVENTORY[0], null, "C9"],
          },
        },
        gaps: [
          { claimKey: "C1", claimText: "one", candidates: [], labels: [] },
        ],
      }),
    );
    expect(none.nextActions[0]?.input).toMatchObject({
      properties: {
        semantic_inventory: [
          { claim_key: "C1", status: "missing", subjects: ["<subject_key>"] },
        ],
      },
    });
    const bare = await captureFollowUp(
      req(),
      payload(),
      context(),
      store({
        entities: { "REQ-snippet-cap": { semantic_inventory: "none" } },
        gaps: [
          { claimKey: "C1", claimText: "one", candidates: [], labels: [] },
        ],
      }),
    );
    expect(bare.nextActions[0]?.input).toMatchObject({
      properties: { semantic_inventory: [] },
    });
    expect(none.nextActions[0]?.reason).toBe(
      "kb_check blocks REQ-snippet-cap until claim C1 names the subject it is about. Name an existing subject (kb_query factKind subject lists them), or define one first as a subject fact.",
    );
  });

  test("a firm requirement without a test gets both scenarios, the test, link, coverage and proof steps", async () => {
    const coverage = symbolCoverageWarning("SYM-cap")[0] as string;
    const result = await captureFollowUp(
      req(),
      payload([coverage, "advice"]),
      context(),
      store({
        entities: {
          "REQ-snippet-cap": ENTITY,
          "SYM-cap": { title: "reviewProbeCap", status: "active" },
        },
        implementing: ["SYM-cap", "SYM-done"],
        covered: ["SYM-done"],
        taken: ["TEST-snippet-cap"],
      }),
    );
    expect(result.warnings).toEqual(["advice"]);
    expect(result.nextActions).toEqual([
      {
        operation: "kb_upsert",
        code: "evidence-floor",
        input: {
          type: "scenario",
          id: "SCEN-snippet-cap",
          properties: {
            title: "Snippets show at most seven lines",
            status: "active",
          },
          document: {
            body: "<one case REQ-snippet-cap decides: given ..., when ..., then ...>\n",
          },
        },
        reason:
          "REQ-snippet-cap needs a scenario and a test to reach its evidence floor (tested); this records the scenario.",
        required: true,
      },
      {
        operation: "kb_upsert",
        code: "evidence-floor",
        input: {
          type: "scenario",
          id: "SCEN-snippet-cap-rejected",
          properties: {
            title: "<a value REQ-snippet-cap forbids is refused>",
            status: "active",
            expects: "rejection",
          },
          document: {
            body: "<given a value or situation REQ-snippet-cap forbids, when ..., then it is refused>\n",
          },
        },
        reason:
          "Once its claims are grounded, REQ-snippet-cap is not tested while only its happy path is: this failure-side scenario expects rejection and assumes a value the requirement forbids; the same test verifies it. If REQ-snippet-cap has no input to refuse (it states a capability or an output shape), a person may approve a failure_side_waiver instead, listed in approvalsNeeded.",
        required: true,
      },
      {
        operation: "kb_upsert",
        code: "evidence-floor",
        input: {
          type: "test",
          id: "TEST-snippet-cap-check",
          properties: {
            title:
              "<what the test checks about Snippets show at most seven lines>",
            status: "active",
            verification_scope: "end_to_end",
          },
          document: { body: "<what the test runs and what it checks>\n" },
          relationships: [
            {
              type: "validates",
              from: "TEST-snippet-cap-check",
              to: "SCEN-snippet-cap",
            },
            {
              type: "validates",
              from: "TEST-snippet-cap-check",
              to: "SCEN-snippet-cap-rejected",
            },
          ],
        },
        reason: "Records the test of SCEN-snippet-cap.",
        required: true,
      },
      {
        operation: "kb_upsert",
        code: "evidence-floor",
        input: {
          type: "req",
          id: "REQ-snippet-cap",
          properties: {
            title: "Snippets show at most seven lines",
            status: "open",
          },
          relationships: [
            {
              type: "specified_by",
              from: "REQ-snippet-cap",
              to: "SCEN-snippet-cap",
            },
            {
              type: "specified_by",
              from: "REQ-snippet-cap",
              to: "SCEN-snippet-cap-rejected",
            },
          ],
        },
        reason:
          "Links REQ-snippet-cap to SCEN-snippet-cap and SCEN-snippet-cap-rejected.",
        required: true,
      },
      {
        operation: "kb_upsert",
        code: "symbol-coverage",
        input: {
          type: "symbol",
          id: "SYM-cap",
          properties: { title: "reviewProbeCap", status: "active" },
          relationships: [
            {
              type: "covered_by",
              from: "SYM-cap",
              to: "TEST-snippet-cap-check",
            },
          ],
        },
        reason:
          "kb_check blocks SYM-cap until a test of REQ-snippet-cap covers it.",
        required: true,
      },
      {
        operation: "kibi prove",
        code: "evidence-floor",
        input: { test: "TEST-snippet-cap-check" },
        reason:
          "kb_check blocks REQ-snippet-cap below its evidence floor (tested) until TEST-snippet-cap-check has a passing proof: give it a proof_contract naming the test code's symbol (executable_for TEST-snippet-cap-check) and proof/steps/TEST-snippet-cap-check.json with the commands that run it, then run kibi prove --test TEST-snippet-cap-check. kibi proof explain REQ-snippet-cap lists what is left.",
        required: true,
      },
    ]);
    // The person's own words approve the statement, so it is not put back
    // to them; the waiver is listed only as the alternative to the
    // failure-side scenario.
    expect(result.approvalsNeeded).toEqual([
      {
        kind: "failure_side_waiver",
        about: "REQ-snippet-cap",
        ask: "Only if REQ-snippet-cap has no input to refuse: may its failure side be waived (failure_side_waiver_approved_by)?",
        alternative: true,
      },
    ]);
  });

  test("unmodeled claims list the pair reviews, the model step and the proof setup in the same answer", async () => {
    const reads = store({
      entities: {
        "REQ-snippet-cap": {
          title: "Snippets show at most seven lines",
          status: "open",
          firmness: "default",
          required_evidence: "tested",
          semantic_text: "Snippets show at most seven lines.",
          semantic_inventory: [
            { claim_key: "C1", status: "missing", subjects: ["snippet"] },
            { claim_key: "C2", status: "modeled", subjects: ["snippet"] },
          ],
          pair_reviews: [{ with: "REQ-reviewed", verdict: "no_conflict" }],
        },
        "REQ-firm": { firmness: "firm" },
        "REQ-soft": { firmness: "default" },
      },
      neighbours: [
        { id: "REQ-reviewed", title: "Already reviewed" },
        { id: "REQ-firm", title: "Firm rule" },
        { id: "REQ-soft", title: "Soft rule" },
      ],
      integration: false,
    });
    const result = await captureFollowUp(req(), payload(), context(), reads);
    expect(
      result.nextActions.map((step) => [step.operation, step.code]),
    ).toEqual([
      ["kb_upsert", "related-requirement-unmodeled"],
      ["kb_model", "evidence-floor"],
      ["kb_upsert", "evidence-floor"],
      ["kb_upsert", "evidence-floor"],
      ["kb_upsert", "evidence-floor"],
      ["kb_upsert", "evidence-floor"],
      ["kibi proof inspect", "evidence-floor"],
      ["kibi prove", "evidence-floor"],
    ]);
    expect(reads.reads).toContain("neighbours:REQ-snippet-cap:snippet");
    // A partner already reviewed is left out; only the unmodeled claim pairs.
    expect(result.nextActions[0]?.input).toEqual({
      type: "req",
      id: "REQ-snippet-cap",
      properties: {
        title: "Snippets show at most seven lines",
        status: "open",
        pair_reviews: ["REQ-firm", "REQ-soft"].map((partner) => ({
          with: partner,
          verdict: "<no_conflict | interacts | conflict>",
          separated_by:
            "<for no_conflict: the condition or term that separates the two rules>",
          claims: ["C1"],
          origin: { kind: "agent" },
        })),
      },
    });
    expect(result.nextActions[0]?.reason).toContain(
      'pairs REQ-snippet-cap with REQ-firm ("Firm rule"), REQ-soft ("Soft rule")',
    );
    expect(result.nextActions[0]?.reason).toContain(
      "those pairs are in approvalsNeeded",
    );
    expect(result.nextActions[1]?.input).toEqual({
      mode: "requirement",
      requirementId: "REQ-snippet-cap",
      text: "Snippets show at most seven lines.",
    });
    expect(result.nextActions[6]?.input).toEqual({
      command: "kibi proof run-steps",
      json: true,
    });
    expect(result.approvalsNeeded.map((approval) => approval.kind)).toEqual([
      "pair_review",
      "failure_side_waiver",
      "proof_integration",
    ]);
    expect(result.approvalsNeeded[0]?.about).toBe(
      "REQ-snippet-cap and REQ-firm",
    );
    expect(result.approvalsNeeded[2]?.about).toBe(
      ".kb/proof/integrations.json",
    );
  });

  test("at level remember the same write lists the pair reviews and the model step, and no scenario, test or proof", async () => {
    const root = tempWorkspace({
      "package.json": JSON.stringify({ kibi: { level: "remember" } }),
    });
    const reads = store({
      entities: {
        "REQ-snippet-cap": {
          title: "Snippets show at most seven lines",
          status: "open",
          firmness: "default",
          required_evidence: "tested",
          semantic_text: "Snippets show at most seven lines.",
          semantic_inventory: [
            { claim_key: "C1", status: "missing", subjects: ["snippet"] },
          ],
        },
        "REQ-soft": { firmness: "default" },
      },
      neighbours: [{ id: "REQ-soft", title: "Soft rule" }],
      implementing: ["SYM-snippet"],
      integration: false,
    });
    const result = await captureFollowUp(
      req(),
      payload([...symbolCoverageWarning("SYM-snippet")]),
      context(root),
      reads,
    );
    // Its symbol's missing test is neither a step nor a warning.
    expect(result.warnings).toEqual([]);
    expect(
      result.nextActions.map((step) => [step.operation, step.code]),
    ).toEqual([
      ["kb_upsert", "related-requirement-unmodeled"],
      ["kb_model", "missing_logic_grounding"],
    ]);
    // Neither requirement is firm, so nothing needs the person.
    expect(result.approvalsNeeded).toEqual([]);
    // The same write at level test asks for the floor's steps too.
    const tested = await captureFollowUp(
      req(),
      payload(),
      context(
        tempWorkspace({
          "package.json": JSON.stringify({ kibi: { level: "test" } }),
        }),
      ),
      reads,
    );
    expect(tested.nextActions.map((step) => step.code)).toContain(
      "evidence-floor",
    );
    expect(tested.nextActions.map((step) => step.operation)).toContain(
      "kibi prove",
    );
  });

  test("a firm requirement pairs every partner for approval, and modeled claims ask for no pair review", async () => {
    const firm = await captureFollowUp(
      req(),
      payload(),
      context(),
      store({
        entities: {
          "REQ-snippet-cap": {
            ...ENTITY,
            semantic_inventory: [
              { claim_key: "C1", status: "ambiguous", subjects: ["snippet"] },
            ],
          },
        },
        neighbours: [{ id: "REQ-soft", title: "Soft rule" }],
        tested: true,
      }),
    );
    expect(firm.nextActions.map((step) => step.code)).toEqual([
      "related-requirement-unmodeled",
      "missing_logic_grounding",
    ]);
    expect(firm.approvalsNeeded.map((approval) => approval.about)).toEqual([
      "REQ-snippet-cap and REQ-soft",
    ]);
    const modeled = store({
      entities: {
        "REQ-snippet-cap": {
          ...ENTITY,
          semantic_inventory: [
            { claim_key: "C1", status: "modeled", subjects: ["snippet"] },
          ],
        },
      },
      neighbours: [{ id: "REQ-soft", title: "Soft rule" }],
      tested: true,
    });
    expect(await captureFollowUp(req(), payload(), context(), modeled)).toEqual(
      { warnings: [], nextActions: [], approvalsNeeded: [] },
    );
    expect(modeled.reads.some((read) => read.startsWith("neighbours:"))).toBe(
      false,
    );
  });

  test("an uncovered symbol of a requirement with no floor gets a test but no proof step", async () => {
    const result = await captureFollowUp(
      req(),
      payload(),
      context(),
      store({
        entities: { "REQ-snippet-cap": { title: "T", status: "closed" } },
        implementing: ["SYM-cap"],
      }),
    );
    expect(
      result.nextActions.map((step) => [step.operation, step.code]),
    ).toEqual([
      ["kb_upsert", "symbol-coverage"],
      ["kb_upsert", "symbol-coverage"],
      ["kb_upsert", "symbol-coverage"],
      ["kb_upsert", "symbol-coverage"],
    ]);
    expect(result.nextActions[0]?.reason).toBe(
      "REQ-snippet-cap needs a scenario and a test that covers its code; this records the scenario.",
    );
    expect(result.nextActions[2]?.input).toMatchObject({
      properties: { title: "T", status: "closed" },
    });
    // A symbol the store does not hold is named by its id.
    expect(result.nextActions[3]?.input).toEqual({
      type: "symbol",
      id: "SYM-cap",
      properties: { title: "SYM-cap" },
      relationships: [
        { type: "covered_by", from: "SYM-cap", to: "TEST-snippet-cap" },
      ],
    });
  });

  test("a requirement with scenarios but no test gets one test of them all", async () => {
    const firm = await captureFollowUp(
      req(),
      payload(),
      context(),
      store({
        entities: { "REQ-snippet-cap": { firmness: "firm" } },
        scenarios: ["SCEN-a", "SCEN-b"],
        taken: ["TEST-snippet-cap"],
      }),
    );
    expect(firm.nextActions.map((step) => step.operation)).toEqual([
      "kb_upsert",
      "kibi prove",
    ]);
    expect(firm.nextActions[0]).toMatchObject({
      code: "evidence-floor",
      input: {
        type: "test",
        id: "TEST-snippet-cap-check",
        relationships: [
          { type: "validates", from: "TEST-snippet-cap-check", to: "SCEN-a" },
          { type: "validates", from: "TEST-snippet-cap-check", to: "SCEN-b" },
        ],
      },
      reason:
        "REQ-snippet-cap needs a test of its scenarios to reach its evidence floor (tested); this records it.",
    });
    const loose = await captureFollowUp(
      req(),
      payload(),
      context(),
      store({
        entities: { "REQ-snippet-cap": {} },
        implementing: ["SYM-cap"],
        scenarios: ["SCEN-a"],
      }),
    );
    expect(loose.nextActions.map((step) => step.code)).toEqual([
      "symbol-coverage",
      "symbol-coverage",
    ]);
    expect(loose.nextActions[0]?.reason).toBe(
      "REQ-snippet-cap needs a test of its scenarios that covers its code; this records it.",
    );
  });

  test("a tested requirement only asks for coverage, naming no test it cannot know", async () => {
    const result = await captureFollowUp(
      req(),
      payload(),
      context(),
      store({
        entities: { "REQ-snippet-cap": ENTITY },
        implementing: ["SYM-cap"],
        tested: true,
      }),
    );
    expect(result.nextActions).toHaveLength(1);
    expect(result.nextActions[0]?.input).toMatchObject({
      relationships: [
        {
          type: "covered_by",
          from: "SYM-cap",
          to: "<a TEST that verifies this requirement>",
        },
      ],
    });
    const done = await captureFollowUp(
      req(),
      payload(),
      context(),
      store({ entities: { "REQ-snippet-cap": ENTITY }, tested: true }),
    );
    expect(done.nextActions).toEqual([]);
    const proved = await captureFollowUp(
      req(),
      payload(),
      context(),
      store({
        entities: {
          "REQ-snippet-cap": { ...ENTITY, required_evidence: "proved" },
        },
      }),
    );
    expect(proved.nextActions[0]?.reason).toContain("(proved)");
    expect(proved.nextActions.at(-1)?.operation).toBe("kibi prove");
    const asserted = await captureFollowUp(
      req(),
      payload(),
      context(),
      store({
        entities: {
          "REQ-snippet-cap": { ...ENTITY, required_evidence: "asserted" },
        },
      }),
    );
    expect(asserted.nextActions).toEqual([]);
  });
});

describe("evidenceFloorOf", () => {
  test("required_evidence, else tested when firm or approved without a firmness", () => {
    expect(evidenceFloorOf({ required_evidence: " proved " })).toBe("proved");
    expect(evidenceFloorOf({ firmness: "firm" })).toBe("tested");
    expect(evidenceFloorOf({ origin: { approved_by: "maintainer" } })).toBe(
      "tested",
    );
    expect(
      evidenceFloorOf({
        firmness: "default",
        origin: { approved_by: "maintainer" },
      }),
    ).toBeUndefined();
    expect(evidenceFloorOf({ origin: { approved_by: " " } })).toBeUndefined();
    expect(evidenceFloorOf({})).toBeUndefined();
  });
});

const FLOOR_9 = {
  id: "REQ-coverage-floor",
  title: "Coverage floor",
  semanticText: "Line coverage must stay at or above 9 percent.",
};

describe("relatedCurrentRequirements", () => {
  test("lists the current requirements that share most terms, closest first, at most five", async () => {
    const current = [
      FLOOR_9,
      {
        id: "REQ-a-coverage-report",
        title: "Coverage report",
        semanticText: "The coverage report lists every line it counts.",
      },
      {
        id: "REQ-unrelated",
        title: "Login",
        semanticText: "Users sign in with a passkey.",
      },
      {
        id: "REQ-one-word",
        title: "Coverage",
        semanticText: "Coverage is shown.",
      },
      ...["b", "c", "d", "e", "f"].map((suffix) => ({
        id: `REQ-${suffix}-floor`,
        title: `Line coverage floor ${suffix}`,
        semanticText: "",
      })),
      { id: "REQ-new-floor", title: "old", semanticText: "old text" },
    ];
    const related = await relatedCurrentRequirements(
      req({
        id: "REQ-new-floor",
        properties: {
          title: "Coverage floor",
          semantic_text: "Line coverage must stay at or above 10 percent.",
        },
      }),
      context(),
      store({ current }),
    );
    expect(related.map((requirement) => requirement.id)).toEqual([
      "REQ-coverage-floor",
      "REQ-b-floor",
      "REQ-c-floor",
      "REQ-d-floor",
      "REQ-e-floor",
    ]);
    expect(related[0]).toEqual({
      id: "REQ-coverage-floor",
      statement: "Line coverage must stay at or above 9 percent.",
    });
    // A requirement without semantic text is shown by its title.
    expect(related[1]?.statement).toBe("Line coverage floor b");
  });

  test("ties break by shared words, then id; the written text falls back to the stored one", async () => {
    const related = await relatedCurrentRequirements(
      req({ id: "REQ-me", properties: { status: "open" } }),
      context(),
      store({
        current: [
          {
            id: "REQ-me",
            title: "Export button",
            semanticText: "Guests never see the export button on drafts.",
          },
          {
            id: "REQ-z",
            title: "Export",
            semanticText: "The export button exports drafts.",
          },
          {
            id: "REQ-y",
            title: "Export",
            semanticText: "Export button.",
          },
          {
            id: "REQ-x",
            title: "Export",
            semanticText: "Export button.",
          },
        ],
      }),
    );
    expect(related.map((requirement) => requirement.id)).toEqual([
      "REQ-z",
      "REQ-x",
      "REQ-y",
    ]);
  });

  test("a long statement is cut, and a share under half does not count", async () => {
    const long = `Coverage floor ${"word ".repeat(80)}`;
    const related = await relatedCurrentRequirements(
      req({ properties: { title: "Coverage floor", status: "open" } }),
      context(),
      store({
        current: [
          { id: "REQ-long", title: "x", semanticText: long },
          {
            id: "REQ-wide",
            title: "Coverage floor",
            semanticText: "",
          },
        ],
      }),
    );
    expect(related.map((requirement) => requirement.id)).toEqual([
      "REQ-long",
      "REQ-wide",
    ]);
    const statement = related[0]?.statement as string;
    expect(statement).toHaveLength(MAX_RELATED_STATEMENT);
    expect(statement.endsWith("word…")).toBe(true);
    const wide = await relatedCurrentRequirements(
      req({
        properties: {
          title: "Coverage floor percent stays line stable",
          status: "open",
        },
      }),
      context(),
      store({
        current: [
          { id: "REQ-two", title: "Coverage floor", semanticText: "" },
          {
            id: "REQ-short",
            title: "Coverage floor alpha beta gamma delta",
            semanticText: "",
          },
        ],
      }),
    );
    expect(wide.map((requirement) => requirement.id)).toEqual(["REQ-two"]);
  });

  test("none for other types, without a store, or when the read fails", async () => {
    const fact = { type: "fact", id: "F", properties: {} } as UpsertInput;
    expect(
      await relatedCurrentRequirements(
        fact,
        context(),
        store({ current: [FLOOR_9] }),
      ),
    ).toEqual([]);
    expect(await relatedCurrentRequirements(req(), context())).toEqual([]);
    expect(
      await relatedCurrentRequirements(
        req(),
        context(),
        store({ currentFails: true }),
      ),
    ).toEqual([]);
  });
});

describe("prologCaptureReads", () => {
  test("reads entities, links and current requirements from the store", async () => {
    const { prolog, goals } = scriptedProlog([
      ok({ Results: "[['REQ-a',req,[id='REQ-a',title=\"A\"]]]" }),
      ok(),
      fail(),
      ok({ Ids: "['SYM-b','kb:entity/SYM-a','SYM-b']" }),
      fail(),
      ok({ Ids: "['SCEN-a']" }),
      ok(),
      fail(),
      ok({ Json: "[]" }),
    ]);
    const reads = prologCaptureReads(prolog);
    expect(await reads.entity("REQ-a", "req")).toMatchObject({ title: "A" });
    expect(await reads.exists("TEST-it's")).toBe(true);
    expect(await reads.exists("TEST-b")).toBe(false);
    expect(await reads.implementingSymbols("REQ-a")).toEqual([
      "SYM-a",
      "SYM-b",
    ]);
    expect(await reads.implementingSymbols("REQ-a")).toEqual([]);
    expect(await reads.scenarios("REQ-a")).toEqual(["SCEN-a"]);
    expect(await reads.covered("SYM-a")).toBe(true);
    expect(await reads.tested("REQ-a")).toBe(false);
    expect(
      await reads.subjectGaps({
        semantic_inventory: [
          {
            claim_key: "C",
            claim_text: "t",
            role: "normative",
            status: "missing",
          },
        ],
      }),
    ).toEqual([{ claimKey: "C", claimText: "t", candidates: [], labels: [] }]);
    expect(goals.slice(1, 8)).toEqual([
      "once((kb_entity('TEST-it''s', _, _)))",
      "once((kb_entity('TEST-b', _, _)))",
      "findall(X, kb_relationship(implements, X, 'REQ-a'), Ids)",
      "findall(X, kb_relationship(implements, X, 'REQ-a'), Ids)",
      "findall(X, kb_relationship(specified_by, 'REQ-a', X), Ids)",
      "once((kb_relationship(covered_by, 'SYM-a', _) ; kb_relationship(executable_for, 'SYM-a', _)))",
      "once((kb_relationship(verified_by, 'REQ-a', _) ; kb_relationship(validates, _, 'REQ-a') ; (kb_relationship(specified_by, 'REQ-a', S), (kb_relationship(verified_by, S, _) ; kb_relationship(validates, _, S)))))",
    ]);
    const current = scriptedProlog([ok({ Ids: "[]" }), ok({ Results: "[]" })]);
    expect(
      await prologCaptureReads(current.prolog).currentRequirements(),
    ).toEqual([]);
  });
});
