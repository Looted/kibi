---
title: A command proof run fails only the tests that own a failing step, or the whole run without a usable report
status: open
semantic_text: When a command proof integration writes a complete per-test report, a failing step must fail only the tests that own it. A missing, malformed, or incomplete per-test report must keep the whole-run evaluation.
semantic_clauses:
  - When a command proof integration writes a complete per-test report, a failing step must fail only the tests that own it.
  - A missing, malformed, or incomplete per-test report must keep the whole-run evaluation.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 0fcbbba306f8be51b04712d8340cab52cffa754a6a61c83edddb77676bfbf5ee
semantic_inventory:
  - claim_key: CLAIM-B2A3EA0263B6780D
    claim_text: When a command proof integration writes a complete per-test report, a failing step must fail only the tests that own it
    role: condition
    status: modeled
    span:
      start: 0
      end: 119
    reason: Grounded by a verification_receipt_rule fact reviewed against the current code.
  - claim_key: CLAIM-78992ABE870528FE
    claim_text: A missing, malformed, or incomplete per-test report must keep the whole-run evaluation
    role: normative
    status: modeled
    span:
      start: 121
      end: 207
    reason: Grounded by a verification_receipt_rule fact reviewed against the current code.
logic_claims:
  - CLAIM-B2A3EA0263B6780D
  - CLAIM-78992ABE870528FE
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T08:30:53.466Z'
priority: must
required_evidence: tested
tags:
  - requirements
  - proof
  - verification
  - receipts
  - attribution
id: REQ-kibi-proof-per-test-attribution
type: req
---
When a command proof integration writes a complete per-test report, a failing step must fail only the tests that own it. A missing, malformed, or incomplete per-test report must keep the whole-run evaluation.

## Context

One shared integration process can run many tests, so a failure is charged to its owner only when a complete report says who that is, and to every test otherwise.

Receipts are the only evidence that a test really passed against the current code, so a stale, rewritten or misattributed receipt would let a requirement look tested when it is not.

## Why this changed

Split from REQ-kibi-fresh-verification-receipts-v2, which held three behaviors: what a receipt binds and when it is fresh enough to prove, how ingest and kibi proof compact shorten receipt history, and how a command run's outcome is attributed to each test. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
