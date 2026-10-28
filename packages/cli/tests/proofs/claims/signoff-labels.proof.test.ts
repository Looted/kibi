import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  SIGNOFF_CHANGE_LABELS,
  SIGNOFF_GATE_LABELS,
} from "../../../src/signoff/model.js";

// implements REQ-kibi-signoff-labels

/**
 * The gates and change kinds a signoff view names, and the label shown for each. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** A signoff gate shall be semantic, scenario, implementation, e2e, evidence or tested. */
export async function signoffGateNamesCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-signoff-gate-names",
    domain: {
      symbolId: "SYM-cli-signoff-model-signoff-gate-labels",
      members: [...Object.keys(SIGNOFF_GATE_LABELS)],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** A signoff change shall be new, changed, affected or retired. */
export async function signoffChangeNamesCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-signoff-change-names",
    domain: {
      symbolId: "SYM-cli-signoff-model-signoff-change-labels",
      members: [...Object.keys(SIGNOFF_CHANGE_LABELS)],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** The signoff label of the semantic gate shall be semantic model incomplete. */
export function signoffGateSemanticLabelCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-signoff-gate-semantic-label",
    symbolId: "SYM-cli-signoff-model-signoff-gate-labels",
    value: SIGNOFF_GATE_LABELS.semantic,
  });
}

/** The signoff label of the scenario gate shall be no scenario yet. */
export function signoffGateScenarioLabelCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-signoff-gate-scenario-label",
    symbolId: "SYM-cli-signoff-model-signoff-gate-labels",
    value: SIGNOFF_GATE_LABELS.scenario,
  });
}

/** The signoff label of the implementation gate shall be no owning code yet. */
export function signoffGateImplementationLabelCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-signoff-gate-implementation-label",
    symbolId: "SYM-cli-signoff-model-signoff-gate-labels",
    value: SIGNOFF_GATE_LABELS.implementation,
  });
}

/** The signoff label of the e2e gate shall be no end-to-end test yet. */
export function signoffGateE2eLabelCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-signoff-gate-e2e-label",
    symbolId: "SYM-cli-signoff-model-signoff-gate-labels",
    value: SIGNOFF_GATE_LABELS.e2e,
  });
}

/** The signoff label of the evidence gate shall be end-to-end evidence not current. */
export function signoffGateEvidenceLabelCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-signoff-gate-evidence-label",
    symbolId: "SYM-cli-signoff-model-signoff-gate-labels",
    value: SIGNOFF_GATE_LABELS.evidence,
  });
}

/** The signoff label of the tested gate shall be tested. */
export function signoffGateTestedLabelCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-signoff-gate-tested-label",
    symbolId: "SYM-cli-signoff-model-signoff-gate-labels",
    value: SIGNOFF_GATE_LABELS.tested,
  });
}

/** The signoff label of a new change shall be New. */
export function signoffChangeNewLabelCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-signoff-change-new-label",
    symbolId: "SYM-cli-signoff-model-signoff-change-labels",
    value: SIGNOFF_CHANGE_LABELS.new,
  });
}

/** The signoff label of a changed change shall be Changed. */
export function signoffChangeChangedLabelCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-signoff-change-changed-label",
    symbolId: "SYM-cli-signoff-model-signoff-change-labels",
    value: SIGNOFF_CHANGE_LABELS.changed,
  });
}

/** The signoff label of a retired change shall be Superseded or retired. */
export function signoffChangeRetiredLabelCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-signoff-change-retired-label",
    symbolId: "SYM-cli-signoff-model-signoff-change-labels",
    value: SIGNOFF_CHANGE_LABELS.retired,
  });
}

describe("Signoff gate and change labels", () => {
  test("A signoff gate shall be semantic, scenario, implementation, e2e, evidence or tested", async () => {
    writeCodeCertificate(await signoffGateNamesCertificate());
    expect([...Object.keys(SIGNOFF_GATE_LABELS)].sort()).toEqual([
      "e2e",
      "evidence",
      "implementation",
      "scenario",
      "semantic",
      "tested",
    ]);
  });

  test("A signoff change shall be new, changed, affected or retired", async () => {
    writeCodeCertificate(await signoffChangeNamesCertificate());
    expect([...Object.keys(SIGNOFF_CHANGE_LABELS)].sort()).toEqual([
      "affected",
      "changed",
      "new",
      "retired",
    ]);
  });

  test("The signoff label of the semantic gate shall be semantic model incomplete", () => {
    writeCodeCertificate(signoffGateSemanticLabelCertificate());
    expect(SIGNOFF_GATE_LABELS.semantic).toBe("semantic model incomplete");
  });

  test("The signoff label of the scenario gate shall be no scenario yet", () => {
    writeCodeCertificate(signoffGateScenarioLabelCertificate());
    expect(SIGNOFF_GATE_LABELS.scenario).toBe("no scenario yet");
  });

  test("The signoff label of the implementation gate shall be no owning code yet", () => {
    writeCodeCertificate(signoffGateImplementationLabelCertificate());
    expect(SIGNOFF_GATE_LABELS.implementation).toBe("no owning code yet");
  });

  test("The signoff label of the e2e gate shall be no end-to-end test yet", () => {
    writeCodeCertificate(signoffGateE2eLabelCertificate());
    expect(SIGNOFF_GATE_LABELS.e2e).toBe("no end-to-end test yet");
  });

  test("The signoff label of the evidence gate shall be end-to-end evidence not current", () => {
    writeCodeCertificate(signoffGateEvidenceLabelCertificate());
    expect(SIGNOFF_GATE_LABELS.evidence).toBe(
      "end-to-end evidence not current",
    );
  });

  test("The signoff label of the tested gate shall be tested", () => {
    writeCodeCertificate(signoffGateTestedLabelCertificate());
    expect(SIGNOFF_GATE_LABELS.tested).toBe("tested");
  });

  test("The signoff label of a new change shall be New", () => {
    writeCodeCertificate(signoffChangeNewLabelCertificate());
    expect(SIGNOFF_CHANGE_LABELS.new).toBe("New");
  });

  test("The signoff label of a changed change shall be Changed", () => {
    writeCodeCertificate(signoffChangeChangedLabelCertificate());
    expect(SIGNOFF_CHANGE_LABELS.changed).toBe("Changed");
  });

  test("The signoff label of a retired change shall be Superseded or retired", () => {
    writeCodeCertificate(signoffChangeRetiredLabelCertificate());
    expect(SIGNOFF_CHANGE_LABELS.retired).toBe("Superseded or retired");
  });
});
