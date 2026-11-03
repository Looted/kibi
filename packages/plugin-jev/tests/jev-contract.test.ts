import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import * as realSdk from "@typesafe-ai/sdk";
import {
  JEV_MAX_TIMEOUT_MS,
  JEV_SUBJECT_TOP_K,
  JevProviderError,
  createJevSemanticClassifier,
  createJevVocabularyAlignment,
  mapJevError,
  resolveJevModel,
  resolveJevTimeoutMs,
} from "../src/index.js";
import {
  type JevClient,
  type JevSystemOneRequest,
  type JevSystemOneResult,
  asChoice,
  asNoul,
  choiceConfidence,
  clamp01,
} from "../src/jev-client.js";
import { choice, noul } from "../src/typesafe-client.js";

const savedEnv = {
  model: process.env.KIBI_JEV_MODEL,
  timeout: process.env.KIBI_JEV_TIMEOUT_MS,
};
function setEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    // biome-ignore lint/performance/noDelete: unset must remove the key.
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
beforeEach(() => {
  setEnv("KIBI_JEV_MODEL", undefined);
  setEnv("KIBI_JEV_TIMEOUT_MS", undefined);
});
afterEach(() => {
  setEnv("KIBI_JEV_MODEL", savedEnv.model);
  setEnv("KIBI_JEV_TIMEOUT_MS", savedEnv.timeout);
});

function recordingClient(answers: JevSystemOneResult["answers"]): {
  client: JevClient;
  requests: JevSystemOneRequest[];
} {
  const requests: JevSystemOneRequest[] = [];
  return {
    requests,
    client: {
      async systemOne(request) {
        requests.push(request);
        return { answers };
      },
    },
  };
}

async function rejection(promise: Promise<unknown>): Promise<JevProviderError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(JevProviderError);
    return error as JevProviderError;
  }
  throw new Error("expected a rejection");
}

function thrown(run: () => unknown): JevProviderError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(JevProviderError);
    return error as JevProviderError;
  }
  throw new Error("expected a throw");
}

describe("JevProviderError and mapJevError", () => {
  test("errors carry name, code, cause and optional model", () => {
    const plain = new JevProviderError("timeout", "slow");
    expect(plain.name).toBe("JevProviderError");
    expect(plain.code).toBe("timeout");
    expect(plain.model).toBeUndefined();
    const cause = new Error("root");
    const withModel = new JevProviderError("quota", "q", { cause, model: "m" });
    expect(withModel.model).toBe("m");
    expect(withModel.cause).toBe(cause);
    expect(mapJevError(withModel)).toBe(withModel);
  });

  test("messages and statuses map onto stable codes", () => {
    const status = (code: number, message = "x") =>
      Object.assign(new Error(message), { status: code });
    const named = (name: string, message = "x") =>
      Object.assign(new Error(message), { name });
    const cases: [unknown, string][] = [
      [new Error("TYPESAFE_API_KEY is missing"), "missing_api_key"],
      [new Error("TYPESAFE_API_KEY was not set"), "missing_api_key"],
      [new Error("missing the api key"), "missing_api_key"],
      [new Error("API key is required"), "missing_api_key"],
      [status(401), "auth"],
      [new Error("Unauthorized"), "auth"],
      [new Error("invalid key"), "auth"],
      [new Error("invalid api key"), "auth"],
      [new Error("authentication failed"), "auth"],
      [new Error("invalid credentials"), "auth"],
      [new Error("request Timeout"), "timeout"],
      [named("TimeoutError"), "timeout"],
      [new Error("quota exceeded"), "quota"],
      [new Error("billing issue"), "quota"],
      [new Error("payment required"), "quota"],
      [new Error("rate limit hit"), "quota"],
      [status(429), "quota"],
      [status(402), "quota"],
      [new Error("permission denied"), "auth"],
      [new Error("Forbidden"), "auth"],
      [status(403), "auth"],
      [new Error("cannot connect"), "network"],
      [new Error("network down"), "network"],
      [new Error("ECONNRESET"), "network"],
      [new Error("ENOTFOUND host"), "network"],
      [new Error("fetch failed"), "network"],
      [named("ConnectionError"), "network"],
      [new Error("unknown model"), "unsupported"],
      [new Error("unsupported feature"), "unsupported"],
      [new Error("invalid_request"), "unsupported"],
      [status(400), "unsupported"],
      [status(500), "unknown"],
      [{ status: 401 }, "auth"],
      [{ status: "401" }, "unknown"],
      [null, "unknown"],
      [undefined, "unknown"],
      ["plain string", "unknown"],
    ];
    for (const [error, code] of cases) {
      const mapped = mapJevError(error);
      expect([String(error), mapped.code]).toEqual([String(error), code]);
      expect(mapped.cause).toBe(error);
    }
    expect(mapJevError("text").message).toBe("text");
    expect(mapJevError(new Error("boom")).message).toBe("boom");
  });
});

describe("answer helpers", () => {
  test("clamp01", () => {
    expect([clamp01(-1), clamp01(0.3), clamp01(2)]).toEqual([0, 0.3, 1]);
  });

  test("asChoice and asNoul reject malformed answers", () => {
    for (const answer of [undefined, null, 5, "predicate", {}, { choice: 1 }]) {
      const error = thrown(() => asChoice(answer));
      expect([error.code, error.message]).toEqual([
        "malformed",
        "Jev Choice answer is missing a string choice field",
      ]);
    }
    const ok = { choice: "rule" };
    expect(asChoice(ok)).toBe(ok);
    for (const answer of [
      undefined,
      null,
      5,
      {},
      { noul: "0.5" },
      { noul: Number.NaN },
      { noul: Number.POSITIVE_INFINITY },
    ]) {
      const error = thrown(() => asNoul(answer));
      expect([error.code, error.message]).toEqual([
        "malformed",
        "Jev Noul answer is missing a finite numeric noul field",
      ]);
    }
    const noulAnswer = { noul: 0 };
    expect(asNoul(noulAnswer)).toBe(noulAnswer);
  });

  test("choiceConfidence prefers finite confidence, then the chosen probability", () => {
    expect(choiceConfidence({ choice: "a", confidence: 0.2 })).toBe(0.2);
    expect(choiceConfidence({ choice: "a", confidence: 3 })).toBe(1);
    expect(
      choiceConfidence({
        choice: "a",
        confidence: Number.NaN,
        probabilities: { a: 0.7 },
      }),
    ).toBe(0.7);
    expect(choiceConfidence({ choice: "a", probabilities: { a: -2 } })).toBe(0);
    expect(
      choiceConfidence({ choice: "a", probabilities: { a: Number.NaN } }),
    ).toBe(0.5);
    expect(choiceConfidence({ choice: "a", probabilities: { b: 0.9 } })).toBe(
      0.5,
    );
    expect(choiceConfidence({ choice: "a" })).toBe(0.5);
  });
});

describe("model and timeout resolution", () => {
  test("model precedence", () => {
    expect(resolveJevModel(" m1 ", { KIBI_JEV_MODEL: "env" })).toBe("m1");
    expect(resolveJevModel("  ", { KIBI_JEV_MODEL: " env " })).toBe("env");
    expect(resolveJevModel(undefined, { KIBI_JEV_MODEL: " " })).toBe(
      "jev-latest",
    );
    expect(resolveJevModel(undefined, {})).toBe("jev-latest");
  });

  test("timeouts at their bounds", () => {
    expect(resolveJevTimeoutMs(1, {})).toBe(1);
    expect(resolveJevTimeoutMs(JEV_MAX_TIMEOUT_MS, {})).toBe(
      JEV_MAX_TIMEOUT_MS,
    );
    expect(
      resolveJevTimeoutMs(undefined, { KIBI_JEV_TIMEOUT_MS: " 250 " }),
    ).toBe(250);
    expect(resolveJevTimeoutMs(undefined, { KIBI_JEV_TIMEOUT_MS: " " })).toBe(
      undefined,
    );
    expect(resolveJevTimeoutMs(undefined, {})).toBe(undefined);
    for (const value of [0, -5, 1.5, JEV_MAX_TIMEOUT_MS + 1]) {
      const error = thrown(() => resolveJevTimeoutMs(value, {}));
      expect([error.code, error.message]).toEqual([
        "malformed",
        `JevSemanticClassifierOptions.timeoutMs must be a positive integer of at most ${JEV_MAX_TIMEOUT_MS} milliseconds; received ${JSON.stringify(String(value))}`,
      ]);
    }
    const tooLarge = thrown(() =>
      resolveJevTimeoutMs(undefined, { KIBI_JEV_TIMEOUT_MS: "120001" }),
    );
    expect(tooLarge.message).toEndWith('received "120001"');
    const fortyChars = "x".repeat(40);
    expect(
      thrown(() =>
        resolveJevTimeoutMs(undefined, { KIBI_JEV_TIMEOUT_MS: fortyChars }),
      ).message,
    ).toEndWith(`received ${JSON.stringify(fortyChars)}`);
    expect(
      thrown(() =>
        resolveJevTimeoutMs(undefined, {
          KIBI_JEV_TIMEOUT_MS: `${fortyChars}y`,
        }),
      ).message,
    ).toEndWith(`received ${JSON.stringify(`${fortyChars}…`)}`);
    expect(
      thrown(() =>
        resolveJevTimeoutMs(undefined, { KIBI_JEV_TIMEOUT_MS: "05" }),
      ).message,
    ).toBe(
      `KIBI_JEV_TIMEOUT_MS must be a positive integer of at most ${JEV_MAX_TIMEOUT_MS} milliseconds; received "05"`,
    );
  });
});

describe("semantic classifier requests", () => {
  test("no propositions means no client", async () => {
    let created = 0;
    const classifier = createJevSemanticClassifier({
      clientFactory: () => {
        created += 1;
        return recordingClient({}).client;
      },
    });
    expect(await classifier.classify({ propositions: [] })).toStrictEqual({
      decisions: [],
    });
    expect(created).toBe(0);
  });

  test("the request carries every proposition and question exactly", async () => {
    const factoryOptions: unknown[] = [];
    const { client, requests } = recordingClient({
      "lane:c1": { choice: "rule", confidence: 0.4 },
      "ambiguous:c1": { noul: 0.5 },
      "lane:c2": { choice: "none" },
      "ambiguous:c2": { noul: 0.4999 },
    });
    const classifier = createJevSemanticClassifier({
      model: "m",
      apiKey: "k",
      timeoutMs: 10,
      clientFactory: (options) => {
        factoryOptions.push(options);
        return client;
      },
    });
    expect(classifier.model).toBe("m");
    const result = await classifier.classify({
      propositions: [
        {
          claimKey: "c1",
          statement: "s1",
          role: "requirement",
          normative: true,
          signals: [{ kind: "permission" }, { kind: "conditional" }],
        } as never,
        { claimKey: "c2", statement: "s2" },
      ],
    });
    await classifier.classify({
      propositions: [{ claimKey: "c1", statement: "s1" }],
    });
    expect(factoryOptions).toStrictEqual([{ apiKey: "k", timeoutMs: 10 }]);
    expect(result).toStrictEqual({
      decisions: [
        {
          claimKey: "c1",
          lane: "rule",
          confidence: 0.4,
          ambiguity: { ambiguous: true, confidence: 0.5 },
          signals: ["permission", "conditional"],
        },
        {
          claimKey: "c2",
          lane: "none",
          confidence: 0.5,
          ambiguity: { ambiguous: false, confidence: 0.4999 },
        },
      ],
    });
    const laneQuestion = choice(
      "Select the Kibi modeling lane for this proposition.",
      expect.anything() as never,
    );
    expect(requests).toHaveLength(2);
    const first = requests[0] as JevSystemOneRequest;
    expect(first.model).toBe("m");
    expect(Object.keys(first.questions)).toEqual([
      "lane:c1",
      "ambiguous:c1",
      "lane:c2",
      "ambiguous:c2",
    ]);
    expect(first.questions["ambiguous:c1"]).toEqual(
      noul(
        "Is this proposition materially ambiguous between multiple modeling lanes?",
      ),
    );
    const lane = first.questions["lane:c1"] as Record<string, unknown>;
    expect(JSON.stringify(lane)).toContain(
      "Select the Kibi modeling lane for this proposition.",
    );
    expect(laneQuestion).toBeDefined();
    const state = first.state as {
      propositions: unknown[];
      laneDefinitions: Record<string, string>;
    };
    expect(state.propositions).toStrictEqual([
      {
        claimKey: "c1",
        statement: "s1",
        role: "requirement",
        normative: true,
        signals: [{ kind: "permission" }, { kind: "conditional" }],
      },
      {
        claimKey: "c2",
        statement: "s2",
        role: null,
        normative: null,
        signals: [],
      },
    ]);
    expect(Object.keys(state.laneDefinitions)).toEqual([
      "strict_property",
      "predicate",
      "rule",
      "observation_review",
      "none",
    ]);
    for (const text of Object.values(state.laneDefinitions)) {
      expect(text.length).toBeGreaterThan(20);
    }
    expect(JSON.stringify(lane)).toContain(
      state.laneDefinitions.rule as string,
    );
  });

  test("the factory gets no options when none are configured", async () => {
    const factoryOptions: unknown[] = [];
    const classifier = createJevSemanticClassifier({
      clientFactory: (options) => {
        factoryOptions.push(options);
        return recordingClient({
          "lane:c": { choice: "rule" },
          "ambiguous:c": { noul: 0 },
        }).client;
      },
    });
    await classifier.classify({
      propositions: [{ claimKey: "c", statement: "s" }],
    });
    expect(factoryOptions).toStrictEqual([{}]);
  });

  test("unsupported lanes and provider failures carry the model", async () => {
    const bad = createJevSemanticClassifier({
      model: "m",
      clientFactory: () =>
        recordingClient({
          "lane:c": { choice: "vibes" },
          "ambiguous:c": { noul: 0 },
        }).client,
    });
    const error = await rejection(
      bad.classify({ propositions: [{ claimKey: "c", statement: "s" }] }),
    );
    expect([error.code, error.message, error.model]).toEqual([
      "malformed",
      "Jev returned unsupported lane 'vibes'",
      "m",
    ]);
    expect((error.cause as JevProviderError).code).toBe("malformed");

    const failing = createJevSemanticClassifier({
      model: "m",
      clientFactory: () => ({
        systemOne: async () => {
          throw new Error("rate limit");
        },
      }),
    });
    const quota = await rejection(
      failing.classify({ propositions: [{ claimKey: "c", statement: "s" }] }),
    );
    expect([quota.code, quota.message, quota.model]).toEqual([
      "quota",
      "rate limit",
      "m",
    ]);
  });

  test("invalid timeout configuration names the model; other errors pass through", () => {
    setEnv("KIBI_JEV_MODEL", "env-model");
    const error = thrown(() => createJevSemanticClassifier({ timeoutMs: 0 }));
    expect([error.code, error.model]).toEqual(["malformed", "env-model"]);
    expect((error.cause as JevProviderError).code).toBe("malformed");
  });
});

describe("vocabulary alignment requests", () => {
  test("empty inputs never create a client", async () => {
    let created = 0;
    const alignment = createJevVocabularyAlignment({
      clientFactory: () => {
        created += 1;
        return recordingClient({}).client;
      },
    });
    expect(await alignment.rankSubjects({ clauses: [] })).toStrictEqual({
      decisions: [],
    });
    expect(await alignment.compareClaims({ pairs: [] })).toStrictEqual({
      judgments: [],
    });
    expect(created).toBe(0);
  });

  test("rankSubjects asks over the top candidates and new_subject", async () => {
    const factoryOptions: unknown[] = [];
    const { client, requests } = recordingClient({
      "subject:c1": { choice: "s1", confidence: 0.9 },
      "subject:c2": {
        choice: "new_subject",
        probabilities: { new_subject: 0.6 },
      },
    });
    const alignment = createJevVocabularyAlignment({
      model: "m",
      apiKey: "k",
      clientFactory: (options) => {
        factoryOptions.push(options);
        return client;
      },
    });
    const candidates = Array.from(
      { length: JEV_SUBJECT_TOP_K + 1 },
      (_, i) => ({
        subjectKey: `s${i}`,
        ...(i === 1
          ? { title: "One", requirementTitles: ["r1", "r2", "r3", "r4"] }
          : {}),
      }),
    );
    const result = await alignment.rankSubjects({
      clauses: [
        { claimKey: "c1", text: "t1", proposedSubjectKey: "s1", candidates },
        { claimKey: "c2", text: "t2", candidates: [] },
      ],
    } as never);
    expect(factoryOptions).toStrictEqual([{ apiKey: "k" }]);
    expect(result).toStrictEqual({
      decisions: [
        { claimKey: "c1", choice: "s1", confidence: 0.9 },
        { claimKey: "c2", choice: "new_subject", confidence: 0.6 },
      ],
    });
    const request = requests[0] as JevSystemOneRequest;
    expect(request.model).toBe("m");
    expect(request.state).toStrictEqual({
      clauses: [
        { claimKey: "c1", text: "t1", proposedSubjectKey: "s1" },
        { claimKey: "c2", text: "t2", proposedSubjectKey: null },
      ],
    });
    const newSubject =
      "None of the existing subjects is what this clause governs; declare a new subject";
    expect(request.questions["subject:c1"]).toEqual(
      choice("Which existing subject does this requirement clause govern?", {
        s0: "s0",
        s1: "One | r1 | r2 | r3",
        s2: "s2",
        s3: "s3",
        s4: "s4",
        new_subject: newSubject,
      }),
    );
    expect(request.questions["subject:c2"]).toEqual(
      choice("Which existing subject does this requirement clause govern?", {
        new_subject: newSubject,
      }),
    );
  });

  test("compareClaims asks one noul per pair", async () => {
    const factoryOptions: unknown[] = [];
    const { client, requests } = recordingClient({
      "same:p1": { noul: 0.5 },
      "same:p2": { noul: 0.2 },
      "same:p3": { noul: 7 },
    });
    const alignment = createJevVocabularyAlignment({
      timeoutMs: 5,
      clientFactory: (options) => {
        factoryOptions.push(options);
        return client;
      },
    });
    const pair = (pairKey: string) => ({
      pairKey,
      sharedKey: `k-${pairKey}`,
      left: { claimText: `l-${pairKey}` },
      right: { claimText: `r-${pairKey}` },
    });
    const result = await alignment.compareClaims({
      pairs: [pair("p1"), pair("p2"), pair("p3")],
    } as never);
    expect(factoryOptions).toStrictEqual([{ timeoutMs: 5 }]);
    expect(result).toStrictEqual({
      judgments: [
        { pairKey: "p1", sameObligation: true, confidence: 0.5 },
        { pairKey: "p2", sameObligation: false, confidence: 0.8 },
        { pairKey: "p3", sameObligation: true, confidence: 1 },
      ],
    });
    const request = requests[0] as JevSystemOneRequest;
    expect(request.model).toBe("jev-latest");
    expect(request.state).toStrictEqual({
      pairs: [
        { pairKey: "p1", sharedKey: "k-p1", left: "l-p1", right: "r-p1" },
        { pairKey: "p2", sharedKey: "k-p2", left: "l-p2", right: "r-p2" },
        { pairKey: "p3", sharedKey: "k-p3", left: "l-p3", right: "r-p3" },
      ],
    });
    expect(request.questions).toEqual({
      "same:p1": noul(
        "Do these two requirement claims state the same obligation, so one is a paraphrase of the other?",
      ),
      "same:p2": noul(
        "Do these two requirement claims state the same obligation, so one is a paraphrase of the other?",
      ),
      "same:p3": noul(
        "Do these two requirement claims state the same obligation, so one is a paraphrase of the other?",
      ),
    });
  });

  test("failures carry the model", async () => {
    const alignment = createJevVocabularyAlignment({
      model: "m",
      clientFactory: () =>
        recordingClient({ "subject:c": { choice: 1 }, "same:p": {} }).client,
    });
    const ranked = await rejection(
      alignment.rankSubjects({
        clauses: [{ claimKey: "c", text: "t", candidates: [] }],
      } as never),
    );
    expect([ranked.code, ranked.model]).toEqual(["malformed", "m"]);
    const compared = await rejection(
      alignment.compareClaims({
        pairs: [
          {
            pairKey: "p",
            sharedKey: "k",
            left: { claimText: "l" },
            right: { claimText: "r" },
          },
        ],
      } as never),
    );
    expect([compared.code, compared.model, compared.cause]).toEqual([
      "malformed",
      "m",
      expect.any(JevProviderError),
    ]);
  });
});

describe("TypeSafe client factory", () => {
  test("requires an API key and maps provider errors", async () => {
    const calls: unknown[] = [];
    const constructed: unknown[] = [];
    let failWith: unknown;
    mock.module("@typesafe-ai/sdk", () => ({
      TypeSafeClient: class {
        constructor(options: unknown) {
          constructed.push(options);
        }
        async systemOne(request: unknown) {
          calls.push(request);
          if (failWith) throw failWith;
          return { answers: { q: { noul: 1 } } };
        }
      },
      choice: realSdk.choice,
      noul: realSdk.noul,
    }));
    const { createTypeSafeJevClient } = await import(
      `../src/typesafe-client.js?mock=${Date.now()}`
    );
    const savedKey = process.env.TYPESAFE_API_KEY;
    try {
      setEnv("TYPESAFE_API_KEY", undefined);
      for (const apiKey of [undefined, "", "  "]) {
        const error = thrown(() => createTypeSafeJevClient({ apiKey }));
        expect([error.code, error.message]).toEqual([
          "missing_api_key",
          "TYPESAFE_API_KEY is required to use kibi-plugin-jev",
        ]);
      }
      setEnv("TYPESAFE_API_KEY", "env-key");
      const fromEnv = createTypeSafeJevClient();
      const explicit = createTypeSafeJevClient({ apiKey: "k", timeoutMs: 9 });
      expect(constructed).toStrictEqual([
        { apiKey: "env-key" },
        { apiKey: "k", timeout: 9 },
      ]);
      expect(
        await fromEnv.systemOne({ state: { a: 1 }, questions: { q: 1 } }),
      ).toStrictEqual({ answers: { q: { noul: 1 } } });
      await explicit.systemOne({ model: "m", state: null, questions: {} });
      expect(calls).toStrictEqual([
        { state: { a: 1 }, questions: { q: 1 } },
        { model: "m", state: null, questions: {} },
      ]);
      failWith = Object.assign(new Error("nope"), { status: 401 });
      const error = await rejection(
        explicit.systemOne({ state: null, questions: {} }),
      );
      expect(error.code).toBe("auth");
    } finally {
      setEnv("TYPESAFE_API_KEY", savedKey);
      // Module mocks outlive mock.restore(); put the real SDK back.
      mock.module("@typesafe-ai/sdk", () => realSdk);
      mock.restore();
    }
  });
});
