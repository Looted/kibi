import { describe, expect, mock, test } from "bun:test";
import {
  NEW_SUBJECT_CHOICE,
  validateCompareClaimsResult,
  validateKibiPlugin,
  validateRankSubjectsResult,
} from "kibi-plugin-sdk";
import {
  JEV_SUBJECT_TOP_K,
  JevProviderError,
  createJevPlugin,
  createJevVocabularyAlignment,
  kibiPlugin,
} from "../src/index.js";
import type {
  JevClient,
  JevSystemOneRequest,
  JevSystemOneResult,
} from "../src/jev-client.js";

function recordingClient(result: JevSystemOneResult): {
  client: JevClient;
  requests: JevSystemOneRequest[];
} {
  const requests: JevSystemOneRequest[] = [];
  return {
    requests,
    client: {
      systemOne: mock(async (request: JevSystemOneRequest) => {
        requests.push(request);
        return result;
      }),
    },
  };
}

const clause = {
  claimKey: "CLAIM-A",
  text: "Idle logins time out after half an hour",
  proposedSubjectKey: "idle_login",
  candidates: Array.from({ length: 7 }, (_, index) => ({
    subjectKey: `subject.candidate_${index}`,
    score: 0.5 - index * 0.05,
    title: `Candidate ${index}`,
  })),
};

// executable_for TEST-kibi-vocabulary-alignment-capability
describe("kibi-plugin-jev vocabulary alignment", () => {
  test("declares the capability and creates no client until called", () => {
    const factory = mock(() => {
      throw new Error("must not be called on construction");
    });
    const provider = createJevVocabularyAlignment({ clientFactory: factory });
    expect(provider.id).toBe("jev-vocabulary-alignment");
    expect(factory).not.toHaveBeenCalled();
    expect(
      validateKibiPlugin(kibiPlugin).capabilities.vocabularyAlignment?.id,
    ).toBe("jev-vocabulary-alignment");
    expect(
      validateKibiPlugin(createJevPlugin({ clientFactory: factory }))
        .capabilities.vocabularyAlignment,
    ).toBeDefined();
  });

  test("rankSubjects asks one choice question over the top-k plus new_subject", async () => {
    const { client, requests } = recordingClient({
      answers: {
        "subject:CLAIM-A": {
          choice: "subject.candidate_2",
          probabilities: { "subject.candidate_2": 0.8 },
        },
      },
    });
    const provider = createJevVocabularyAlignment({
      clientFactory: () => client,
      model: "jev-test",
    });
    const result = await provider.rankSubjects({ clauses: [clause] });
    expect(validateRankSubjectsResult(result, [clause]).decisions).toEqual([
      { claimKey: "CLAIM-A", choice: "subject.candidate_2", confidence: 0.8 },
    ]);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.model).toBe("jev-test");
    const question = requests[0]?.questions["subject:CLAIM-A"] as {
      criteria?: Record<string, string>;
    };
    const offered = Object.keys(
      question.criteria ?? (question as Record<string, unknown>),
    );
    expect(offered).toContain(NEW_SUBJECT_CHOICE);
    expect(offered.filter((key) => key.startsWith("subject."))).toHaveLength(
      JEV_SUBJECT_TOP_K,
    );
  });

  test("compareClaims maps one noul answer per pair to a candidate verdict", async () => {
    const { client } = recordingClient({
      answers: { "same:P1": { noul: 0.9 }, "same:P2": { noul: 0.2 } },
    });
    const provider = createJevVocabularyAlignment({
      clientFactory: () => client,
    });
    const pairs = [
      {
        pairKey: "P1",
        sharedKey: "session.lifetime",
        left: { claimText: "Sessions must expire after 30 minutes" },
        right: { claimText: "Idle logins time out after half an hour" },
      },
      {
        pairKey: "P2",
        sharedKey: "session.lifetime",
        left: { claimText: "Sessions must expire after 30 minutes" },
        right: { claimText: "Sessions must last at least 8 hours" },
      },
    ];
    const result = validateCompareClaimsResult(
      await provider.compareClaims({ pairs }),
      ["P1", "P2"],
    );
    expect(result.judgments).toEqual([
      { pairKey: "P1", sameObligation: true, confidence: 0.9 },
      { pairKey: "P2", sameObligation: false, confidence: 0.8 },
    ]);
  });

  test("malformed or failing responses surface as JevProviderError with the model", async () => {
    const malformed = createJevVocabularyAlignment({
      clientFactory: () => recordingClient({ answers: {} }).client,
      model: "jev-test",
    });
    const error = await malformed
      .rankSubjects({ clauses: [clause] })
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(JevProviderError);
    expect((error as JevProviderError).code).toBe("malformed");
    expect((error as JevProviderError).model).toBe("jev-test");

    const failing = createJevVocabularyAlignment({
      clientFactory: () => ({
        systemOne: async () => {
          throw Object.assign(new Error("rate limit exceeded"), {
            status: 429,
          });
        },
      }),
    });
    const quota = await failing
      .compareClaims({
        pairs: [
          {
            pairKey: "P1",
            sharedKey: "s.k",
            left: { claimText: "a" },
            right: { claimText: "b" },
          },
        ],
      })
      .catch((caught: unknown) => caught);
    expect((quota as JevProviderError).code).toBe("quota");
  });

  test("empty inputs never call the provider", async () => {
    const factory = mock(() => recordingClient({ answers: {} }).client);
    const provider = createJevVocabularyAlignment({ clientFactory: factory });
    expect(await provider.rankSubjects({ clauses: [] })).toEqual({
      decisions: [],
    });
    expect(await provider.compareClaims({ pairs: [] })).toEqual({
      judgments: [],
    });
    expect(factory).not.toHaveBeenCalled();
  });
});
