import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  readProjectSource,
  sourceCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";

// implements REQ-ci-kb-merge-gate-order

/**
 * The order of the KB merge workflow's resolve steps. Kibi reads the run
 * command of each step in .github/workflows/kb-merge.yml at ingest and checks
 * the claim's precedes fact against that list.
 */
const WORKSPACE = `${import.meta.dir}/../../../../..`;

const PROOF_GATE = "sh scripts/proof-gate.sh";
const PUSH = 'git push origin "HEAD:refs/heads/$KIBI_BRANCH"';

/** The Kibi KB merge workflow must run the proof gate before pushing a merge. */
export function kbMergeGateOrderCertificate(): CodeCertificate {
  return sourceCertificate({ testId: "TEST-proof-kb-merge-gate-order" });
}

describe("the KB merge workflow step order", () => {
  test("the proof gate runs before the merge is pushed", async () => {
    writeCodeCertificate(kbMergeGateOrderCertificate());
    const read = await readProjectSource(
      {
        reader: "yaml",
        file: ".github/workflows/kb-merge.yml",
        path: "jobs.resolve.steps",
        select: "items",
        field: "run",
      },
      WORKSPACE,
    );
    const steps = read.sequence ?? [];
    expect(steps).toContain(PROOF_GATE);
    expect(steps).toContain(PUSH);
    expect(steps.lastIndexOf(PROOF_GATE)).toBeLessThan(steps.indexOf(PUSH));
  });
});
