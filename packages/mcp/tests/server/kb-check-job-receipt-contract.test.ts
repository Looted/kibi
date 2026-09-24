import { describe, expect, test } from "bun:test";
// implements REQ-kibi-verification-evidence-contract
import Ajv2020 from "ajv/dist/2020";

import { startJob } from "../../src/server/jobs.js";
import { TOOLS } from "../../src/tools-config.js";

const ajv = new Ajv2020({ strict: false, allErrors: true });

function kbCheckOutputSchema() {
  const tool = TOOLS.find((candidate) => candidate.name === "kb_check");
  expect(tool?.outputSchema).toBeDefined();
  return tool?.outputSchema as Record<string, unknown>;
}

function envelope(data: unknown) {
  return {
    kibiProtocol: 1,
    operation: "kb_check",
    resultVersion: "kibi.kb_check.v1",
    status: "success",
    data,
    effects: [
      { kind: "kb-read", status: "completed" },
      { kind: "workspace-read", status: "completed" },
    ],
    diagnostics: [],
    nextActions: [],
  };
}

const synchronousData = {
  violations: [],
  count: 0,
  diagnostics: [],
  qualityDiagnostics: [],
  impactDiagnostics: [],
  sourceFiles: [],
  extractedSymbols: [],
  linkedEntities: [],
  nextActions: [],
  migrationPlan: { status: "no_actions" },
};

describe("kb_check output contract admits async job receipts", () => {
  test("a kibi.job.v1 receipt envelope validates against the declared schema", () => {
    const validate = ajv.compile(kbCheckOutputSchema());
    const receipt = startJob("kb_check", async () => ({ ok: true }));
    expect(validate(envelope(receipt))).toBe(true);
  });

  test("the synchronous check payload still validates against the same schema", () => {
    const validate = ajv.compile(kbCheckOutputSchema());
    expect(validate(envelope(synchronousData))).toBe(true);
  });

  test("a payload mixing receipt fields into the check shape is rejected", () => {
    const validate = ajv.compile(kbCheckOutputSchema());
    const mixed = { ...synchronousData, jobId: "job-kb_check-1-notreal" };
    expect(validate(envelope(mixed))).toBe(false);
  });

  test("an incomplete receipt without the polling fields is rejected", () => {
    const validate = ajv.compile(kbCheckOutputSchema());
    const partial = {
      kibiProtocol: 1,
      jobVersion: "kibi.job.v1",
      jobId: "job-kb_check-1-notreal",
    };
    expect(validate(envelope(partial))).toBe(false);
  });
});
