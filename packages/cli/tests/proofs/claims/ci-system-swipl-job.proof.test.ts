import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  readProjectSource,
  sourceCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";

// implements REQ-prolog-ci-system-swipl-job

/**
 * The CI job that keeps testing a system SWI-Prolog. Kibi reads the workflow
 * file itself at ingest, so the claim stays proved only while the job still
 * selects the system build.
 */
const WORKSPACE = `${import.meta.dir}/../../../../../`;

/** The ci-integration job of the Kibi CI workflow shall set KIBI_SWIPL to system. */
export function ciIntegrationSystemSwiplCertificate(): CodeCertificate {
  return sourceCertificate({
    testId: "TEST-proof-ci-integration-system-swipl",
  });
}

describe("Kibi's CI keeps a system SWI-Prolog job", () => {
  test("The ci-integration job of the Kibi CI workflow shall set KIBI_SWIPL to system", async () => {
    writeCodeCertificate(ciIntegrationSystemSwiplCertificate());
    const read = await readProjectSource(
      {
        reader: "yaml",
        file: ".github/workflows/ci.yml",
        path: "jobs.ci-integration.env.KIBI_SWIPL",
      },
      WORKSPACE,
    );
    expect([...new Set(read.members)].sort()).toEqual(["system"]);
  });
});
