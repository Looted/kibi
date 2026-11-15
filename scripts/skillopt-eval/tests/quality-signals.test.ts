import { describe, expect, test } from "bun:test";
import type { CaseSignalContext } from "../runtime/case-signals";
import { QUALITY_IDS, SPLIT_INSTRUCTION } from "../runtime/quality-seeds";
import {
  qualityForbiddenObserved,
  qualitySignalObserved,
} from "../runtime/quality-signals";

function written(body: string, dryRun = false): CaseSignalContext {
  return {
    results: [],
    brokerTools: [],
    answer: {
      text: "",
      answer: {
        source: "none",
        verdict: null,
        governing: [],
        conflict: null,
        unknowns: [],
        nextStep: null,
        proof: null,
      },
    },
    ordering: {
      firstKbSearchIndex: null,
      firstEditIndex: null,
      kibiCallsBeforeFirstEdit: 0,
      editedPaths: [],
    },
    workspaceFiles: {},
    workspaceAssertions: [],
    calls: [
      {
        tool: "kb_upsert",
        resultOk: true,
        args: {
          type: "req",
          id: QUALITY_IDS.label,
          dryRun,
          document: { body },
        },
      },
    ],
  };
}

const NOT_STATED_SIGNAL = "unstated reason recorded as not stated";

describe("missing-reason wording", () => {
  test.each([
    "Reason not stated.",
    "The reason was never recorded.",
    "Reason beyond the naming review not stated.",
    "No further reason is recorded beyond that naming review.",
    "No reason was given.",
  ])("counts %p as a recorded missing reason", (sentence) => {
    const context = written(`Statement.\n\n## Context\n\n${sentence}`);
    expect(qualitySignalObserved(NOT_STATED_SIGNAL, context)).toBe(true);
    expect(qualityForbiddenObserved("reason invented", context)).toBe(false);
  });

  test.each([
    "Requested by the export team.",
    "The reason is in the notes. Nothing was stated by the owner.",
    "Reasonable defaults are not documented here.",
  ])("does not count %p", (sentence) => {
    expect(qualitySignalObserved(NOT_STATED_SIGNAL, written(sentence))).toBe(
      false,
    );
  });

  test("ignores dry-run writes", () => {
    expect(
      qualitySignalObserved(
        NOT_STATED_SIGNAL,
        written("Reason not stated.", true),
      ),
    ).toBe(false);
  });

  test("still reports an invented reason", () => {
    const context = written(
      "Requested by the export team so that the importer routes rows.",
    );
    expect(qualityForbiddenObserved("reason invented", context)).toBe(true);
  });
});

function finalState(
  entities: readonly Record<string, unknown>[],
): CaseSignalContext {
  return {
    ...written(""),
    calls: [],
    results: [
      {
        tool: "kb_query",
        result: { structuredContent: { kibiProtocol: 1, data: { entities } } },
      },
    ],
  };
}

const PARENT = {
  type: "req",
  id: QUALITY_IDS.handling,
  status: "closed",
};

describe("broad requirement split", () => {
  test("counts a child that reuses another fixture's seeded id", () => {
    const child = {
      type: "req",
      id: QUALITY_IDS.label,
      status: "open",
      supersedes: [QUALITY_IDS.handling],
    };
    const other = { ...child, id: "REQ-fixture-family-name-only" };
    const context = finalState([PARENT, child, other]);
    expect(
      qualitySignalObserved(
        "parent closed and superseded by behavior-sized children",
        context,
      ),
    ).toBe(true);
  });

  test("allows an approval that quotes the person's split instruction", () => {
    const quoted = {
      type: "req",
      id: "REQ-fixture-family-child",
      status: "open",
      origin: {
        kind: "agent",
        approved_by: "person",
        ref: `approval-state.json: ${SPLIT_INSTRUCTION}`,
      },
    };
    expect(
      qualityForbiddenObserved(
        "quality approval set by the agent",
        finalState([quoted]),
      ),
    ).toBe(false);
    const bare = {
      ...quoted,
      origin: { kind: "agent", approved_by: "person" },
    };
    expect(
      qualityForbiddenObserved(
        "quality approval set by the agent",
        finalState([bare]),
      ),
    ).toBe(true);
  });
});
