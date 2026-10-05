---
title: Requirement proof uses fresh snapshot-bound proof receipts that ingest compacts and attributes per test
status: open
priority: must
tags:
  - requirements
  - proof
  - verification
  - receipts
  - e2e
  - parity
  - snapshot-v2
  - compaction
semantic_text: Proof-bearing tests must carry kibi.proof-receipt.v1 execution history that kb_upsert and incremental sync never shorten, rewrite, or reorder. Each proof receipt must bind its test ID, typed verification scope, integration command, current code snapshot, canonical environment hash, execution fingerprint, timestamps, outcome, and artifact digest. The newest proof receipt for the current code snapshot must be passing and no older than seven days. A missing, stale, failed, malformed, mismatched, or future-dated proof receipt must not prove the requirement. Coverage and status must expose the deterministic current code snapshot through CLI and MCP. Durable test status remains structural metadata and cannot substitute for proof receipts. Every proof ingest must compact receipt history to the newest receipt, the newest passing receipt, and the newest receipt per scope and contract hash for the current binding and for the live snapshot. Receipt compaction must keep the original receipts in their original order and refuse any result that is not an ordered subsequence. kibi proof compact must apply the same compaction policy to an existing store and rewrite only the proof_receipts frontmatter block. When a command proof integration writes a complete per-test report, a failing step must fail only the tests that own it. A missing, malformed, or incomplete per-test report must keep the whole-run evaluation. Receipt bindings must locate the test document and each symbol source file through a normalized repository-relative path.
semantic_clauses:
  - Proof-bearing tests must carry kibi.proof-receipt.v1 execution history that kb_upsert and incremental sync never shorten, rewrite, or reorder.
  - Each proof receipt must bind its test ID, typed verification scope, integration command, current code snapshot, canonical environment hash, execution fingerprint, timestamps, outcome, and artifact digest.
  - The newest proof receipt for the current code snapshot must be passing and no older than seven days.
  - A missing, stale, failed, malformed, mismatched, or future-dated proof receipt must not prove the requirement.
  - Coverage and status must expose the deterministic current code snapshot through CLI and MCP.
  - Durable test status remains structural metadata and cannot substitute for proof receipts.
  - Every proof ingest must compact receipt history to the newest receipt, the newest passing receipt, and the newest receipt per scope and contract hash for the current binding and for the live snapshot.
  - Receipt compaction must keep the original receipts in their original order and refuse any result that is not an ordered subsequence.
  - kibi proof compact must apply the same compaction policy to an existing store and rewrite only the proof_receipts frontmatter block.
  - When a command proof integration writes a complete per-test report, a failing step must fail only the tests that own it.
  - A missing, malformed, or incomplete per-test report must keep the whole-run evaluation.
  - Receipt bindings must locate the test document and each symbol source file through a normalized repository-relative path.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 0247196d37b0b2d46c330df6f0d8aeb9b17203068eaa6cf4e0d6c9cc2c7022da
semantic_inventory:
  - claim_key: CLAIM-F0E4D725D82887B3
    claim_text: Proof-bearing tests must carry kibi.proof-receipt.v1 execution history that kb_upsert and incremental sync never shorten, rewrite, or reorder
    role: normative
    span:
      start: 0
      end: 141
    status: modeled
    reason: Grounded by a verification_receipt_rule fact reviewed against the current code.
  - claim_key: CLAIM-BCC4E6CCF9623500
    claim_text: Each proof receipt must bind its test ID, typed verification scope, integration command, current code snapshot, canonical environment hash, execution fingerprint, timestamps, outcome, and artifact digest
    role: normative
    span:
      start: 143
      end: 346
    status: modeled
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-A3834334B2DFAF17
    claim_text: The newest proof receipt for the current code snapshot must be passing and no older than seven days
    role: normative
    span:
      start: 348
      end: 447
    status: modeled
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-BB50FABD208405B7
    claim_text: A missing, stale, failed, malformed, mismatched, or future-dated proof receipt must not prove the requirement
    role: normative
    span:
      start: 449
      end: 558
    status: modeled
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-BCCEE9616D8F0A33
    claim_text: Coverage and status must expose the deterministic current code snapshot through CLI and MCP
    role: normative
    span:
      start: 560
      end: 651
    status: modeled
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-0C6463BA2B3AA64B
    claim_text: Durable test status remains structural metadata and cannot substitute for proof receipts
    role: normative
    span:
      start: 653
      end: 741
    status: modeled
    reason: Grounded by the same fact that grounded this clause in the superseded requirement.
  - claim_key: CLAIM-EAC6FD7EE537498D
    claim_text: Every proof ingest must compact receipt history to the newest receipt, the newest passing receipt, and the newest receipt per scope and contract hash for the current binding and for the live snapshot
    role: normative
    span:
      start: 743
      end: 942
    status: modeled
    reason: Grounded by a verification_receipt_rule fact reviewed against the current code.
  - claim_key: CLAIM-C2C5945CEAEEED35
    claim_text: Receipt compaction must keep the original receipts in their original order and refuse any result that is not an ordered subsequence
    role: normative
    span:
      start: 944
      end: 1075
    status: modeled
    reason: Grounded by a verification_receipt_rule fact reviewed against the current code.
  - claim_key: CLAIM-7E650A33B4789F0E
    claim_text: kibi proof compact must apply the same compaction policy to an existing store and rewrite only the proof_receipts frontmatter block
    role: normative
    span:
      start: 1077
      end: 1208
    status: modeled
    reason: Grounded by a verification_receipt_rule fact reviewed against the current code.
  - claim_key: CLAIM-B2A3EA0263B6780D
    claim_text: When a command proof integration writes a complete per-test report, a failing step must fail only the tests that own it
    role: condition
    span:
      start: 1210
      end: 1329
    status: modeled
    reason: Grounded by a verification_receipt_rule fact reviewed against the current code.
  - claim_key: CLAIM-78992ABE870528FE
    claim_text: A missing, malformed, or incomplete per-test report must keep the whole-run evaluation
    role: normative
    span:
      start: 1331
      end: 1417
    status: modeled
    reason: Grounded by a verification_receipt_rule fact reviewed against the current code.
  - claim_key: CLAIM-A0151FEC23EA1948
    claim_text: Receipt bindings must locate the test document and each symbol source file through a normalized repository-relative path
    role: normative
    span:
      start: 1419
      end: 1539
    status: modeled
    reason: Grounded by a verification_receipt_rule fact reviewed against the current code.
logic_claims:
  - CLAIM-F0E4D725D82887B3
  - CLAIM-BCC4E6CCF9623500
  - CLAIM-A3834334B2DFAF17
  - CLAIM-BB50FABD208405B7
  - CLAIM-BCCEE9616D8F0A33
  - CLAIM-0C6463BA2B3AA64B
  - CLAIM-EAC6FD7EE537498D
  - CLAIM-C2C5945CEAEEED35
  - CLAIM-7E650A33B4789F0E
  - CLAIM-B2A3EA0263B6780D
  - CLAIM-78992ABE870528FE
  - CLAIM-A0151FEC23EA1948
origin:
  kind: agent
  recorded_at: '2026-10-04T02:16:29.860Z'
id: REQ-kibi-fresh-verification-receipts-v2
type: req
---
Proof-bearing tests must carry kibi.proof-receipt.v1 execution history that kb_upsert and incremental sync never shorten, rewrite, or reorder. Each proof receipt must bind its test ID, typed verification scope, integration command, current code snapshot, canonical environment hash, execution fingerprint, timestamps, outcome, and artifact digest. The newest proof receipt for the current code snapshot must be passing and no older than seven days. A missing, stale, failed, malformed, mismatched, or future-dated proof receipt must not prove the requirement. Coverage and status must expose the deterministic current code snapshot through CLI and MCP. Durable test status remains structural metadata and cannot substitute for proof receipts. Every proof ingest must compact receipt history to the newest receipt, the newest passing receipt, and the newest receipt per scope and contract hash for the current binding and for the live snapshot. Receipt compaction must keep the original receipts in their original order and refuse any result that is not an ordered subsequence. kibi proof compact must apply the same compaction policy to an existing store and rewrite only the proof_receipts frontmatter block. When a command proof integration writes a complete per-test report, a failing step must fail only the tests that own it. A missing, malformed, or incomplete per-test report must keep the whole-run evaluation. Receipt bindings must locate the test document and each symbol source file through a normalized repository-relative path.

## Rationale

Receipt histories grew with every `kibi prove` run (5208 receipts on this repository before compaction, 137 after, with every proof decision unchanged), one failing step in a shared `command` integration failed every test it ran, and CI and a local checkout of the same commit could disagree on freshness because bindings used absolute paths (changeset `proof-receipt-robustness`). The superseded requirement called the history append-only, which no longer holds for the engine: ingest and `kibi proof compact` now drop receipts that can no longer decide proof, while authors still cannot shorten, rewrite or reorder a history through `kb_upsert` or sync.
