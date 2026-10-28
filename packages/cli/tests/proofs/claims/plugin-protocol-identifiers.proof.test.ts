import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  regexCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  CHECK_POLICY_CAPABILITY_ID,
  KIBI_PLUGIN_API_VERSION,
  ONTOLOGY_PACK_CAPABILITY_ID,
} from "kibi-plugin-sdk";

// implements REQ-capability-plugin-protocol-identifiers

/**
 * The protocol version and capability ids of the plugin SDK.
 * Kibi reads each constant itself at ingest, so the certificate is checked against the code.
 */

/** The Kibi plugin API version shall be kibi.plugin.v1. */
export function pluginApiVersionCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-plugin-api-version",
    symbolId: "SYM-cap-plugin-kibi-plugin-api-version-f5d09d81",
    value: KIBI_PLUGIN_API_VERSION,
  });
}

/** The ontology pack capability id shall be kibi.ontology-pack.v1. */
export function ontologyPackCapabilityIdCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-ontology-pack-capability-id",
    symbolId: "SYM-cap-plugin-ontology-pack-capability-id-d76dee06",
    value: ONTOLOGY_PACK_CAPABILITY_ID,
  });
}

/** The check policy capability id shall be kibi.check-policy.v1. */
export function checkPolicyCapabilityIdCertificate(): CodeCertificate {
  return regexCertificate({
    testId: "TEST-proof-check-policy-capability-id",
    symbolId: "SYM-const-check-policy-capability-id",
    value: CHECK_POLICY_CAPABILITY_ID,
  });
}

describe("Capability plugin protocol identifiers", () => {
  test("The Kibi plugin API version shall be kibi.plugin.v1", () => {
    writeCodeCertificate(pluginApiVersionCertificate());
    expect(KIBI_PLUGIN_API_VERSION).toBe("kibi.plugin.v1");
  });

  test("The ontology pack capability id shall be kibi.ontology-pack.v1", () => {
    writeCodeCertificate(ontologyPackCapabilityIdCertificate());
    expect(ONTOLOGY_PACK_CAPABILITY_ID).toBe("kibi.ontology-pack.v1");
  });

  test("The check policy capability id shall be kibi.check-policy.v1", () => {
    writeCodeCertificate(checkPolicyCapabilityIdCertificate());
    expect(CHECK_POLICY_CAPABILITY_ID).toBe("kibi.check-policy.v1");
  });
});
