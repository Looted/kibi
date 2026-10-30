import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  arithmeticCertificate,
  exhaustiveCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  ENTITY_QUERY_CHUNK_SIZE,
  PROOF_CONTRACT_PAGE_SIZE,
  SEARCH_CANDIDATE_PAGE_SIZE,
  VALID_ENTITY_TYPES,
} from "../../../src/public/operations/discovery-entities.js";
import { QUERY_BODY_MAX_CHARS } from "../../../src/public/operations/discovery-executors.js";
import { KIBI_PROTOCOL_VERSION } from "../../../src/public/operations/result-envelope.js";

// implements REQ-kibi-operation-page-sizes

/**
 * The page sizes, body limit, entity types and protocol version shared by the CLI
 * and MCP operations. Kibi reads every constant itself at ingest, so the certificate is checked against the code.
 */

/** An entity query shall load at most 25 entities per chunk. */
export function entityQueryChunkSizeCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-entity-query-chunk-size",
    variable: "entity_chunk_size",
    valueType: "int",
    assumptions: [{ operator: "eq", value: ENTITY_QUERY_CHUNK_SIZE }],
    claim: { operator: "eq", value: 25 },
  });
}

/** A proof contract page shall hold at most 100 contracts. */
export function proofContractPageSizeCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-proof-contract-page-size",
    variable: "proof_contract_page_size",
    valueType: "int",
    assumptions: [{ operator: "eq", value: PROOF_CONTRACT_PAGE_SIZE }],
    claim: { operator: "eq", value: 100 },
  });
}

/** A search candidate page shall hold at most 500 candidates. */
export function searchCandidatePageSizeCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-search-candidate-page-size",
    variable: "search_candidate_page_size",
    valueType: "int",
    assumptions: [{ operator: "eq", value: SEARCH_CANDIDATE_PAGE_SIZE }],
    claim: { operator: "eq", value: 500 },
  });
}

/** A query shall return at most 32000 characters of an entity body. */
export function queryBodyMaxCharsCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-query-body-max-chars",
    variable: "body_max_chars",
    valueType: "int",
    assumptions: [{ operator: "eq", value: QUERY_BODY_MAX_CHARS }],
    claim: { operator: "eq", value: 32000 },
  });
}

/** The Kibi operation protocol version shall be 1. */
export function operationProtocolVersionCertificate(): CodeCertificate {
  return arithmeticCertificate({
    testId: "TEST-proof-operation-protocol-version",
    variable: "protocol_version",
    valueType: "int",
    assumptions: [{ operator: "eq", value: KIBI_PROTOCOL_VERSION }],
    claim: { operator: "eq", value: 1 },
  });
}

/** A query entity type shall be req, scenario, test, adr, flag, event, symbol or fact. */
export async function queryEntityTypesCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-query-entity-types",
    domain: {
      symbolId: "SYM-cli-discovery-valid-entity-types",
      members: [...VALID_ENTITY_TYPES],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

describe("Operation query page sizes and entity types", () => {
  test("An entity query shall load at most 25 entities per chunk", () => {
    writeCodeCertificate(entityQueryChunkSizeCertificate());
    expect(ENTITY_QUERY_CHUNK_SIZE).toBe(25);
  });

  test("A proof contract page shall hold at most 100 contracts", () => {
    writeCodeCertificate(proofContractPageSizeCertificate());
    expect(PROOF_CONTRACT_PAGE_SIZE).toBe(100);
  });

  test("A search candidate page shall hold at most 500 candidates", () => {
    writeCodeCertificate(searchCandidatePageSizeCertificate());
    expect(SEARCH_CANDIDATE_PAGE_SIZE).toBe(500);
  });

  test("A query shall return at most 32000 characters of an entity body", () => {
    writeCodeCertificate(queryBodyMaxCharsCertificate());
    expect(QUERY_BODY_MAX_CHARS).toBe(32000);
  });

  test("The Kibi operation protocol version shall be 1", () => {
    writeCodeCertificate(operationProtocolVersionCertificate());
    expect(KIBI_PROTOCOL_VERSION).toBe(1);
  });

  test("A query entity type shall be req, scenario, test, adr, flag, event, symbol or fact", async () => {
    writeCodeCertificate(await queryEntityTypesCertificate());
    expect([...VALID_ENTITY_TYPES].sort()).toEqual([
      "adr",
      "event",
      "fact",
      "flag",
      "req",
      "scenario",
      "symbol",
      "test",
    ]);
  });
});
