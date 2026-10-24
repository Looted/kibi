import { describe, expect, test } from "bun:test";
import path from "node:path";
import ts from "typescript";
import {
  type CodeCertificate,
  typecheckCertificate,
  writeCodeCertificate,
} from "../../src/public/proof-certificates.js";
import {
  PROOF_KINDS,
  isCertificateProofKind,
} from "../../src/public/proof-protocol.js";
import {
  PROOF_KIND_LEVELS,
  proofKindLevel,
} from "./witness/proof-kind-levels.js";

// implements REQ-kibi-code-proof-kinds

const WITNESS = "packages/cli/tests/proofs/witness/proof-kind-levels.ts";
const WORKSPACE = path.resolve(import.meta.dir, "../../../..");

/** The compiler's verdict on the proof-kind witness, as a typecheck certificate. */
function proofKindWitnessCertificate(): {
  certificate: CodeCertificate;
  diagnostics: string[];
} {
  const program = ts.createProgram([path.join(WORKSPACE, WITNESS)], {
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    types: [],
  });
  const diagnostics = ts
    .getPreEmitDiagnostics(program)
    .filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)
    .map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
    );
  return {
    certificate: typecheckCertificate({
      testId: "TEST-kibi-code-proof-kinds-typecheck",
      domainSymbolId: "SYM-proof-kinds",
      witnessPath: WITNESS,
      workspaceRoot: WORKSPACE,
      compiler: { name: "tsc", version: ts.version },
      accepted: diagnostics.length === 0,
    }),
    diagnostics,
  };
}

describe("code proof kinds, proved by the type checker", () => {
  test("the compiler accepts a witness that maps every proof kind to its evidence level", () => {
    const { certificate, diagnostics } = proofKindWitnessCertificate();
    writeCodeCertificate(certificate);
    expect(diagnostics).toEqual([]);
    // The witness agrees with the runtime classification for every kind.
    for (const kind of PROOF_KINDS) {
      expect(proofKindLevel(kind)).toBe(PROOF_KIND_LEVELS[kind]);
      expect(isCertificateProofKind(kind)).toBe(
        PROOF_KIND_LEVELS[kind] === "proved",
      );
    }
  });
});
