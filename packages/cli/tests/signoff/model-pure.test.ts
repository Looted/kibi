// implements REQ-kibi-signoff-views
import { describe, expect, test } from "bun:test";
import {
  SIGNOFF_BRIEF_DIR,
  SIGNOFF_CHANGE_LABELS,
  SIGNOFF_GATE_LABELS,
  SIGNOFF_LATEST_HTML,
  SIGNOFF_LATEST_JSON,
  SIGNOFF_LATEST_MARKDOWN,
  SIGNOFF_VERSION,
  type SignoffProof,
  type SignoffQuestion,
  type SignoffRequirement,
  approvalNumbers,
  approvalSentence,
  awaitsApproval,
  floorLabel,
  proofLabel,
  questionKind,
  questionOpen,
  statementSentenceDiff,
} from "../../src/signoff/model.js";

describe("signoff locations and labels", () => {
  test("the latest view lives under the signoff brief directory", () => {
    expect(SIGNOFF_VERSION).toBe("kibi.signoff.v1");
    expect(SIGNOFF_BRIEF_DIR).toBe(".kb/briefs/signoff");
    expect(SIGNOFF_LATEST_JSON).toBe(".kb/briefs/signoff/latest.json");
    expect(SIGNOFF_LATEST_MARKDOWN).toBe(".kb/briefs/signoff/latest.md");
    expect(SIGNOFF_LATEST_HTML).toBe(".kb/briefs/signoff/latest.html");
  });

  test("change and gate labels read as plain words", () => {
    expect(SIGNOFF_CHANGE_LABELS).toStrictEqual({
      new: "New",
      changed: "Changed",
      affected: "Affected by the code change (statement unchanged)",
      retired: "Superseded or retired",
    });
    expect(SIGNOFF_GATE_LABELS).toStrictEqual({
      semantic: "semantic model incomplete",
      scenario: "no scenario yet",
      implementation: "no owning code yet",
      e2e: "no end-to-end test yet",
      evidence: "end-to-end evidence not current",
      tested: "tested",
    });
  });
});

describe("proofLabel and floorLabel", () => {
  const proof = (fields: Partial<SignoffProof> = {}): SignoffProof => ({
    status: "tested",
    gate: "tested",
    testCount: 2,
    contradictions: [],
    ...fields,
  });

  test("missing and not-applicable proof", () => {
    expect(proofLabel(undefined)).toBe("not checked");
    expect(proofLabel(proof({ status: "not_applicable" }))).toBe(
      "not applicable",
    );
  });

  test("the gate and the test count", () => {
    expect(proofLabel(proof())).toBe("tested, 2 tests");
    expect(proofLabel(proof({ testCount: 1 }))).toBe("tested, 1 test");
    expect(proofLabel(proof({ gate: "e2e", testCount: 0 }))).toBe(
      "no end-to-end test yet, 0 tests",
    );
    expect(proofLabel(proof({ gate: "custom" }))).toBe("custom, 2 tests");
  });

  test("an evidence level other than tested is named", () => {
    expect(proofLabel(proof({ evidenceLevel: "tested" }))).toBe(
      "tested, 2 tests",
    );
    expect(proofLabel(proof({ evidenceLevel: "asserted" }))).toBe(
      "tested, 2 tests; evidence asserted",
    );
  });

  test("an evidence floor is appended", () => {
    expect(
      proofLabel(
        proof({
          evidenceLevel: "proved",
          evidenceFloor: {
            required: "tested",
            source: "explicit",
            status: "met",
          },
        }),
      ),
    ).toBe(
      "tested, 2 tests; evidence proved; floor tested set by required_evidence (met)",
    );
    expect(
      proofLabel(
        proof({
          evidenceFloor: {
            required: "unverified",
            source: "explicit",
            status: "met",
          },
        }),
      ),
    ).toBe("tested, 2 tests");
  });

  test("floor states and origins", () => {
    expect(floorLabel(undefined)).toBeUndefined();
    expect(
      floorLabel({ required: "proved", source: "firmness", status: "below" }),
    ).toBe("floor proved (below)");
    expect(
      floorLabel({
        required: "tested",
        source: "firmness",
        status: "pending_reproof",
      }),
    ).toBe("floor tested (pending re-proof)");
    expect(
      floorLabel({ required: "tested", source: "other", status: "odd" }),
    ).toBe("floor tested (below)");
  });
});

describe("questions", () => {
  const question = (
    fields: Partial<SignoffQuestion> = {},
  ): SignoffQuestion => ({
    statement: "S",
    number: 1,
    conflicts: [],
    ...fields,
  });

  test("a question is open until it has a non-blank answer", () => {
    expect(questionOpen({ statement: "S" })).toBe(true);
    expect(questionOpen({ statement: "S", answer: "  \n" })).toBe(true);
    expect(questionOpen({ statement: "S", answer: " yes " })).toBe(false);
  });

  test("the kind names a change, a conflict or a new rule", () => {
    const ref = { id: "REQ-1", title: "T", statement: "S" };
    expect(questionKind(question({ current: ref, conflicts: [ref] }))).toBe(
      "Change REQ-1",
    );
    expect(questionKind(question({ conflicts: [ref] }))).toBe(
      "Conflict with a recorded rule",
    );
    expect(questionKind(question())).toBe("New rule");
  });
});

describe("statementSentenceDiff", () => {
  test("no shared sentence means no sentence diff", () => {
    expect(statementSentenceDiff("A one.", "B two.")).toBeUndefined();
    expect(statementSentenceDiff("", "")).toBeUndefined();
    expect(statementSentenceDiff("", "A one.")).toBeUndefined();
  });

  test("an unchanged statement keeps every sentence", () => {
    expect(statementSentenceDiff("A one.", "A \t one.")).toEqual([
      { text: "A one.", change: "kept" },
    ]);
    expect(statementSentenceDiff("A one.  B two.", "A one.\nB two.")).toEqual([
      { text: "A one.", change: "kept" },
      { text: "B two.", change: "kept" },
    ]);
  });

  test("a replaced sentence is added before the one it removes", () => {
    expect(
      statementSentenceDiff("A one. B two. C three.", "A one. X new. C three."),
    ).toEqual([
      { text: "A one.", change: "kept" },
      { text: "X new.", change: "added" },
      { text: "B two.", change: "removed" },
      { text: "C three.", change: "kept" },
    ]);
  });

  test("sentences added or removed at either end", () => {
    expect(statementSentenceDiff("A one.", "Z first. A one. B last!")).toEqual([
      { text: "Z first.", change: "added" },
      { text: "A one.", change: "kept" },
      { text: "B last!", change: "added" },
    ]);
    expect(
      statementSentenceDiff("Z first? A one. B last.", " A one. "),
    ).toEqual([
      { text: "Z first?", change: "removed" },
      { text: "A one.", change: "kept" },
      { text: "B last.", change: "removed" },
    ]);
  });

  test("the longest common run of sentences is kept", () => {
    expect(
      statementSentenceDiff("A a. B b. C c. D d.", "B b. D d. A a."),
    ).toEqual([
      { text: "A a.", change: "removed" },
      { text: "B b.", change: "kept" },
      { text: "C c.", change: "removed" },
      { text: "D d.", change: "kept" },
      { text: "A a.", change: "added" },
    ]);
  });

  test("a sentence ends only before an uppercase, digit, quote or bracket", () => {
    expect(
      statementSentenceDiff(
        "Use v1.2 here. 2 more. \"Q\" said. (P) too. `c` ok. 'S' too. lower case.",
        "Use v1.2 here. 2 more. \"Q\" said. (P) too. `c` ok. 'S' too. lower case.",
      )?.map((sentence) => sentence.text),
    ).toEqual([
      "Use v1.2 here.",
      "2 more.",
      '"Q" said.',
      "(P) too.",
      "`c` ok.",
      "'S' too. lower case.",
    ]);
  });
});

describe("approvals", () => {
  const requirement = (
    fields: Partial<SignoffRequirement> = {},
  ): SignoffRequirement => ({
    id: "REQ-1",
    title: "T",
    change: "new",
    status: "open",
    statement: "S",
    originKind: "agent",
    supersedes: [],
    scenarios: [],
    symbols: [],
    source: "s.md",
    ...fields,
  });

  test("only unapproved new or changed agent requirements await approval", () => {
    expect(awaitsApproval(requirement())).toBe(true);
    expect(awaitsApproval(requirement({ change: "changed" }))).toBe(true);
    expect(awaitsApproval(requirement({ change: "affected" }))).toBe(false);
    expect(awaitsApproval(requirement({ change: "retired" }))).toBe(false);
    expect(awaitsApproval(requirement({ originKind: "human" }))).toBe(false);
    expect(awaitsApproval(requirement({ approvedBy: "pat" }))).toBe(false);
    expect(awaitsApproval(requirement({ approvedBy: "" }))).toBe(true);
  });

  test("approval numbers follow the view order", () => {
    expect(
      approvalNumbers([
        requirement(),
        requirement({ originKind: "human" }),
        requirement({ change: "changed" }),
      ]),
    ).toEqual([1, 3]);
  });

  test("the approval sentence lists the numbers", () => {
    expect(approvalSentence([])).toBe("");
    expect(approvalSentence([2])).toBe(
      "Requirement 2 was written by the agent and waits for your approval.",
    );
    expect(approvalSentence([1, 3])).toBe(
      "Requirements 1 and 3 were written by the agent and wait for your approval.",
    );
    expect(approvalSentence([1, 2, 5])).toBe(
      "Requirements 1, 2 and 5 were written by the agent and wait for your approval.",
    );
  });
});
