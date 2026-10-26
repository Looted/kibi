import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  compileWitness,
  domainCoverageProblem,
  evaluateDomain,
} from "../../src/operations/proof/code-certificates.js";
import {
  canonicalCertificateJson,
  certificateDigest,
} from "../../src/public/proof-certificates.js";
import { prologCases } from "./prolog-cases.js";

// implements REQ-kibi-code-proof-kinds

describe("certificate digest", () => {
  test("the CLI and code_certificates.pl hash a certificate byte for byte alike", () => {
    const cases = [
      { test_id: "a", testId: "b", Zeta: 1, alpha: 2, _x: 3, "10": 4, "2": 5 },
      { members: ["café", "日本", "😀", 'quote " and \\ slash'] },
      { query: "(assert x)\n\t(check-sat)\u0001", value: -42, ok: true },
      { nested: [{ b: [], a: {} }, null, false, 0.5, 1.25] },
    ];
    const answers = prologCases<{ json: string; digest: string }>(
      "code_certificates.pl",
      `code_certificates:canonical_json(Case, Json),
       code_certificates:code_certificate_digest(Case, Digest),
       Out = _{json: Json, digest: Digest}`,
      cases,
    );
    cases.forEach((certificate, index) => {
      expect(answers[index]?.json).toBe(canonicalCertificateJson(certificate));
      expect(answers[index]?.digest).toBe(certificateDigest(certificate));
    });
  });
});

describe("exhaustive domain coverage", () => {
  test("Kibi loads the domain export and a partial certificate does not cover it", () => {
    const root = mkdtempSync(path.join(tmpdir(), "kibi-domain-"));
    writeFileSync(
      path.join(root, "domain.ts"),
      'export const COLORS = ["red", "green", "blue"] as const;\nexport const SHAPES = { circle: 1, square: 2 };\nexport const ROWS = [{ id: 1 }, { id: 2 }];\n',
    );
    const colors = evaluateDomain(root, "domain.ts", "COLORS");
    expect(colors).toEqual({
      ok: true,
      count: 3,
      members: ["red", "green", "blue"],
    });
    if (!colors.ok) return;
    expect(
      domainCoverageProblem("COLORS", colors, ["blue", "green", "red"]),
    ).toBeNull();
    expect(domainCoverageProblem("COLORS", colors, ["red", "green"])).toContain(
      "missing blue",
    );
    expect(evaluateDomain(root, "domain.ts", "SHAPES")).toMatchObject({
      ok: true,
      members: ["circle", "square"],
    });
    const rows = evaluateDomain(root, "domain.ts", "ROWS");
    expect(rows).toEqual({ ok: true, count: 2, members: null });
    if (rows.ok)
      expect(domainCoverageProblem("ROWS", rows, ["1"])).toBe(
        "the certificate covers 1 members but ROWS has 2",
      );
    expect(evaluateDomain(root, "domain.ts", "MISSING").ok).toBe(false);
  });
});

describe("stored certificate re-check", () => {
  test("a receipt that claimed proved but no longer re-checks says why", () => {
    const certificate = {
      version: "kibi.code-certificate.v1",
      kind: "arithmetic",
      test_id: "TEST-A",
      variable: "x",
      value_type: "int",
      assumptions: [
        { operator: "gte", value: 0 },
        { operator: "lte", value: 3 },
      ],
      claim: { operator: "lt", value: 4 },
    };
    const receipt = {
      version: "kibi.proof-receipt.v2",
      kind: "arithmetic",
      test_id: "TEST-A",
      evidence_level: "proved",
      certificate,
      certificate_digest: certificateDigest(certificate),
    };
    const edited = {
      ...receipt,
      certificate: { ...certificate, claim: { operator: "lt", value: 3 } },
    };
    const rehashed = {
      ...edited,
      certificate_digest: certificateDigest(edited.certificate),
    };
    expect(
      prologCases(
        "requirement_proof.pl",
        "requirement_proof:receipt_kind_evidence(Case, passed, _{}, Out)",
        [receipt, edited, rehashed],
      ),
    ).toEqual([
      // The re-checked certificate travels on so claim bindings can read it.
      { kind: "arithmetic", evidenceLevel: "proved", certificate },
      {
        kind: "arithmetic",
        evidenceLevel: "tested",
        certificate: edited.certificate,
        certificateRejection:
          "the certificate no longer matches its certificate_digest",
      },
      {
        kind: "arithmetic",
        evidenceLevel: "tested",
        certificate: rehashed.certificate,
        certificateRejection:
          "the assumptions do not entail the claim: some value satisfies them and breaks it",
      },
    ]);
  });
});

describe("typecheck witness", () => {
  test("Kibi compiles the witness itself and rejects one that misses a member", () => {
    const root = mkdtempSync(path.join(tmpdir(), "kibi-witness-"));
    mkdirSync(path.join(root, "node_modules"));
    symlinkSync(
      path.dirname(
        createRequire(import.meta.url).resolve("typescript/package.json"),
      ),
      path.join(root, "node_modules", "typescript"),
    );
    writeFileSync(
      path.join(root, "domain.ts"),
      'export const COLORS = ["red", "green"] as const;\nexport type Color = (typeof COLORS)[number];\n',
    );
    const witness = (cases: string) =>
      `import type { Color } from "./domain.js";\nexport function hex(color: Color): string {\n  switch (color) {\n${cases}    default: { const unhandled: never = color; return unhandled; }\n  }\n}\n`;
    writeFileSync(
      path.join(root, "full.ts"),
      witness(
        '    case "red": return "#f00";\n    case "green": return "#0f0";\n',
      ),
    );
    writeFileSync(
      path.join(root, "partial.ts"),
      witness('    case "red": return "#f00";\n'),
    );
    expect(compileWitness(root, "full.ts")).toMatchObject({ ok: true });
    const partial = compileWitness(root, "partial.ts");
    expect(partial.ok).toBe(false);
    if (!partial.ok)
      expect(partial.reason).toContain("rejects the witness partial.ts");
  }, 60_000);
});
