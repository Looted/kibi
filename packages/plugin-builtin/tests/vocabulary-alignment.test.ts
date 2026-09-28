import { describe, expect, test } from "bun:test";
import { NEW_SUBJECT_CHOICE, validateKibiPlugin } from "kibi-plugin-sdk";
import {
  BUILTIN_SUBJECT_REUSE_THRESHOLD,
  claimSimilarity,
  createBuiltinVocabularyAlignment,
  kibiPlugin,
  rankSubjectCandidates,
  vocabularyTokens,
} from "../src/index.js";

const vocabulary = [
  {
    subjectKey: "kibi.cli.check.staged",
    title: "Staged check gate",
    requirements: [
      { id: "REQ-cli-staged", title: "Staged check blocks commits" },
    ],
  },
  { subjectKey: "kibi.check", title: "Kibi check" },
  { subjectKey: "session.lifetime", title: "Session lifetime" },
  { subjectKey: "kibi.cli.gc", title: "Garbage collection" },
];

// executable_for TEST-kibi-vocabulary-alignment-capability
describe("builtin vocabulary alignment", () => {
  test("the builtin plugin declares the capability without network access", () => {
    const plugin = validateKibiPlugin(kibiPlugin);
    expect(plugin.capabilities.vocabularyAlignment?.id).toBe(
      "kibi-plugin-builtin.vocabulary-alignment",
    );
    expect(plugin.permissions.network).toBe(false);
  });

  test("tokens drop stopwords, split subject keys, and fold plurals", () => {
    expect(
      vocabularyTokens("Sessions must expire after thirty minutes"),
    ).toEqual(["session", "expire", "after", "thirty", "minute"]);
    expect(vocabularyTokens("kibi.cli.check_staged")).toEqual([
      "kibi",
      "cli",
      "check",
      "staged",
    ]);
  });

  test("ranks the specific subject above a generic one and is deterministic", () => {
    const clause = "The kibi check staged gate must block behavior edits";
    const first = rankSubjectCandidates(clause, vocabulary);
    const second = rankSubjectCandidates(clause, [...vocabulary].reverse());
    expect(first).toEqual(second);
    expect(first[0]?.subjectKey).toBe("kibi.cli.check.staged");
    expect(first.map((c) => c.subjectKey)).not.toContain("session.lifetime");
    expect(rankSubjectCandidates("", vocabulary)).toEqual([]);
    expect(rankSubjectCandidates(clause, [])).toEqual([]);
  });

  test("rankSubjects reuses the proposed key, a strong candidate, or declares new", () => {
    const provider = createBuiltinVocabularyAlignment();
    const result = provider.rankSubjects({
      clauses: [
        {
          claimKey: "exact",
          text: "anything",
          proposedSubjectKey: "Session.Lifetime",
          candidates: [
            { subjectKey: "kibi.check", score: 0.9 },
            { subjectKey: "session.lifetime", score: 0.1 },
          ],
        },
        {
          claimKey: "strong",
          text: "staged gate",
          candidates: [
            {
              subjectKey: "kibi.cli.check.staged",
              score: BUILTIN_SUBJECT_REUSE_THRESHOLD,
            },
          ],
        },
        {
          claimKey: "weak",
          text: "invoices",
          candidates: [{ subjectKey: "kibi.check", score: 0.1 }],
        },
      ],
    });
    expect(result.decisions).toEqual([
      { claimKey: "exact", choice: "session.lifetime", confidence: 1 },
      {
        claimKey: "strong",
        choice: "kibi.cli.check.staged",
        confidence: BUILTIN_SUBJECT_REUSE_THRESHOLD,
      },
      { claimKey: "weak", choice: NEW_SUBJECT_CHOICE, confidence: 0.9 },
    ]);
  });

  test("claim similarity is conservative and never equates opposite polarity", () => {
    expect(
      claimSimilarity(
        "Sessions must expire after 30 minutes of inactivity",
        "Sessions shall expire after 30 minutes of inactivity",
      ),
    ).toBe(1);
    expect(
      claimSimilarity("Sessions must expire", "Sessions must not expire"),
    ).toBe(0);
    expect(
      claimSimilarity(
        "Admin sessions must expire after 15 minutes",
        "Admin sessions must expire after 60 minutes",
      ),
    ).toBe(0);
    expect(
      claimSimilarity(
        "Attachments must be at most 3 Mb",
        "Attachments must be at most 3 MB",
      ),
    ).toBe(0);
    const provider = createBuiltinVocabularyAlignment();
    expect(
      provider
        .compareClaims({
          pairs: [
            {
              pairKey: "same",
              sharedKey: "session.lifetime",
              left: { claimText: "Sessions must expire after 30 minutes" },
              right: { claimText: "Sessions shall expire after 30 minutes" },
            },
            {
              pairKey: "paraphrase",
              sharedKey: "session.lifetime",
              left: { claimText: "Sessions must expire after 30 minutes" },
              right: { claimText: "Idle logins time out after half an hour" },
            },
          ],
        })
        .judgments.map((j) => [j.pairKey, j.sameObligation]),
    ).toEqual([
      ["same", true],
      ["paraphrase", false],
    ]);
  });
});
