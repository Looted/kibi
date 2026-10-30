import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  LOGIC_IR_VERSION,
  LOGIC_RULE_MAX_ATOMS,
  LOGIC_RULE_MAX_DEPTH,
  LOGIC_RULE_MAX_VARIABLES,
} from "../../../src/logic/ir.js";

// implements REQ-kibi-logic-rule-limits

/**
 * The version and size bounds of a logical requirement rule. Kibi reads every
 * constant itself at ingest, so the certificate is checked against the code.
 */

/** The logic IR version shall be kibi.logic.v1. */
export function logicIrVersionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-logic-ir-version",
    symbolId: "SYM-cli-logic-ir-LOGIC_IR_VERSION",
    value: LOGIC_IR_VERSION,
  });
}

/** A logical rule shall hold at most 64 atoms. */
export function logicRuleMaxAtomsCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-logic-rule-max-atoms",
    variable: "max_atoms",
    valueType: "int",
    assumptions: [{ operator: "eq", value: LOGIC_RULE_MAX_ATOMS }],
    claim: { operator: "eq", value: 64 },
  });
}

/** A logical rule shall nest at most 16 levels deep. */
export function logicRuleMaxDepthCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-logic-rule-max-depth",
    variable: "max_depth",
    valueType: "int",
    assumptions: [{ operator: "eq", value: LOGIC_RULE_MAX_DEPTH }],
    claim: { operator: "eq", value: 16 },
  });
}

/** A logical rule shall use at most 32 variables. */
export function logicRuleMaxVariablesCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-logic-rule-max-variables",
    variable: "max_variables",
    valueType: "int",
    assumptions: [{ operator: "eq", value: LOGIC_RULE_MAX_VARIABLES }],
    claim: { operator: "eq", value: 32 },
  });
}

describe("Logical requirement rule limits", () => {
  test("The logic IR version shall be kibi.logic.v1", () => {
    writeCodeCertificate(logicIrVersionCertificate());
    expect(LOGIC_IR_VERSION).toBe("kibi.logic.v1");
  });

  test("A logical rule shall hold at most 64 atoms", () => {
    writeCodeCertificate(logicRuleMaxAtomsCertificate());
    expect(LOGIC_RULE_MAX_ATOMS).toBe(64);
  });

  test("A logical rule shall nest at most 16 levels deep", () => {
    writeCodeCertificate(logicRuleMaxDepthCertificate());
    expect(LOGIC_RULE_MAX_DEPTH).toBe(16);
  });

  test("A logical rule shall use at most 32 variables", () => {
    writeCodeCertificate(logicRuleMaxVariablesCertificate());
    expect(LOGIC_RULE_MAX_VARIABLES).toBe(32);
  });
});
