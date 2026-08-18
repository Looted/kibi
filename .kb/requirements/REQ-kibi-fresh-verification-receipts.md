---
id: REQ-kibi-fresh-verification-receipts
title: Requirement proof uses fresh snapshot-bound verification receipts
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
  - CLAIM-5705BEF8033A2F95
  - CLAIM-CA3A58EE7669E556
  - CLAIM-1A6090A64DDC891E
  - CLAIM-A431BF90412D45F8
  - CLAIM-BCCEE9616D8F0A33
  - CLAIM-8860B049C5D3055F
semantic_clauses:
  - Proof-bearing end-to-end tests must carry append-only kibi.verification-receipt.v1 execution history
  - Each receipt must bind its test ID, typed verification scope, runner command, current code snapshot, environment hash, timestamps, outcome, and artifact digest
  - The newest receipt for the current code snapshot must be passing and no older than seven days
  - A missing, stale, failed, malformed, mismatched, or future-dated receipt must not prove the requirement
  - Coverage and status must expose the deterministic current code snapshot through CLI and MCP
  - Durable test status remains structural metadata and cannot substitute for a receipt
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 281a0e89672a645a33ef251d782ab65a4ecb35260e5c98098e1db1a44cca52ff
semantic_inventory:
  - claim_key: CLAIM-5705BEF8033A2F95
    claim_text: Proof-bearing end-to-end tests must carry append-only kibi.verification-receipt.v1 execution history
    role: normative
    status: modeled
    span:
      start: 0
      end: 100
  - claim_key: CLAIM-CA3A58EE7669E556
    claim_text: Each receipt must bind its test ID, typed verification scope, runner command, current code snapshot, environment hash, timestamps, outcome, and artifact digest
    role: normative
    status: modeled
    span:
      start: 102
      end: 261
  - claim_key: CLAIM-1A6090A64DDC891E
    claim_text: The newest receipt for the current code snapshot must be passing and no older than seven days
    role: normative
    status: modeled
    span:
      start: 263
      end: 356
  - claim_key: CLAIM-A431BF90412D45F8
    claim_text: A missing, stale, failed, malformed, mismatched, or future-dated receipt must not prove the requirement
    role: normative
    status: modeled
    span:
      start: 358
      end: 461
  - claim_key: CLAIM-BCCEE9616D8F0A33
    claim_text: Coverage and status must expose the deterministic current code snapshot through CLI and MCP
    role: normative
    status: modeled
    span:
      start: 463
      end: 554
  - claim_key: CLAIM-8860B049C5D3055F
    claim_text: Durable test status remains structural metadata and cannot substitute for a receipt
    role: normative
    status: modeled
    span:
      start: 556
      end: 639
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
semantic_text: Proof-bearing end-to-end tests must carry append-only kibi.verification-receipt.v1 execution history. Each receipt must bind its test ID, typed verification scope, runner command, current code snapshot, environment hash, timestamps, outcome, and artifact digest. The newest receipt for the current code snapshot must be passing and no older than seven days. A missing, stale, failed, malformed, mismatched, or future-dated receipt must not prove the requirement. Coverage and status must expose the deterministic current code snapshot through CLI and MCP. Durable test status remains structural metadata and cannot substitute for a receipt.
---

Proof-bearing end-to-end tests must carry append-only kibi.verification-receipt.v1 execution history. Each receipt must bind its test ID, typed verification scope, runner command, current code snapshot, environment hash, timestamps, outcome, and artifact digest. The newest receipt for the current code snapshot must be passing and no older than seven days. A missing, stale, failed, malformed, mismatched, or future-dated receipt must not prove the requirement. Coverage and status must expose the deterministic current code snapshot through CLI and MCP. Durable test status remains structural metadata and cannot substitute for a receipt.
