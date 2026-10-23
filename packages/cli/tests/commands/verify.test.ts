import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  type VerificationReport,
  executeVerify,
  renderVerification,
  verifyExitCode,
} from "../../src/commands/verify.js";
import type { OperationContext } from "../../src/public/operations/runtime-types.js";

const verified: VerificationReport = {
  version: "kibi.verification.v1",
  status: "verified",
  certificates: 3,
  verified: 3,
  rejected: [],
  theorems: [
    {
      theorem: "properties_consistent",
      verdict: "proved",
      groups: 2,
      models: 2,
      contradictions: [],
      unresolved: [],
    },
    {
      theorem: "decisions_consistent",
      verdict: "proved",
      groups: 0,
      models: 0,
      contradictions: [],
      unresolved: [],
    },
    { theorem: "rules_stratified", verdict: "proved", predicates: 3, edges: 2 },
  ],
  notCovered: ["rule_conflicts", "scenario_feasibility"],
};

// implements REQ-kibi-kb-certificates
describe("kibi verify report", () => {
  test("a verified bundle with every theorem proved exits 0", () => {
    expect(verifyExitCode(verified)).toBe(0);
    const text = renderVerification(verified);
    expect(text).toContain("Kibi verify: all 3 certificates re-verified");
    expect(text).toContain(
      "- Property facts are consistent: proved (2 of 2 groups have a model)",
    );
    expect(text).toContain(
      "- Allow/deny decisions are consistent: proved (no facts of this kind)",
    );
    expect(text).toContain(
      "- Stored rules are stratified: proved (3 predicates, 2 dependencies)",
    );
    expect(text).toContain("Not certified yet: opposing rule pairs");
  });

  test("a disproved theorem exits 1 and names the contradiction", () => {
    const report: VerificationReport = {
      ...verified,
      theorems: [
        {
          theorem: "properties_consistent",
          verdict: "disproved",
          groups: 1,
          models: 0,
          contradictions: [
            { subjectKey: "seat.pool", propertyKey: "free_seats", scope: "" },
          ],
          unresolved: [],
        },
      ],
    };
    expect(verifyExitCode(report)).toBe(1);
    expect(renderVerification(report)).toContain(
      "contradiction: seat.pool.free_seats",
    );
  });

  test("an unresolved theorem is reported without failing the run", () => {
    const report: VerificationReport = {
      ...verified,
      theorems: [
        {
          theorem: "properties_consistent",
          verdict: "unresolved",
          groups: 1,
          models: 0,
          contradictions: [],
          unresolved: [
            {
              subjectKey: "plan.price",
              propertyKey: "monthly",
              scope: "eu",
              reason: "the facts use different units",
            },
          ],
        },
      ],
    };
    expect(verifyExitCode(report)).toBe(0);
    expect(renderVerification(report)).toContain(
      "unresolved: plan.price.monthly (scope eu): the facts use different units",
    );
  });

  test("a rejected certificate exits 1 and says why", () => {
    const report: VerificationReport = {
      ...verified,
      status: "rejected",
      verified: 2,
      rejected: [
        {
          certificate: 2,
          kind: "property_model",
          reason: "model value does not satisfy FACT-SEAT-MAX",
        },
        {
          certificate: 0,
          kind: "missing",
          reason: "no certificate for this group",
          group: { namespace: "default", name: "allowed", args: ["a", "b"] },
        },
      ],
    };
    expect(verifyExitCode(report)).toBe(1);
    const text = renderVerification(report);
    expect(text).toContain(
      "2 certificate problem(s); 2 of 3 certificates re-verified",
    );
    expect(text).toContain(
      "- certificate 2 (property_model): model value does not satisfy FACT-SEAT-MAX",
    );
    expect(text).toContain(
      "- default:allowed(a, b): no certificate for this group",
    );
  });

  test("a missing or malformed saved bundle fails with a plain message", async () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), "kibi-verify-test-"));
    const context = { prolog: {} } as unknown as OperationContext;
    try {
      const missing = path.join(directory, "missing.json");
      await expect(
        executeVerify({ certificates: missing }, context),
      ).rejects.toThrow(`verify: no certificate bundle at ${missing}`);
      const broken = path.join(directory, "broken.json");
      writeFileSync(broken, "{oops");
      await expect(
        executeVerify({ certificates: broken }, context),
      ).rejects.toThrow(`verify: ${broken} is not valid JSON`);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
