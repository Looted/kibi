import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  compileWitness,
  domainCoverageProblem,
  evaluateDomain,
  withWitnessDiagnosis,
} from "../../src/operations/proof/code-certificates.js";
import type { OperationContext } from "../../src/public/operations/runtime-types.js";
import {
  canonicalCertificateJson,
  certificateDigest,
} from "../../src/public/proof-certificates.js";
import type { ProofContract } from "../../src/public/proof-protocol.js";
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
    // A code count of 5 against a fact of exactly 4: no value satisfies both.
    const contradictory = {
      ...certificate,
      assumptions: [
        { operator: "eq", value: 4 },
        { operator: "eq", value: 5 },
      ],
      claim: { operator: "eq", value: 4 },
    };
    const contradicted = {
      ...receipt,
      certificate: contradictory,
      certificate_digest: certificateDigest(contradictory),
    };
    expect(
      prologCases(
        "requirement_proof.pl",
        "requirement_proof:receipt_kind_evidence(Case, passed, _{}, Out)",
        [receipt, edited, rehashed, contradicted],
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
          "the assumptions do not entail the claim: x = 3 satisfies them and breaks it",
      },
      {
        kind: "arithmetic",
        evidenceLevel: "tested",
        certificate: contradictory,
        certificateRejection:
          "the assumptions contradict each other (x = 4 and x = 5), so no value satisfies them and they prove nothing about the claim",
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

describe("typecheck witness compile", () => {
  const workspace = () => {
    const root = mkdtempSync(path.join(tmpdir(), "kibi-witness-ts-"));
    mkdirSync(path.join(root, "node_modules"));
    symlinkSync(
      path.dirname(
        createRequire(import.meta.url).resolve("typescript/package.json"),
      ),
      path.join(root, "node_modules", "typescript"),
    );
    writeFileSync(
      path.join(root, "domain.ts"),
      "export interface Row { id: string; deletedAt: number | null }\n",
    );
    return root;
  };

  test("imports resolve the way the workspace tsconfig says", () => {
    const root = workspace();
    writeFileSync(
      path.join(root, "witness.ts"),
      'import type { Row } from "./domain";\nconst id: Row["id"] = "x";\nvoid id;\nexport {};\n',
    );
    // In an ES module package NodeNext needs ./domain.js; the project
    // resolves like a bundler.
    writeFileSync(path.join(root, "package.json"), '{"type": "module"}\n');
    expect(compileWitness(root, "witness.ts").ok).toBe(false);
    writeFileSync(
      path.join(root, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: { module: "ESNext", moduleResolution: "Bundler" },
      }),
    );
    expect(compileWitness(root, "witness.ts")).toMatchObject({ ok: true });
  }, 60_000);

  test("the project's declaration files are in the witness program", () => {
    const root = workspace();
    writeFileSync(
      path.join(root, "witness.ts"),
      "const flag: ProjectFlag = true;\nvoid flag;\nexport {};\n",
    );
    expect(compileWitness(root, "witness.ts").ok).toBe(false);
    // Global typings the project's tsconfig includes, as a reset.d.ts is.
    writeFileSync(
      path.join(root, "globals.d.ts"),
      "type ProjectFlag = boolean;\n",
    );
    writeFileSync(
      path.join(root, "tsconfig.json"),
      JSON.stringify({ include: ["*.ts"] }),
    );
    expect(compileWitness(root, "witness.ts")).toMatchObject({ ok: true });
  }, 60_000);

  test("a failed typecheck certificate says what Kibi's compile of the witness reports", () => {
    const root = workspace();
    writeFileSync(
      path.join(root, "bad.ts"),
      'import type { Row } from "./domain.js";\nconst at: Row["deletedAt"] = "x";\nvoid at;\nexport {};\n',
    );
    writeFileSync(
      path.join(root, "good.ts"),
      'import type { Row } from "./domain.js";\nconst id: Row["id"] = "x";\nvoid id;\nexport {};\n',
    );
    const context = { workspaceRoot: root } as unknown as OperationContext;
    const contract = (witness: string) =>
      ({
        kind: "typecheck",
        witness: { path: witness },
      }) as unknown as ProofContract;
    const generic = "the type checker did not accept the witness";
    expect(withWitnessDiagnosis(context, contract("bad.ts"), generic)).toMatch(
      /^the type checker did not accept the witness: TypeScript .* rejects the witness bad\.ts: Type 'string' is not assignable/,
    );
    expect(withWitnessDiagnosis(context, contract("good.ts"), generic)).toMatch(
      /though Kibi's own compile of good\.ts with TypeScript .* accepts it/,
    );
    expect(
      withWitnessDiagnosis(context, contract("bad.ts"), "another reason"),
    ).toBe("another reason");
  }, 60_000);

  test("the exhaustiveness check reads the syntax tree, not the word never", () => {
    const root = workspace();
    writeFileSync(
      path.join(root, "comment.ts"),
      '// this witness never checks anything\nimport type { Row } from "./domain.js";\nconst id: Row["id"] = "x";\nvoid id;\nexport {};\n',
    );
    writeFileSync(
      path.join(root, "map.ts"),
      'const colors = { red: 1, green: 2 } satisfies Record<"red" | "green", number>;\nvoid colors;\nexport {};\n',
    );
    const comment = compileWitness(root, "comment.ts", {
      requireExhaustiveness: true,
    });
    expect(comment.ok).toBe(false);
    if (!comment.ok)
      expect(comment.reason).toContain("no exhaustiveness check");
    expect(compileWitness(root, "comment.ts").ok).toBe(true);
    expect(
      compileWitness(root, "map.ts", { requireExhaustiveness: true }).ok,
    ).toBe(true);
  }, 60_000);

  test("a TypeScript without the compiler API is named, not reported missing", () => {
    const root = mkdtempSync(path.join(tmpdir(), "kibi-witness-ts7-"));
    const fake = path.join(root, "node_modules", "typescript");
    mkdirSync(fake, { recursive: true });
    writeFileSync(
      path.join(fake, "package.json"),
      JSON.stringify({
        name: "typescript",
        version: "7.0.2",
        main: "version.cjs",
      }),
    );
    writeFileSync(
      path.join(fake, "version.cjs"),
      'module.exports = { version: "7.0.2" };\n',
    );
    writeFileSync(path.join(root, "witness.ts"), "export {};\n");
    const compiled = compileWitness(root, "witness.ts");
    expect(compiled.ok).toBe(false);
    if (!compiled.ok)
      expect(compiled.reason).toContain("TypeScript 7.0.2 has no compiler API");
  }, 60_000);
});
