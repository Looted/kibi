---
title: Proof receipts are validated as fresh, passing and bound to the current snapshot before they prove a requirement
status: open
semantic_text: Proof-bearing tests must carry proof receipt execution history that kb_upsert and incremental sync never shorten, rewrite, or reorder. Each proof receipt must bind its test ID, typed verification scope, integration command, current code snapshot, canonical environment hash, execution fingerprint, timestamps, outcome, and artifact digest. The newest proof receipt for the current code snapshot must be passing and no older than seven days. A missing, stale, failed, malformed, mismatched, or future-dated proof receipt must not prove the requirement. Coverage and status must expose the deterministic current code snapshot through CLI and MCP. Durable test status remains structural metadata and cannot substitute for proof receipts. Receipt bindings must locate the test document and each symbol source file through a normalized repository-relative path.
semantic_clauses:
  - Proof-bearing tests must carry proof receipt execution history that kb_upsert and incremental sync never shorten, rewrite, or reorder
  - Each proof receipt must bind its test ID, typed verification scope, integration command, current code snapshot, canonical environment hash, execution fingerprint, timestamps, outcome, and artifact digest
  - The newest proof receipt for the current code snapshot must be passing and no older than seven days
  - A missing, stale, failed, malformed, mismatched, or future-dated proof receipt must not prove the requirement
  - Coverage and status must expose the deterministic current code snapshot through CLI and MCP
  - Durable test status remains structural metadata and cannot substitute for proof receipts
  - Receipt bindings must locate the test document and each symbol source file through a normalized repository-relative path
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 99230e4a1dd9f05751cbaa54c7e82b0bcf1aa7cbe6e52f4d1eb07074ab867893
semantic_inventory:
  - claim_key: CLAIM-76ACF45E5EAD5F00
    claim_text: Proof-bearing tests must carry proof receipt execution history that kb_upsert and incremental sync never shorten, rewrite, or reorder
    role: normative
    status: modeled
    span:
      start: 0
      end: 133
    reason: Grounded by a verification_receipt_rule fact reviewed against the current code.
  - claim_key: CLAIM-BCC4E6CCF9623500
    claim_text: Each proof receipt must bind its test ID, typed verification scope, integration command, current code snapshot, canonical environment hash, execution fingerprint, timestamps, outcome, and artifact digest
    role: normative
    status: modeled
    span:
      start: 135
      end: 338
  - claim_key: CLAIM-A3834334B2DFAF17
    claim_text: The newest proof receipt for the current code snapshot must be passing and no older than seven days
    role: normative
    status: modeled
    span:
      start: 340
      end: 439
  - claim_key: CLAIM-BB50FABD208405B7
    claim_text: A missing, stale, failed, malformed, mismatched, or future-dated proof receipt must not prove the requirement
    role: normative
    status: modeled
    span:
      start: 441
      end: 550
  - claim_key: CLAIM-BCCEE9616D8F0A33
    claim_text: Coverage and status must expose the deterministic current code snapshot through CLI and MCP
    role: normative
    status: modeled
    span:
      start: 552
      end: 643
  - claim_key: CLAIM-0C6463BA2B3AA64B
    claim_text: Durable test status remains structural metadata and cannot substitute for proof receipts
    role: normative
    status: modeled
    span:
      start: 645
      end: 733
  - claim_key: CLAIM-A0151FEC23EA1948
    claim_text: Receipt bindings must locate the test document and each symbol source file through a normalized repository-relative path
    role: normative
    status: modeled
    span:
      start: 735
      end: 855
logic_claims:
  - CLAIM-76ACF45E5EAD5F00
  - CLAIM-BCC4E6CCF9623500
  - CLAIM-A3834334B2DFAF17
  - CLAIM-BB50FABD208405B7
  - CLAIM-BCCEE9616D8F0A33
  - CLAIM-0C6463BA2B3AA64B
  - CLAIM-A0151FEC23EA1948
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok" Maintainer decision, 2026-11-11, approving the wording fixes of the second KB gold-standard review: "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T08:29:20.169Z'
priority: must
required_evidence: tested
tags:
  - requirements
  - proof
  - verification
  - receipts
  - snapshot-v2
  - e2e
id: REQ-kibi-proof-receipt-freshness
type: req
---
Proof-bearing tests must carry proof receipt execution history that kb_upsert and incremental sync never shorten, rewrite, or reorder. Each proof receipt must bind its test ID, typed verification scope, integration command, current code snapshot, canonical environment hash, execution fingerprint, timestamps, outcome, and artifact digest. The newest proof receipt for the current code snapshot must be passing and no older than seven days. A missing, stale, failed, malformed, mismatched, or future-dated proof receipt must not prove the requirement. Coverage and status must expose the deterministic current code snapshot through CLI and MCP. Durable test status remains structural metadata and cannot substitute for proof receipts. Receipt bindings must locate the test document and each symbol source file through a normalized repository-relative path.

## Context

Kibi validates each proof receipt of an E2E test against exactly what ran, against which code, and when, so proof follows the code and lapses as soon as the code moves or the receipt ages out.

Receipts are the only evidence that a test really passed against the current code, so a stale, rewritten or misattributed receipt would let a requirement look tested when it is not.

## Why this changed

Split from REQ-kibi-fresh-verification-receipts-v2, which held three behaviors: what a receipt binds and when it is fresh enough to prove, how ingest and kibi proof compact shorten receipt history, and how a command run's outcome is attributed to each test. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
