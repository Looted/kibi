---
title: Proof receipt and coverage page limits
status: open
semantic_text: Kibi shall keep at most 50 proof receipts per test. Kibi shall read coverage rows in pages of at most 10 rows.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 1d55a6b32122dcd3f543846ff669e0fcd6999a2a01c5c734ff1e7e946c513a26
semantic_inventory:
  - claim_key: CLAIM-B299410215E2FC50
    claim_text: Kibi shall keep at most 50 proof receipts per test
    role: normative
    status: modeled
    span:
      start: 0
      end: 50
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-159D396F3EE48E0B
    claim_text: Kibi shall read coverage rows in pages of at most 10 rows
    role: normative
    status: modeled
    span:
      start: 52
      end: 109
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-B299410215E2FC50
  - CLAIM-159D396F3EE48E0B
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 1): "Agree to all."'
  approved_by: maintainer
  recorded_at: '2026-11-04T14:50:52.121Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - proof
id: REQ-kibi-proof-retention-limits
type: req
---
Kibi shall keep at most 50 proof receipts per test. Kibi shall read coverage rows in pages of at most 10 rows.

## Context

The receipt history of each test and the coverage report's row pages are bounded so a long-lived KB stays fast to read.

Kibi records proof runs as receipts. packages/cli/src/public/proof-protocol.ts closes the lists a run reports with, packages/cli/src/proof/integrations.ts names the producers and where runs and integrations live, and the receipt and coverage report are bounded. They are stated here so every value is proved against its constant.

## Why this changed

Split from REQ-kibi-proof-run-vocabulary, which held ten closed values from four modules. Each child is one vocabulary that one module declares, so a requirement names the code that owns it.

## Source

> Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 1): "Agree to all."
