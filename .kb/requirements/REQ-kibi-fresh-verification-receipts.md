---
id: REQ-kibi-fresh-verification-receipts
title: Requirement proof uses fresh snapshot-bound proof receipts
status: open
created_at: 2026-08-10T00:00:00.000Z
updated_at: 2026-08-10T00:00:00.000Z
source: documentation/requirements/REQ-kibi-fresh-verification-receipts.md
priority: must
tags:
  - requirements
  - proof
  - verification
  - receipts
  - e2e
  - parity
  - snapshot-v2
logic_claims:
  - CLAIM-6DC078CEB554A685
  - CLAIM-BCC4E6CCF9623500
  - CLAIM-A3834334B2DFAF17
  - CLAIM-BB50FABD208405B7
  - CLAIM-BCCEE9616D8F0A33
  - CLAIM-0C6463BA2B3AA64B
semantic_clauses:
  - Proof-bearing tests must carry append-only kibi.proof-receipt.v1 execution history
  - Each proof receipt must bind its test ID, typed verification scope, integration command, current code snapshot, canonical environment hash, execution fingerprint, timestamps, outcome, and artifact digest
  - The newest proof receipt for the current code snapshot must be passing and no older than seven days
  - A missing, stale, failed, malformed, mismatched, or future-dated proof receipt must not prove the requirement
  - Coverage and status must expose the deterministic current code snapshot through CLI and MCP
  - Durable test status remains structural metadata and cannot substitute for proof receipts
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ea08e897eed3828ea24961964453ff8f5c1758c72f4f61fb19cffa09b98d5d2f
semantic_inventory:
  - claim_key: CLAIM-6DC078CEB554A685
    claim_text: Proof-bearing tests must carry append-only kibi.proof-receipt.v1 execution history
    role: normative
    status: modeled
    span:
      start: 0
      end: 82
  - claim_key: CLAIM-BCC4E6CCF9623500
    claim_text: Each proof receipt must bind its test ID, typed verification scope, integration command, current code snapshot, canonical environment hash, execution fingerprint, timestamps, outcome, and artifact digest
    role: normative
    status: modeled
    span:
      start: 84
      end: 287
  - claim_key: CLAIM-A3834334B2DFAF17
    claim_text: The newest proof receipt for the current code snapshot must be passing and no older than seven days
    role: normative
    status: modeled
    span:
      start: 289
      end: 388
  - claim_key: CLAIM-BB50FABD208405B7
    claim_text: A missing, stale, failed, malformed, mismatched, or future-dated proof receipt must not prove the requirement
    role: normative
    status: modeled
    span:
      start: 390
      end: 499
  - claim_key: CLAIM-BCCEE9616D8F0A33
    claim_text: Coverage and status must expose the deterministic current code snapshot through CLI and MCP
    role: normative
    status: modeled
    span:
      start: 501
      end: 592
  - claim_key: CLAIM-0C6463BA2B3AA64B
    claim_text: Durable test status remains structural metadata and cannot substitute for proof receipts
    role: normative
    status: modeled
    span:
      start: 594
      end: 682
links:
  - type: specified_by
    target: SCEN-kibi-fresh-verification-receipts
  - type: requires_predicate
    target: FACT-VERIFICATION-RECEIPT-HISTORY
  - type: requires_predicate
    target: FACT-VERIFICATION-RECEIPT-BINDING
  - type: requires_predicate
    target: FACT-VERIFICATION-RECEIPT-FRESHNESS
  - type: requires_predicate
    target: FACT-VERIFICATION-RECEIPT-REJECTS-INVALID
  - type: requires_predicate
    target: FACT-VERIFICATION-RECEIPT-SNAPSHOT-SURFACES
  - type: requires_predicate
    target: FACT-VERIFICATION-RECEIPT-STATUS-NONAUTHORITY
  - type: supersedes
    target: REQ-kibi-verification-receipts-v2
type: req
semantic_text: Proof-bearing tests must carry append-only kibi.proof-receipt.v1 execution history. Each proof receipt must bind its test ID, typed verification scope, integration command, current code snapshot, canonical environment hash, execution fingerprint, timestamps, outcome, and artifact digest. The newest proof receipt for the current code snapshot must be passing and no older than seven days. A missing, stale, failed, malformed, mismatched, or future-dated proof receipt must not prove the requirement. Coverage and status must expose the deterministic current code snapshot through CLI and MCP. Durable test status remains structural metadata and cannot substitute for proof receipts.
---

Proof-bearing tests must carry append-only kibi.proof-receipt.v1 execution history. Each proof receipt must bind its test ID, typed verification scope, integration command, current code snapshot, canonical environment hash, execution fingerprint, timestamps, outcome, and artifact digest. The newest proof receipt for the current code snapshot must be passing and no older than seven days. A missing, stale, failed, malformed, mismatched, or future-dated proof receipt must not prove the requirement. Coverage and status must expose the deterministic current code snapshot through CLI and MCP. Durable test status remains structural metadata and cannot substitute for proof receipts.
