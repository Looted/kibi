import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import { PLUGIN_MODES } from "../../../../plugin-sdk/src/protocol.js";
import { ONTOLOGY_POLARITIES } from "../../../../plugin-sdk/src/capabilities/ontology-pack.js";
import {
  SEMANTIC_LANES,
  SEMANTIC_SIGNAL_KINDS,
} from "../../../../plugin-sdk/src/capabilities/semantic-classifier.js";
import { EXTERNAL_SEMANTIC_CLASSIFIER_OPERATIONS } from "../../../src/plugins/external-allowlist.js";

// implements REQ-capability-plugin-vocabulary

/**
 * The modes a capability plugin may run in, the polarities of an ontology pack rule, the semantic lanes and signal kinds a classifier may report, and the operations that may load an external classifier. Kibi reads every value itself at ingest, so the certificate is checked against the code.
 */

/** A capability plugin mode shall be replace, augment or shadow. */
export async function pluginModesCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-plugin-modes",
    domain: {
      symbolId: "SYM-cap-plugin-plugin-modes-52a9d01a",
      members: [...PLUGIN_MODES],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** An ontology pack polarity shall be assert or deny. */
export async function ontologyPolaritiesCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-ontology-polarities",
    domain: {
      symbolId: "SYM-cap-plugin-ontology-polarities-1200e8a1",
      members: [...ONTOLOGY_POLARITIES],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** A semantic lane shall be strict_property, predicate, rule, observation_review or none. */
export async function semanticLanesCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-semantic-lanes",
    domain: {
      symbolId: "SYM-cap-plugin-semantic-lanes-163e7bc6",
      members: [...SEMANTIC_LANES],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** A semantic signal kind shall be normative_modal, numeric_cardinality, numeric_threshold, conditional, permission or state_or_default. */
export async function semanticSignalKindsCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-semantic-signal-kinds",
    domain: {
      symbolId: "SYM-cap-plugin-semantic-signal-kinds-eb004334",
      members: [...SEMANTIC_SIGNAL_KINDS],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** An external semantic classifier shall load only for kb_semantic_advisor or kb_compile_intent. */
export async function externalClassifierOperationsCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-external-classifier-operations",
    domain: {
      symbolId:
        "SYM-cap-plugin-external-semantic-classifier-operations-2fb73e29",
      members: [...EXTERNAL_SEMANTIC_CLASSIFIER_OPERATIONS],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

describe("Capability plugin modes, polarities and lanes", () => {
  test("A capability plugin mode shall be replace, augment or shadow", async () => {
    writeCodeCertificate(await pluginModesCertificate());
    expect([...PLUGIN_MODES].sort()).toEqual(["augment", "replace", "shadow"]);
  });

  test("An ontology pack polarity shall be assert or deny", async () => {
    writeCodeCertificate(await ontologyPolaritiesCertificate());
    expect([...ONTOLOGY_POLARITIES].sort()).toEqual(["assert", "deny"]);
  });

  test("A semantic lane shall be strict_property, predicate, rule, observation_review or none", async () => {
    writeCodeCertificate(await semanticLanesCertificate());
    expect([...SEMANTIC_LANES].sort()).toEqual([
      "none",
      "observation_review",
      "predicate",
      "rule",
      "strict_property",
    ]);
  });

  test("A semantic signal kind shall be normative_modal, numeric_cardinality, numeric_threshold, conditional, permission or state_or_default", async () => {
    writeCodeCertificate(await semanticSignalKindsCertificate());
    expect([...SEMANTIC_SIGNAL_KINDS].sort()).toEqual([
      "conditional",
      "normative_modal",
      "numeric_cardinality",
      "numeric_threshold",
      "permission",
      "state_or_default",
    ]);
  });

  test("An external semantic classifier shall load only for kb_semantic_advisor or kb_compile_intent", async () => {
    writeCodeCertificate(await externalClassifierOperationsCertificate());
    expect([...EXTERNAL_SEMANTIC_CLASSIFIER_OPERATIONS].sort()).toEqual([
      "kb_compile_intent",
      "kb_semantic_advisor",
    ]);
  });
});
