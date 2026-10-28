import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { COMPILE_PLAN_VERSION } from "../../../src/operations/planning/compile-intent.js";
import { PLAN_APPLY_RESULT_VERSION } from "../../../src/operations/planning/apply-plan.js";
import { REPAIR_PLAN_VERSION } from "../../../src/public/operations/repair-plan.js";
import { SYMBOL_REPAIR_PLAN_VERSION } from "../../../src/public/operations/symbol-repair-plan.js";

// implements REQ-kibi-plan-document-versions

/**
 * The version strings of the plan documents Kibi writes and applies. Kibi reads
 * every constant itself at ingest, so the certificate is checked against the code.
 */

/** The compiled plan version shall be kibi.compile-plan.v1. */
export function compilePlanVersionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-compile-plan-version",
    symbolId:
      "SYM-kibi-cli-src-operations-planning-compile-intent-ts-compile-plan-version",
    value: COMPILE_PLAN_VERSION,
  });
}

/** The plan apply result version shall be kibi.plan-apply-result.v1. */
export function planApplyResultVersionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-plan-apply-result-version",
    symbolId:
      "SYM-kibi-cli-src-operations-planning-apply-plan-ts-plan-apply-result-version",
    value: PLAN_APPLY_RESULT_VERSION,
  });
}

/** The repair plan version shall be kibi.repair-plan.v1. */
export function repairPlanVersionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-repair-plan-version",
    symbolId: "SYM-reqcompiler-repair-plan-version",
    value: REPAIR_PLAN_VERSION,
  });
}

/** The symbol repair plan version shall be kibi.symbol-repair-plan.v1. */
export function symbolRepairPlanVersionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-symbol-repair-plan-version",
    symbolId: "SYM-symbol-repair-plan-version",
    value: SYMBOL_REPAIR_PLAN_VERSION,
  });
}

describe("Plan document versions", () => {
  test("The compiled plan version shall be kibi.compile-plan.v1", () => {
    writeCodeCertificate(compilePlanVersionCertificate());
    expect(COMPILE_PLAN_VERSION).toBe("kibi.compile-plan.v1");
  });

  test("The plan apply result version shall be kibi.plan-apply-result.v1", () => {
    writeCodeCertificate(planApplyResultVersionCertificate());
    expect(PLAN_APPLY_RESULT_VERSION).toBe("kibi.plan-apply-result.v1");
  });

  test("The repair plan version shall be kibi.repair-plan.v1", () => {
    writeCodeCertificate(repairPlanVersionCertificate());
    expect(REPAIR_PLAN_VERSION).toBe("kibi.repair-plan.v1");
  });

  test("The symbol repair plan version shall be kibi.symbol-repair-plan.v1", () => {
    writeCodeCertificate(symbolRepairPlanVersionCertificate());
    expect(SYMBOL_REPAIR_PLAN_VERSION).toBe("kibi.symbol-repair-plan.v1");
  });
});
