import { describe, expect, test } from "bun:test";

import { proofContractHash } from "../../src/public/proof-fingerprint.js";
import type { ProofContract } from "../../src/public/proof-protocol.js";
import {
  CLAIM_BINDING_VERDICTS,
  MAX_PROOF_RECEIPTS,
  PROOF_RECEIPT_MAX_AGE_SECONDS,
  PROOF_RECEIPT_OUTCOMES,
  PROOF_RECEIPT_SCHEMA,
  appendOnlyProofReceiptHistoryErrors,
  finishedAtPrecedesStartedAt,
  proofReceiptCurrentBindingErrors,
  proofReceiptHistoryErrors,
  validProofReceiptShape,
} from "../../src/public/proof-receipt.js";
import { expectGolden } from "./helpers/golden.js";

const H = "0123456789abcdef".repeat(4);
const DROP = Symbol("drop");
type Patch = Record<string, unknown>;

const V1: Readonly<Record<string, unknown>> = {
  version: "kibi.proof-receipt.v1",
  receipt_id: "PR-a1234567",
  test_id: "TEST-1",
  scope: "unit",
  outcome: "passed",
  code_snapshot: H,
  environment_hash: H,
  started_at: "2026-01-01T00:00:00Z",
  finished_at: "2026-01-01T00:00:01Z",
  artifact_digest: H,
  contract_hash: H,
  fingerprint: H,
  fingerprint_components: {
    contract: H,
    integration: H,
    command: H,
    bindings: H,
    producer: H,
  },
  integration_id: "int",
  producer: { name: "p" },
  command_argv: ["bun", "test"],
  run_outcome: "passed",
  proof_results: [
    {
      symbol_id: "s",
      target: "t",
      outcome: "passed",
      binding: "native_case",
      attempts: { status: "unavailable" },
    },
  ],
};
const V2: Readonly<Record<string, unknown>> = {
  ...V1,
  version: "kibi.proof-receipt.v2",
  kind: "e2e",
  evidence_level: "tested",
};
const PROVED: Readonly<Record<string, unknown>> = {
  ...V2,
  kind: "smt",
  evidence_level: "proved",
  certificate: { c: 1 },
  certificate_digest: H,
};

function apply(base: Readonly<Record<string, unknown>>, patch: Patch) {
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value === DROP) Reflect.deleteProperty(out, key);
    else out[key] = value;
  }
  return out;
}

const valid = (base: Readonly<Record<string, unknown>>, patch: Patch = {}) =>
  validProofReceiptShape("TEST-1", apply(base, patch));

const result = (patch: Patch) => ({
  proof_results: [apply((V1.proof_results as Patch[])[0] as Patch, patch)],
});
const attempts = (value: unknown) => result({ attempts: value });
const components = (patch: Patch) => ({
  fingerprint_components: apply(V1.fingerprint_components as Patch, patch),
});
const binding = (patch: Patch) => ({
  claim_bindings: [apply({ claim_key: "k", binding: "derived" }, patch)],
});

describe("constants", () => {
  test("pin the receipt vocabulary", () => {
    expect(PROOF_RECEIPT_MAX_AGE_SECONDS).toBe(604_800);
    expect(MAX_PROOF_RECEIPTS).toBe(50);
    expect(CLAIM_BINDING_VERDICTS).toEqual(["derived", "attested", "rejected"]);
    expect(PROOF_RECEIPT_OUTCOMES).toEqual([
      "passed",
      "failed",
      "errored",
      "cancelled",
      "skipped",
      "timed_out",
      "interrupted",
    ]);
    expectGolden("proof-receipt-schema", PROOF_RECEIPT_SCHEMA);
  });
});

describe("finishedAtPrecedesStartedAt", () => {
  test("needs both times and a strictly earlier finish", () => {
    expect(finishedAtPrecedesStartedAt(2, 1)).toBe(true);
    expect(finishedAtPrecedesStartedAt(1, 1)).toBe(false);
    expect(finishedAtPrecedesStartedAt(1, 2)).toBe(false);
    expect(finishedAtPrecedesStartedAt(null, 1)).toBe(false);
    expect(finishedAtPrecedesStartedAt(2, null)).toBe(false);
    expect(finishedAtPrecedesStartedAt(null, -1)).toBe(false);
  });
});

describe("validProofReceiptShape accepts", () => {
  test.each<[string, Readonly<Record<string, unknown>>, Patch]>([
    ["a v1 receipt", V1, {}],
    ["a v2 receipt", V2, {}],
    ["a proved receipt", PROVED, {}],
    ["v1 ignoring v2 fields", V1, { kind: "bogus", evidence_level: "x" }],
    ["the longest receipt id", V1, { receipt_id: `PR-${"a".repeat(128)}` }],
    ["receipt id punctuation", V1, { receipt_id: "PR-Z._:-a0bc" }],
    ["integration scope", V1, { scope: "integration" }],
    ["end to end scope", V1, { scope: "end_to_end" }],
    ["a skipped outcome", V1, { outcome: "skipped" }],
    ["a binding hash", V1, { binding_hash: H }],
    ["a producer version", V1, { producer: { name: "p", version: "1" } }],
    ["no proof results", V1, { proof_results: [] }],
    ["a no-results run", V1, { run_outcome: "no_results" }],
    ["gaps", V1, { gaps: [{ symbol_id: "s", target: "t", reason: "r" }] }],
    ["fractional seconds", V1, { finished_at: "2026-01-01T00:00:01.5Z" }],
    ["millisecond fractions", V1, { finished_at: "2026-01-01T00:00:01.678Z" }],
    [
      "offsets",
      V1,
      {
        started_at: "2026-01-01T02:00:00+02:00",
        finished_at: "2026-01-01T00:00:00-00:00",
      },
    ],
    ["equal times", V1, { finished_at: "2026-01-01T00:00:00Z" }],
    ["an aggregate binding", V1, result({ binding: "aggregate_run" })],
    ["a native id", V1, result({ native_id: "n" })],
    [
      "complete attempts",
      V1,
      attempts({
        status: "complete",
        entries: [{ outcome: "failed", duration_ms: 0 }, { outcome: "passed" }],
      }),
    ],
    ["a certificate on a tested receipt", V2, { certificate: {} }],
    ["a certificate digest", V2, { certificate_digest: H }],
    ["a certificate rejection", V2, { certificate_rejection: "why" }],
    ["claim bindings", V2, binding({})],
    ["an attested binding", V2, binding({ binding: "attested" })],
    ["a code scope", V2, binding({ scope: "code" })],
    ["a source scope", V2, binding({ scope: "source" })],
    ["a harness scope", V2, binding({ scope: "harness" })],
    ["an intent scope", V2, binding({ scope: "intent" })],
    ["an obligation", V2, binding({ obligation: {} })],
    ["a reason", V2, binding({ reason: "r" })],
  ])("%s", (_label, base, patch) => {
    expect(valid(base, patch)).toBe(true);
  });
});

describe("validProofReceiptShape rejects", () => {
  test("non-records", () => {
    expect(validProofReceiptShape("TEST-1", null)).toBe(false);
    expect(validProofReceiptShape("TEST-1", [V1])).toBe(false);
    expect(validProofReceiptShape("TEST-1", "receipt")).toBe(false);
    expect(validProofReceiptShape("TEST-2", V1)).toBe(false);
  });

  test.each<[string, Readonly<Record<string, unknown>>, Patch]>([
    ["an unknown version", V1, { version: "kibi.proof-receipt.v3" }],
    ["a numeric receipt id", V1, { receipt_id: 7 }],
    ["a listed receipt id", V1, { receipt_id: ["PR-a1234567"] }],
    ["a listed code snapshot", V1, { code_snapshot: [H] }],
    ["a listed start", V1, { started_at: ["2026-01-01T00:00:00Z"] }],
    ["a callable producer", V1, { producer: function p() {} }],
    ["a null certificate", V2, { certificate: null }],
    ["a null obligation", V2, binding({ obligation: null })],
    ["a null gap", V1, { gaps: [null] }],
    [
      "an unknown attempt status with entries",
      V1,
      attempts({ status: "partial", entries: [{ outcome: "passed" }] }),
    ],
    [
      "one bad attempt among good ones",
      V1,
      attempts({
        status: "complete",
        entries: [{ outcome: "passed" }, { outcome: "bogus" }],
      }),
    ],
    [
      "one bad gap among good ones",
      V1,
      {
        gaps: [
          { symbol_id: "s", target: "t", reason: "r" },
          { symbol_id: "s", target: "t" },
        ],
      },
    ],
    [
      "one bad claim binding among good ones",
      V2,
      {
        claim_bindings: [
          { claim_key: "k", binding: "derived" },
          { claim_key: "", binding: "derived" },
        ],
      },
    ],
    ["a short receipt id", V1, { receipt_id: "PR-a123456" }],
    ["a long receipt id", V1, { receipt_id: `PR-${"a".repeat(129)}` }],
    ["a punctuation-led receipt id", V1, { receipt_id: "PR-.1234567" }],
    ["a prefixed receipt id", V1, { receipt_id: "xPR-a1234567" }],
    ["a suffixed receipt id", V1, { receipt_id: "PR-a1234567!" }],
    ["a lowercase prefix", V1, { receipt_id: "pr-a1234567" }],
    ["a missing scope", V1, { scope: DROP }],
    ["an unknown scope", V1, { scope: "system" }],
    ["an unknown outcome", V1, { outcome: "no_results" }],
    ["a bad code snapshot", V1, { code_snapshot: H.toUpperCase() }],
    ["a bad environment hash", V1, { environment_hash: H.slice(1) }],
    ["a bad artifact digest", V1, { artifact_digest: `${H}0` }],
    ["a bad contract hash", V1, { contract_hash: `g${H.slice(1)}` }],
    ["a bad fingerprint", V1, { fingerprint: ` ${H.slice(1)}` }],
    ["a bad binding hash", V1, { binding_hash: "abc" }],
    ["a numeric binding hash", V1, { binding_hash: 1 }],
    ["components that are not a record", V1, { fingerprint_components: H }],
    ["a bad contract component", V1, components({ contract: "x" })],
    ["a bad integration component", V1, components({ integration: "x" })],
    ["a bad command component", V1, components({ command: "x" })],
    ["a bad bindings component", V1, components({ bindings: "x" })],
    ["a bad producer component", V1, components({ producer: "x" })],
    ["a blank integration", V1, { integration_id: "  " }],
    ["a producer that is not a record", V1, { producer: "p" }],
    ["a nameless producer", V1, { producer: { name: "" } }],
    ["a blank producer version", V1, { producer: { name: "p", version: " " } }],
    ["argv that is not a list", V1, { command_argv: "bun test" }],
    ["empty argv", V1, { command_argv: [] }],
    ["a blank argument", V1, { command_argv: ["bun", ""] }],
    ["an unknown run outcome", V1, { run_outcome: "skipped" }],
    ["results that are not a list", V1, { proof_results: {} }],
    ["a result that is not a record", V1, { proof_results: ["x"] }],
    ["a blank symbol", V1, result({ symbol_id: " " })],
    ["a blank target", V1, result({ target: "" })],
    ["an unknown result outcome", V1, result({ outcome: "cancelled" })],
    ["an unknown binding", V1, result({ binding: "other" })],
    ["a blank native id", V1, result({ native_id: "" })],
    ["attempts that are not a record", V1, attempts("complete")],
    [
      "unavailable attempts with entries",
      V1,
      attempts({ status: "unavailable", entries: [] }),
    ],
    ["an unknown attempt status", V1, attempts({ status: "partial" })],
    [
      "complete attempts without a list",
      V1,
      attempts({ status: "complete", entries: { outcome: "passed" } }),
    ],
    [
      "complete attempts with no entries",
      V1,
      attempts({ status: "complete", entries: [] }),
    ],
    [
      "an attempt that is not a record",
      V1,
      attempts({ status: "complete", entries: ["passed"] }),
    ],
    [
      "a blank attempt outcome",
      V1,
      attempts({ status: "complete", entries: [{ outcome: " " }] }),
    ],
    [
      "an unknown attempt outcome",
      V1,
      attempts({ status: "complete", entries: [{ outcome: "cancelled" }] }),
    ],
    [
      "a fractional duration",
      V1,
      attempts({
        status: "complete",
        entries: [{ outcome: "passed", duration_ms: 1.5 }],
      }),
    ],
    [
      "a negative duration",
      V1,
      attempts({
        status: "complete",
        entries: [{ outcome: "passed", duration_ms: -1 }],
      }),
    ],
    [
      "a textual duration",
      V1,
      attempts({
        status: "complete",
        entries: [{ outcome: "passed", duration_ms: "5" }],
      }),
    ],
    ["gaps that are not a list", V1, { gaps: {} }],
    ["a gap that is not a record", V1, { gaps: ["gap"] }],
    ["a gap without a symbol", V1, { gaps: [{ target: "t", reason: "r" }] }],
    ["a gap without a target", V1, { gaps: [{ symbol_id: "s", reason: "r" }] }],
    ["a gap without a reason", V1, { gaps: [{ symbol_id: "s", target: "t" }] }],
    ["a missing start", V1, { started_at: DROP }],
    ["a missing finish", V1, { finished_at: DROP }],
    ["a date-only start", V1, { started_at: "2026-01-01" }],
    ["a zoneless finish", V1, { finished_at: "2026-01-01T00:00:01" }],
    ["a prefixed finish", V1, { finished_at: "x2026-01-01T00:00:01Z" }],
    ["a suffixed finish", V1, { finished_at: "2026-01-01T00:00:01Zx" }],
    ["a short year", V1, { finished_at: "226-01-01T00:00:01Z" }],
    ["a short month", V1, { finished_at: "2026-1-01T00:00:01Z" }],
    ["a short day", V1, { finished_at: "2026-01-1T00:00:01Z" }],
    ["a short hour", V1, { finished_at: "2026-01-01T0:00:01Z" }],
    ["a short minute", V1, { finished_at: "2026-01-01T00:0:01Z" }],
    ["a short second", V1, { finished_at: "2026-01-01T00:00:1Z" }],
    ["an empty fraction", V1, { finished_at: "2026-01-01T00:00:01.Z" }],
    ["a short offset", V1, { finished_at: "2026-01-01T00:00:01+2:00" }],
    ["a bad offset sign", V1, { finished_at: "2026-01-01T00:00:01*02:00" }],
    ["an impossible date", V1, { finished_at: "2026-13-45T99:99:99Z" }],
    ["a finish before the start", V1, { finished_at: "2025-12-31T23:59:59Z" }],
    ["an unknown kind", V2, { kind: "guess" }],
    ["a missing evidence level", V2, { evidence_level: DROP }],
    ["an unknown evidence level", V2, { evidence_level: "certain" }],
    ["a proved failure", PROVED, { outcome: "failed" }],
    ["a proved test kind", PROVED, { kind: "e2e" }],
    ["a proved receipt without certificate", PROVED, { certificate: DROP }],
    [
      "a proved receipt with a bad digest",
      PROVED,
      { certificate_digest: DROP },
    ],
    [
      "a proved receipt with a rejection",
      PROVED,
      { certificate_rejection: "no" },
    ],
    ["a certificate that is not a record", V2, { certificate: ["c"] }],
    ["a bad certificate digest", V2, { certificate_digest: "abc" }],
    ["a blank certificate rejection", V2, { certificate_rejection: " " }],
    ["claim bindings that are not a list", V2, { claim_bindings: {} }],
    ["a claim binding that is not a record", V2, { claim_bindings: ["k"] }],
    ["a blank claim key", V2, binding({ claim_key: "" })],
    ["an unknown verdict", V2, binding({ binding: "assumed" })],
    ["an unknown claim scope", V2, binding({ scope: "runtime" })],
    ["an obligation that is not a record", V2, binding({ obligation: "o" })],
    ["a blank claim reason", V2, binding({ reason: "" })],
  ])("%s", (_label, base, patch) => {
    expect(valid(base, patch)).toBe(false);
  });
});

const at = (second: number) =>
  `2026-01-01T00:00:${String(second).padStart(2, "0")}Z`;
const receiptAt = (id: string, start: number, finish: number) =>
  apply(V1, {
    receipt_id: `PR-${id}1234567`,
    started_at: at(start),
    finished_at: at(finish),
  });

describe("proofReceiptHistoryErrors", () => {
  test("accepts an empty or ordered history", () => {
    expect(proofReceiptHistoryErrors("TEST-1", undefined, [])).toEqual([]);
    expect(
      proofReceiptHistoryErrors("TEST-1", "unit", [
        receiptAt("a", 0, 1),
        receiptAt("b", 1, 2),
      ]),
    ).toEqual([]);
  });

  test("reports scope, duplicates, binding and order", () => {
    expect(
      proofReceiptHistoryErrors("TEST-1", 3, [
        receiptAt("a", 0, 5),
        receiptAt("a", 0, 5),
        apply(receiptAt("c", 0, 1), { test_id: "TEST-2" }),
        apply(receiptAt("d", 0, 1), { receipt_id: 4 }),
        apply(receiptAt("d", 0, 1), { receipt_id: 4 }),
        receiptAt("e", 0, 6),
        receiptAt("f", 0, 6),
      ]),
    ).toEqual([
      "verification_scope is required when proof_receipts are present",
      "proof_receipts[1].receipt_id duplicates 'PR-a1234567'",
      "proof_receipts[1].finished_at must be strictly later than the previous receipt",
      "proof_receipts[2].test_id must equal 'TEST-1'",
      "proof_receipts[2] must be a structurally valid kibi.proof-receipt.v2 (or v1) bound to 'TEST-1'",
      "proof_receipts[3] must be a structurally valid kibi.proof-receipt.v2 (or v1) bound to 'TEST-1'",
      "proof_receipts[4] must be a structurally valid kibi.proof-receipt.v2 (or v1) bound to 'TEST-1'",
      "proof_receipts[6].finished_at must be strictly later than the previous receipt",
    ]);
  });

  test("compares with the previous entry even when it was invalid", () => {
    expect(
      proofReceiptHistoryErrors("TEST-1", "unit", [
        apply(receiptAt("a", 0, 9), { scope: "bogus" }),
        receiptAt("b", 0, 8),
      ]),
    ).toEqual([
      "proof_receipts[0] must be a structurally valid kibi.proof-receipt.v2 (or v1) bound to 'TEST-1'",
      "proof_receipts[1].finished_at must be strictly later than the previous receipt",
    ]);
  });

  test("skips the order check after an unreadable finish", () => {
    expect(
      proofReceiptHistoryErrors("TEST-1", "unit", [
        apply(receiptAt("a", 0, 1), { finished_at: "never" }),
        apply(receiptAt("b", 0, 1), {
          started_at: "1969-12-31T23:59:58Z",
          finished_at: "1969-12-31T23:59:59Z",
        }),
      ]),
    ).toHaveLength(1);
    expect(
      proofReceiptHistoryErrors("TEST-1", "unit", [
        apply(receiptAt("b", 0, 1), {
          started_at: "1969-12-31T23:59:58Z",
          finished_at: "1969-12-31T23:59:59Z",
        }),
      ]),
    ).toEqual([]);
  });
});

describe("proofReceiptCurrentBindingErrors", () => {
  const contract = {
    kind: "e2e",
    command: ["bun"],
  } as unknown as ProofContract;
  const hash = proofContractHash(contract);

  test("accepts a receipt bound to the live state", () => {
    const receipt = {
      test_id: "T",
      scope: "unit",
      contract_hash: hash,
      fingerprint: "f",
    };
    expect(proofReceiptCurrentBindingErrors("T", "unit", receipt)).toEqual([]);
    expect(
      proofReceiptCurrentBindingErrors("T", "unit", receipt, contract, "f"),
    ).toEqual([]);
    expect(
      proofReceiptCurrentBindingErrors(
        "T",
        "unit",
        { test_id: "T", scope: "unit" },
        contract,
        "f",
      ),
    ).toEqual([]);
  });

  test("reports each mismatch", () => {
    expect(
      proofReceiptCurrentBindingErrors(
        "T",
        "unit",
        { test_id: "X", scope: "e2e", contract_hash: H, fingerprint: "g" },
        contract,
        "f",
      ),
    ).toEqual([
      "proof receipt test_id must equal 'T'",
      "proof receipt scope must equal the current verification_scope 'unit'",
      "proof receipt contract_hash does not match the current proof_contract",
      "proof receipt fingerprint does not match the current effective execution fingerprint",
    ]);
    const hex = (char: string) => char.repeat(64);
    const stored = {
      contract: hex("1"),
      integration: hex("2"),
      command: hex("3"),
      bindings: hex("4"),
      producer: hex("5"),
    };
    const drifted = { ...stored, integration: hex("a"), command: hex("b") };
    const receipt = {
      test_id: "T",
      scope: "unit",
      contract_hash: proofContractHash(contract),
      fingerprint: "g",
      fingerprint_components: stored,
    };
    expect(
      proofReceiptCurrentBindingErrors(
        "T",
        "unit",
        receipt,
        contract,
        "f",
        drifted,
      ),
    ).toEqual([
      "proof receipt fingerprint does not match the current effective execution fingerprint (changed: integration, command)",
    ]);
    for (const quiet of [
      [receipt, undefined],
      [{ ...receipt, fingerprint_components: { contract: "x" } }, drifted],
      [receipt, stored],
    ] as const) {
      expect(
        proofReceiptCurrentBindingErrors(
          "T",
          "unit",
          quiet[0],
          contract,
          "f",
          quiet[1],
        ),
      ).toEqual([
        "proof receipt fingerprint does not match the current effective execution fingerprint",
      ]);
    }
    expect(
      proofReceiptCurrentBindingErrors(
        "T",
        null,
        { test_id: "T", fingerprint: "g" },
        contract,
      ),
    ).toEqual(["verification_scope is required for current receipt evidence"]);
    expect(
      proofReceiptCurrentBindingErrors(
        "T",
        "unit",
        { test_id: "T", scope: "unit", contract_hash: H, fingerprint: "g" },
        undefined,
        "f",
      ),
    ).toEqual([]);
  });
});

describe("appendOnlyProofReceiptHistoryErrors", () => {
  const entry = (n: number) => ({ n });
  const range = (from: number, count: number) =>
    Array.from({ length: count }, (_, index) => entry(from + index));

  test("allows appends to any history", () => {
    expect(appendOnlyProofReceiptHistoryErrors([], undefined)).toEqual([]);
    expect(
      appendOnlyProofReceiptHistoryErrors(range(0, 2), [
        { n: 0 },
        { n: 1 },
        { n: 2 },
      ]),
    ).toEqual([]);
    expect(
      appendOnlyProofReceiptHistoryErrors(range(0, 2), range(0, 2)),
    ).toEqual([]);
  });

  test("allows rotating the oldest receipts out at the cap", () => {
    expect(
      appendOnlyProofReceiptHistoryErrors(range(0, 50), range(1, 50)),
    ).toEqual([]);
    expect(
      appendOnlyProofReceiptHistoryErrors(range(0, 52), range(3, 50)),
    ).toEqual([]);
  });

  test("rejects removal, truncation and edits", () => {
    expect(appendOnlyProofReceiptHistoryErrors([entry(0)], undefined)).toEqual([
      "proof_receipts is append-only and cannot be removed from an existing test",
    ]);
    expect(
      appendOnlyProofReceiptHistoryErrors(range(0, 3), range(0, 2)),
    ).toEqual([
      "proof_receipts is append-only: expected at least 3 historical receipt(s), received 2",
    ]);
    expect(
      appendOnlyProofReceiptHistoryErrors(range(0, 3), [
        entry(0),
        entry(9),
        entry(2),
        entry(3),
      ]),
    ).toEqual([
      "proof_receipts is append-only: historical receipt at index 1 was changed, removed, or reordered",
    ]);
  });

  test("treats near-cap histories as ordinary appends", () => {
    const short = [entry(0)];
    expect(
      appendOnlyProofReceiptHistoryErrors(short, [
        ...Array.from({ length: 48 }, () => null),
        entry(0),
        entry(1),
      ] as unknown as Record<string, unknown>[]),
    ).toEqual([
      "proof_receipts is append-only: historical receipt at index 0 was changed, removed, or reordered",
    ]);
    expect(
      appendOnlyProofReceiptHistoryErrors(range(0, 49), range(1, 50)),
    ).toEqual([
      "proof_receipts is append-only: historical receipt at index 0 was changed, removed, or reordered",
    ]);
    expect(
      appendOnlyProofReceiptHistoryErrors(range(0, 50), range(1, 51)),
    ).toEqual([
      "proof_receipts is append-only: historical receipt at index 0 was changed, removed, or reordered",
    ]);
    expect(
      appendOnlyProofReceiptHistoryErrors(range(0, 50), [
        ...range(2, 48),
        entry(99),
        entry(100),
      ]),
    ).toEqual([
      "proof_receipts is append-only: historical receipt at index 0 was changed, removed, or reordered",
    ]);
    expect(
      appendOnlyProofReceiptHistoryErrors(range(0, 50), [
        ...range(1, 48),
        entry(77),
        entry(100),
      ]),
    ).toEqual([
      "proof_receipts is append-only: historical receipt at index 0 was changed, removed, or reordered",
    ]);
  });
});
