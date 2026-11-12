import { describe, expect, test } from "bun:test";
import type { CaseSignalContext } from "../runtime/case-signals";
import { QUALITY_IDS } from "../runtime/quality-seeds";
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
