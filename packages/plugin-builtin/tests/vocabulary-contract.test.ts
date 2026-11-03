import { describe, expect, test } from "bun:test";
import { NEW_SUBJECT_CHOICE } from "kibi-plugin-sdk";
import {
  BUILTIN_CLAIM_SIMILARITY_THRESHOLD,
  BUILTIN_SUBJECT_REUSE_THRESHOLD,
  BuiltinVocabularyAlignment,
  builtinSubjectDecision,
  claimSimilarity,
  createBuiltinVocabularyAlignment,
  rankSubjectCandidates,
  vocabularyTokens,
} from "../src/index";

const STOPWORDS =
  "a an and are as at be by can for from has have in into is it its may must of on or shall should so than that the their then this to was when which while will with";

describe("vocabularyTokens", () => {
  test("drops every stopword", () => {
    expect(vocabularyTokens(STOPWORDS)).toStrictEqual([]);
    expect(vocabularyTokens(STOPWORDS.toUpperCase())).toStrictEqual([]);
  });

  test("keeps negations, digits, and folds plurals", () => {
    expect(
      vocabularyTokens("not never no without forbid a1b2 Invoices status"),
    ).toStrictEqual([
      "not",
      "never",
      "no",
      "without",
      "forbid",
      "a1b2",
      "invoice",
      "status",
    ]);
  });

  test("drops both apostrophe forms and splits on any punctuation run", () => {
    expect(vocabularyTokens("--User's  Bob’s!!kibi.cli_gc--")).toStrictEqual([
      "user",
      "bob",
      "kibi",
      "cli",
      "gc",
    ]);
    expect(vocabularyTokens("!!!")).toStrictEqual([]);
  });
});

describe("rankSubjectCandidates", () => {
  const vocabulary = [
    {
      subjectKey: "billing.invoice",
      title: "Invoice delivery",
      requirements: [
        { id: "R1", title: "Invoices are emailed monthly" },
        { id: "R2" },
      ],
    },
    {
      subjectKey: "billing.refund",
      requirements: [{ id: "R3", title: "Refunds need approval here" }],
    },
    { subjectKey: "session.lifetime", title: "Session lifetime" },
    { subjectKey: "here.and.there" },
  ];

  test("weights key, title, and requirement matches and drops zero scores", () => {
    expect(
      rankSubjectCandidates(
        "Invoice delivery emails go out monthly for billing here",
        vocabulary,
      ),
    ).toStrictEqual([
      {
        subjectKey: "billing.invoice",
        score: 0.592,
        title: "Invoice delivery",
        requirementTitles: ["Invoices are emailed monthly"],
      },
      {
        subjectKey: "billing.refund",
        score: 0.14,
        requirementTitles: ["Refunds need approval here"],
      },
      { subjectKey: "here.and.there", score: 0.113 },
    ]);
  });

  test("a covered generic key loses to a partly covered specific one only by score", () => {
    expect(
      rankSubjectCandidates("billing refund", [
        { subjectKey: "billing.refund.policy" },
        { subjectKey: "billing" },
      ]),
    ).toStrictEqual([
      { subjectKey: "billing", score: 0.38 },
      { subjectKey: "billing.refund.policy", score: 0.31 },
    ]);
  });

  test("ties break by subject key", () => {
    expect(
      rankSubjectCandidates("alpha", [
        { subjectKey: "beta.alpha" },
        { subjectKey: "alpha.beta" },
        { subjectKey: "gamma" },
      ]),
    ).toStrictEqual([
      { subjectKey: "alpha.beta", score: 0.25 },
      { subjectKey: "beta.alpha", score: 0.25 },
    ]);
  });

  test("returns five candidates by default and honours a limit", () => {
    const six = ["a1", "a2", "a3", "a4", "a5", "a6"].map((key) => ({
      subjectKey: `shared.${key}`,
    }));
    const expected = ["a1", "a2", "a3", "a4", "a5"].map((key) => ({
      subjectKey: `shared.${key}`,
      score: 0.131,
    }));
    expect(rankSubjectCandidates("shared", six)).toStrictEqual(expected);
    expect(rankSubjectCandidates("shared", six, { limit: 2 })).toStrictEqual(
      expected.slice(0, 2),
    );
  });

  test("an empty clause or vocabulary ranks nothing", () => {
    expect(rankSubjectCandidates("the", vocabulary)).toStrictEqual([]);
    expect(rankSubjectCandidates("billing", [])).toStrictEqual([]);
  });
});

describe("claimSimilarity", () => {
  test.each([
    ["alpha beta gamma delta", "alpha beta gamma omega", 0.75],
    ["the", "a", 0],
    ["the", "alpha", 0],
    ["Users' files", "users files", 1],
    ["users must not delete files", "users must not delete folders", 0.75],
    ["timeout after 015 seconds", "timeout after 15 seconds", 0.75],
    ["wait 1.25 s", "wait 1.250 s", 0.75],
    ["wait 1.5 s", "wait 1.50 s", 0.75],
    ["cap 3MB", "cap 3 MB", 0.4],
    ["cap 3 MB", "cap 3 Mb", 0],
    ["retry 3", "retry 4", 0],
    ["retry 3", "retry 3 3", 0],
    ["3 s then 5 m", "5 m then 3 s", 1],
    ["1.5 s", "1.6 s", 0],
  ] as const)("%s ~ %s = %d", (left, right, expected) => {
    expect(claimSimilarity(left, right)).toBe(expected);
  });

  test.each(["not", "never", "no", "without", "forbid"])(
    "a claim negated by %s never equals the plain claim",
    (negation) => {
      expect(
        claimSimilarity(`users ${negation} delete files`, "users delete files"),
      ).toBe(0);
      expect(
        claimSimilarity("users delete files", `users ${negation} delete files`),
      ).toBe(0);
    },
  );
});

describe("builtinSubjectDecision", () => {
  test("reuses a candidate equal to the normalized proposed key", () => {
    expect(
      builtinSubjectDecision({
        claimKey: "c1",
        text: "anything",
        proposedSubjectKey: " .Billing\\Invoices//Due  Date. ",
        candidates: [
          { subjectKey: "other", score: 0.9 },
          { subjectKey: "billing.invoices.due_date", score: 0.1 },
        ],
      }),
    ).toStrictEqual({
      claimKey: "c1",
      choice: "billing.invoices.due_date",
      confidence: 1,
    });
  });

  test("otherwise reuses the top candidate from the threshold up", () => {
    expect(BUILTIN_SUBJECT_REUSE_THRESHOLD).toBe(0.4);
    expect(
      builtinSubjectDecision({
        claimKey: "c2",
        text: "anything",
        proposedSubjectKey: "missing",
        candidates: [{ subjectKey: "top", score: 0.4 }],
      }),
    ).toStrictEqual({ claimKey: "c2", choice: "top", confidence: 0.4 });
    expect(
      builtinSubjectDecision({
        claimKey: "c3",
        text: "anything",
        candidates: [{ subjectKey: "top", score: 0.3999 }],
      }),
    ).toStrictEqual({
      claimKey: "c3",
      choice: NEW_SUBJECT_CHOICE,
      confidence: 0.6,
    });
  });

  test("declares a new subject with full confidence when nothing is ranked", () => {
    expect(
      builtinSubjectDecision({
        claimKey: "c4",
        text: "anything",
        candidates: [],
      }),
    ).toStrictEqual({
      claimKey: "c4",
      choice: NEW_SUBJECT_CHOICE,
      confidence: 1,
    });
  });
});

describe("BuiltinVocabularyAlignment", () => {
  const provider = createBuiltinVocabularyAlignment();

  test("is the builtin provider with its id", () => {
    expect(provider).toBeInstanceOf(BuiltinVocabularyAlignment);
    expect(provider.id).toBe("kibi-plugin-builtin.vocabulary-alignment");
  });

  test("rankSubjects decides every clause", () => {
    expect(
      provider.rankSubjects({
        clauses: [
          { claimKey: "a", text: "x", candidates: [] },
          {
            claimKey: "b",
            text: "x",
            candidates: [{ subjectKey: "s", score: 0.5 }],
          },
        ],
      }),
    ).toStrictEqual({
      decisions: [
        { claimKey: "a", choice: NEW_SUBJECT_CHOICE, confidence: 1 },
        { claimKey: "b", choice: "s", confidence: 0.5 },
      ],
    });
  });

  test("compareClaims flags pairs from the similarity threshold up", () => {
    expect(BUILTIN_CLAIM_SIMILARITY_THRESHOLD).toBe(0.75);
    expect(
      provider.compareClaims({
        pairs: [
          {
            pairKey: "at",
            sharedKey: "k",
            left: { claimText: "alpha beta gamma delta" },
            right: { claimText: "alpha beta gamma omega" },
          },
          {
            pairKey: "below",
            sharedKey: "k",
            left: { claimText: "alpha beta gamma" },
            right: { claimText: "alpha beta delta" },
          },
        ],
      }),
    ).toStrictEqual({
      judgments: [
        { pairKey: "at", sameObligation: true, confidence: 0.75 },
        { pairKey: "below", sameObligation: false, confidence: 0.667 },
      ],
    });
  });
});
