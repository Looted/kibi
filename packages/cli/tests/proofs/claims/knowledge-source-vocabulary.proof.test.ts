import { describe, expect, test } from "bun:test";
import {
  type CodeCertificate,
  exhaustiveCertificate,
  writeCodeCertificate,
} from "../../../src/public/proof-certificates.js";
import {
  INTENT_CLAIM_KINDS,
  KNOWLEDGE_SOURCE_AUTHORITIES,
  KNOWLEDGE_SOURCE_KINDS,
} from "../../../src/operations/bootstrap/types.js";

// implements REQ-kibi-knowledge-source-vocabulary

/**
 * The closed lists of knowledge source kinds, authorities and claim kinds. Kibi reads every constant itself at ingest, so the certificate is checked against the code.
 */

/** A knowledge source kind shall be issue_tracker, wiki, specification, design, decision_log, support, chat, repository_docs or other. */
export async function knowledgeSourceKindsCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-knowledge-source-kinds",
    domain: {
      symbolId:
        "SYM-kibi-bootstrap-cli-src-operations-bootstrap-types-knowledge-source-kinds",
      members: [...KNOWLEDGE_SOURCE_KINDS],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** A knowledge source authority shall be authoritative, supporting or stale. */
export async function knowledgeSourceAuthoritiesCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-knowledge-source-authorities",
    domain: {
      symbolId:
        "SYM-kibi-bootstrap-cli-src-operations-bootstrap-types-knowledge-source-authorities",
      members: [...KNOWLEDGE_SOURCE_AUTHORITIES],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

/** An intent claim kind shall be intent, observation or open_question. */
export async function intentClaimKindsCertificate(): Promise<CodeCertificate> {
  return exhaustiveCertificate({
    testId: "TEST-proof-intent-claim-kinds",
    domain: {
      symbolId:
        "SYM-kibi-bootstrap-cli-src-operations-bootstrap-types-intent-claim-kinds",
      members: [...INTENT_CLAIM_KINDS],
    },
    check: (member) => {
      expect(typeof member).toBe("string");
    },
  });
}

describe("Knowledge source kinds and claim kinds", () => {
  test("A knowledge source kind shall be issue_tracker, wiki, specification, design, decision_log, support, chat, repository_docs or other", async () => {
    writeCodeCertificate(await knowledgeSourceKindsCertificate());
    expect([...KNOWLEDGE_SOURCE_KINDS].sort()).toEqual([
      "chat",
      "decision_log",
      "design",
      "issue_tracker",
      "other",
      "repository_docs",
      "specification",
      "support",
      "wiki",
    ]);
  });

  test("A knowledge source authority shall be authoritative, supporting or stale", async () => {
    writeCodeCertificate(await knowledgeSourceAuthoritiesCertificate());
    expect([...KNOWLEDGE_SOURCE_AUTHORITIES].sort()).toEqual([
      "authoritative",
      "stale",
      "supporting",
    ]);
  });

  test("An intent claim kind shall be intent, observation or open_question", async () => {
    writeCodeCertificate(await intentClaimKindsCertificate());
    expect([...INTENT_CLAIM_KINDS].sort()).toEqual([
      "intent",
      "observation",
      "open_question",
    ]);
  });
});
