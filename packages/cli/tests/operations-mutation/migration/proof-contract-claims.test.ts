import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  type ClaimCandidate,
  type ClaimCandidateRow,
  PROOF_CONTRACT_CLAIMS_PIN_CODE,
  PROOF_CONTRACT_CLAIMS_REVIEW_CODE,
  applyProofContractClaimPins,
  claimReviewInstruction,
  planProofContractClaimPins,
  readProofContractClaimCandidates,
  withProofContractProves,
} from "../../../src/operations/migration/proof-contract-claims.js";
import * as prologJson from "../../../src/public/operations/prolog-json.js";
import * as runtimeTypes from "../../../src/public/operations/runtime-types.js";
import * as cliRuntime from "../../../src/runtime/cli-runtime.js";
import { removeTempWorkspaces, tempWorkspace } from "../workspace.js";

afterEach(removeTempWorkspaces);

const doc = (frontmatter: string) => `---\n${frontmatter}---\nBody.\n`;
const CONTRACT = "proof_contract:\n  kind: rule\n  rule: r\n";
const PINNED = (key: string) =>
  `proof_contract:\n  kind: rule\n  rule: r\n  proves:\n    - ${key}\n`;

function candidate(
  claim_key: string,
  binding: ClaimCandidate["binding"],
  reason?: string,
): ClaimCandidate {
  return {
    claim_key,
    requirement_id: `REQ-${claim_key}`,
    fact_id: `FACT-${claim_key}`,
    binding,
    ...(reason === undefined ? {} : { reason }),
  };
}

describe("codes", () => {
  test("are stable", () => {
    expect(PROOF_CONTRACT_CLAIMS_PIN_CODE).toBe("proof_contract_claims_pin");
    expect(PROOF_CONTRACT_CLAIMS_REVIEW_CODE).toBe(
      "proof_contract_claims_review",
    );
  });
});

describe("claimReviewInstruction", () => {
  const row = (kind: string, candidates: ClaimCandidate[]) => ({
    id: "TEST-a",
    path: "p.md",
    kind,
    candidates,
  });

  test("asks for a scenario link when the test reaches no claim", () => {
    expect(claimReviewInstruction(row("rule", []))).toBe(
      "TEST-a (p.md) has a rule proof contract, but its test reaches no modeled claim through a scenario. Link the test to the scenario of the requirement it proves, then add proof_contract.proves with the claim keys its certificate establishes and run kibi prove --test TEST-a.",
    );
  });

  test("lists every candidate and asks to choose among provable ones", () => {
    expect(
      claimReviewInstruction(
        row("rule", [
          candidate("k1", "derived"),
          candidate("k2", "derived"),
          candidate("k3", "attested"),
          candidate("k4", "incompatible", "too wide"),
          candidate("k5", "incompatible"),
        ]),
      ),
    ).toBe(
      "TEST-a (p.md) has a rule proof contract without proves. Claims its test reaches: k1 (REQ-k1, FACT-k1): provable; k2 (REQ-k2, FACT-k2): provable; k3 (REQ-k3, FACT-k3): attested only, the fact has no derivation; k4 (REQ-k4, FACT-k4): too wide; k5 (REQ-k5, FACT-k5): its kind cannot express the fact. Add proof_contract.proves with the claim keys its certificate establishes, then run kibi prove --test TEST-a.",
    );
  });

  test("asks to choose only when several claims are provable", () => {
    const head = (claims: string) =>
      `TEST-a (p.md) has a rule proof contract without proves. Claims its test reaches: ${claims}. `;
    const tail = ", then run kibi prove --test TEST-a.";
    expect(
      claimReviewInstruction(
        row("rule", [candidate("k1", "derived"), candidate("k2", "derived")]),
      ),
    ).toBe(
      `${head("k1 (REQ-k1, FACT-k1): provable; k2 (REQ-k2, FACT-k2): provable")}Add proof_contract.proves with the claim keys its certificate establishes${tail}`,
    );
    expect(
      claimReviewInstruction(
        row("rule", [candidate("k1", "derived"), candidate("k2", "attested")]),
      ),
    ).toBe(
      `${head("k1 (REQ-k1, FACT-k1): provable; k2 (REQ-k2, FACT-k2): attested only, the fact has no derivation")}None is provable by a rule certificate as modeled: add proof_contract.proves with the claim it establishes (it then counts as attested, not proved), or model that claim's grounding fact as a rule, predicate or set fact first${tail}`,
    );
  });

  test("names the fact kind each certificate kind derives", () => {
    const advice = (kind: string, candidates = [candidate("k", "attested")]) =>
      claimReviewInstruction(row(kind, candidates));
    const expected = (kind: string, factKind: string) =>
      `TEST-a (p.md) has a ${kind} proof contract without proves. Claims its test reaches: k (REQ-k, FACT-k): attested only, the fact has no derivation. None is provable by a ${kind} certificate as modeled: add proof_contract.proves with the claim it establishes (it then counts as attested, not proved), or model that claim's grounding fact as a ${factKind} fact first, then run kibi prove --test TEST-a.`;
    expect(advice("exhaustive")).toBe(expected("exhaustive", "set"));
    expect(advice("typecheck")).toBe(expected("typecheck", "set"));
    expect(advice("regex")).toBe(expected("regex", "string"));
    expect(advice("rule")).toBe(expected("rule", "rule, predicate or set"));
    expect(advice("state_machine")).toBe(
      expected("state_machine", "rule, predicate or set"),
    );
    expect(advice("bounded")).toBe(expected("bounded", "numeric"));
    expect(advice("regex", [candidate("k", "derived")])).toBe(
      "TEST-a (p.md) has a regex proof contract without proves. Claims its test reaches: k (REQ-k, FACT-k): provable. None is provable by a regex certificate as modeled: add proof_contract.proves with the claim it establishes (it then counts as attested, not proved), or model that claim's grounding fact as a string fact first, then run kibi prove --test TEST-a.",
    );
  });
});

describe("withProofContractProves", () => {
  test("appends proves at the block's indentation", () => {
    expect(
      withProofContractProves(doc(`id: T\n${CONTRACT}tags: [a]\n`), [
        "k1",
        "k2",
      ]),
    ).toBe(doc(`id: T\n${CONTRACT}  proves:\n    - k1\n    - k2\ntags: [a]\n`));
    expect(
      withProofContractProves(
        "---\r\nproof_contract:  \r\n   kind: rule\r\n---\r\n",
        ["k"],
      ),
    ).toBe(
      "---\r\nproof_contract:  \r\n   kind: rule\r\n   proves:\r\n      - k\r\n---\r\n",
    );
  });

  test("ends the block at the first line that is not indented", () => {
    expect(
      withProofContractProves(doc(`${CONTRACT}\n  # later\n`), ["k"]),
    ).toBe(doc(`${CONTRACT}  proves:\n    - k\n\n  # later\n`));
  });

  test("extends only the top-level contract", () => {
    const nested = "meta:\n  proof_contract:\n    kind: x\n";
    expect(withProofContractProves(doc(`${nested}${CONTRACT}`), ["k"])).toBe(
      doc(`${nested}${PINNED("k")}`),
    );
  });

  test("refuses what it cannot extend in place", () => {
    for (const content of [
      "proof_contract:\n  kind: rule\n",
      doc(CONTRACT).replace("---\nBody.\n", ""),
      doc("id: T\n"),
      doc("proof_contract: {kind: rule}\n"),
      doc("xproof_contract:\n  kind: rule\n"),
      doc("proof_contract:\n  kind: rule\n x\n"),
      doc("proof_contract:\nkind: rule\n"),
      doc("proof_contract:\n  # only a comment\n"),
      doc("proof_contract:\n  - a\n"),
      doc("proof_contract:\n  kind: rule\n  proves: [x]\n"),
      doc("proof_contract:\n  <<: {proves: [x]}\n  kind: rule\n"),
    ])
      expect(withProofContractProves(content, ["k"])).toBeNull();
    expect(withProofContractProves(doc(CONTRACT), [])).toBeNull();
  });

  test("refuses an edit that changes another field", () => {
    expect(
      withProofContractProves(
        doc("proof_contract:\n  kind: rule\n  text: |\n    x\n"),
        ["k"],
      ),
    ).toBe(
      doc(
        "proof_contract:\n  kind: rule\n  text: |\n    x\n  proves:\n    - k\n",
      ),
    );
    expect(
      withProofContractProves(
        doc("proof_contract:\n  kind: rule\n  text: |+\n    x\n\n"),
        ["k"],
      ),
    ).toBeNull();
  });
});

describe("planProofContractClaimPins", () => {
  const files = {
    ".kb/tests/A.md": doc(`id: TEST-a\n${CONTRACT}`),
    ".kb/tests/B.md": doc(`id: TEST-b\n${CONTRACT}`),
    ".kb/tests/C.md": doc("id: TEST-c\nproof_contract: {kind: rule}\n"),
    ".kb/tests/D.md": doc(`id: TEST-d\n${CONTRACT}`),
    ".kb/tests/E.md": "no frontmatter\n",
    ".kb/requirements/TEST-a.md": doc(`id: TEST-a\n${CONTRACT}`),
  };
  const rows: ClaimCandidateRow[] = [
    {
      test_id: "TEST-a",
      kind: "rule",
      candidates: [
        candidate("k1", "derived"),
        { ...candidate("k1", "derived"), requirement_id: "REQ-other" },
        candidate("k2", "attested"),
      ],
    },
    {
      test_id: "TEST-b",
      kind: "regex",
      candidates: [candidate("k2", "derived"), candidate("k1", "derived")],
    },
    {
      test_id: "TEST-c",
      kind: "rule",
      candidates: [candidate("k", "derived")],
    },
    { test_id: "TEST-z", kind: "rule", candidates: [] },
  ];

  test("pins a single provable claim and leaves the rest for review", () => {
    const root = tempWorkspace(files);
    expect(planProofContractClaimPins(root, rows)).toStrictEqual({
      targets: [
        {
          id: "TEST-a",
          type: "test",
          path: ".kb/tests/A.md",
          before: files[".kb/tests/A.md"],
          after: doc(`id: TEST-a\n${PINNED("k1")}`),
        },
      ],
      review: [
        {
          id: "TEST-b",
          path: ".kb/tests/B.md",
          kind: "regex",
          candidates: rows[1]?.candidates,
        },
      ],
      skipped: [
        {
          id: "TEST-c",
          path: ".kb/tests/C.md",
          reason:
            "its proof_contract is not a block mapping Kibi can extend in place",
        },
      ],
    });
  });

  test("plans nothing without candidate rows", () => {
    const root = tempWorkspace(files);
    const empty = { targets: [], review: [], skipped: [] };
    expect(planProofContractClaimPins(root, null)).toStrictEqual(empty);
    expect(planProofContractClaimPins(root, [])).toStrictEqual(empty);
  });

  test("applies the pins", () => {
    const root = tempWorkspace(files);
    const plan = applyProofContractClaimPins(root, rows);
    expect(plan.targets.map((target) => target.id)).toStrictEqual(["TEST-a"]);
    const read = (relative: string) =>
      readFileSync(path.join(root, relative), "utf8");
    expect(read(".kb/tests/A.md")).toBe(doc(`id: TEST-a\n${PINNED("k1")}`));
    expect(read(".kb/tests/B.md")).toBe(files[".kb/tests/B.md"]);
    expect(read(".kb/requirements/TEST-a.md")).toBe(
      files[".kb/requirements/TEST-a.md"],
    );
  });
});

describe("readProofContractClaimCandidates", () => {
  const HEALTHY = {
    branchStore: { state: "healthy" },
    snapshotId: "s1",
    branchAttachment: { kind: "exact" },
  };
  const realExecute = runtimeTypes.executeOperation;

  type Context = { prolog?: unknown; ensureProlog?: () => Promise<unknown> };

  async function read(options: {
    status?: unknown;
    context?: Context;
    rows?: unknown;
    fail?: boolean;
  }) {
    const calls: unknown[][] = [];
    const runtime = {
      open: async () => options.context ?? { prolog: "port" },
      afterSuccess: async () => {
        calls.push(["afterSuccess"]);
      },
      close: async () => {},
    };
    const create = spyOn(cliRuntime, "createCliRuntime").mockImplementation(((
      runtimeOptions: unknown,
    ) => {
      calls.push(["createCliRuntime", runtimeOptions]);
      return runtime;
    }) as unknown as typeof cliRuntime.createCliRuntime);
    const execute = spyOn(runtimeTypes, "executeOperation").mockImplementation(
      (async (rt: unknown, spec: { name: string }, input: unknown) => {
        if (spec.name === "kb_status") {
          calls.push(["status", rt === runtime, input]);
          if (options.fail) throw new Error("status failed");
          return { content: [], structuredContent: options.status };
        }
        calls.push(["operation", spec, input]);
        return realExecute(
          rt as runtimeTypes.OperationRuntime,
          spec as Parameters<typeof realExecute>[1],
          input,
        );
      }) as unknown as typeof runtimeTypes.executeOperation,
    );
    const query = spyOn(prologJson, "runOperationJsonQuery").mockImplementation(
      (async (...args: unknown[]) => {
        calls.push(["query", ...args]);
        return options.rows;
      }) as unknown as typeof prologJson.runOperationJsonQuery,
    );
    try {
      return { result: await readProofContractClaimCandidates("/ws"), calls };
    } finally {
      create.mockRestore();
      execute.mockRestore();
      query.mockRestore();
    }
  }

  test("reads the candidates from a healthy, synced store", async () => {
    const rows = [{ test_id: "T", kind: "rule", candidates: [] }];
    const { result, calls } = await read({ status: HEALTHY, rows });
    expect(result).toBe(rows as unknown as ClaimCandidateRow[]);
    expect(calls.slice(0, 2)).toStrictEqual([
      ["createCliRuntime", { workspaceRoot: "/ws" }],
      ["status", true, {}],
    ]);
    const [, spec, input] = calls[2] as [
      string,
      Record<string, unknown>,
      unknown,
    ];
    expect(input).toStrictEqual({});
    expect(spec.name).toBe("kb_migrate_proof_contract_claims_preview");
    expect(spec.effects).toStrictEqual(["kb-read"]);
    expect(spec.requiresProlog).toBe(true);
    expect(calls.slice(3)).toStrictEqual([
      [
        "query",
        "port",
        "claim_obligations.pl",
        "claim_obligations:proof_contract_claim_candidates_json(JsonString)",
        "Proof contract claim candidates",
      ],
    ]);
  });

  test("starts the engine when the context has none", async () => {
    const { result, calls } = await read({
      status: HEALTHY,
      rows: [],
      context: { ensureProlog: async () => "started" },
    });
    expect(result).toStrictEqual([]);
    expect(calls.at(-1)?.[1]).toBe("started");
  });

  test("reads nothing when no engine can start", async () => {
    for (const context of [{}, { ensureProlog: async () => undefined }]) {
      const { result, calls } = await read({ status: HEALTHY, context });
      expect(result).toStrictEqual([]);
      expect(calls.some((call) => call[0] === "query")).toBe(false);
    }
  });

  test("returns null for an unhealthy store or a failed read", async () => {
    for (const status of [
      undefined,
      {},
      { ...HEALTHY, branchStore: { state: "stale" } },
      { ...HEALTHY, snapshotId: "missing" },
      { ...HEALTHY, branchAttachment: { kind: "fallback" } },
    ]) {
      const { result, calls } = await read({ status, rows: [] });
      expect(result).toBeNull();
      expect(calls.some((call) => call[0] === "operation")).toBe(false);
    }
    expect((await read({ fail: true })).result).toBeNull();
    expect(
      (await read({ status: HEALTHY, rows: { not: "rows" } })).result,
    ).toBeNull();
  });
});
