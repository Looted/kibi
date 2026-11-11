---
title: Proof contract vocabulary
status: open
semantic_text: A proof success policy shall be all_required_first_attempt or own_results_first_attempt. A proof binding kind shall be native_case or aggregate_run.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 1013d9bbe900c6d8993316764efc9ec5019d0bd5b9ca2bfcf5f4f7813d767897
semantic_inventory:
  - claim_key: CLAIM-60D2AD30E0E5B204
    claim_text: A proof success policy shall be all_required_first_attempt or own_results_first_attempt
    role: normative
    status: modeled
    span:
      start: 0
      end: 87
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-3A5E7E22374EF666
    claim_text: A proof binding kind shall be native_case or aggregate_run
    role: normative
    status: modeled
    span:
      start: 89
      end: 147
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-60D2AD30E0E5B204
  - CLAIM-3A5E7E22374EF666
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 1): "Agree to all."'
  approved_by: maintainer
  recorded_at: '2026-11-04T14:49:57.145Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - proof
id: REQ-kibi-proof-contract-vocabulary
type: req
---
A proof success policy shall be all_required_first_attempt or own_results_first_attempt. A proof binding kind shall be native_case or aggregate_run.

## Context

packages/cli/src/public/proof-protocol.ts closes the success policies and binding kinds a test's proof contract may declare.

Kibi records proof runs as receipts. packages/cli/src/public/proof-protocol.ts closes the lists a run reports with, packages/cli/src/proof/integrations.ts names the producers and where runs and integrations live, and the receipt and coverage report are bounded. They are stated here so every value is proved against its constant.

## Why this changed

Split from REQ-kibi-proof-run-vocabulary, which held ten closed values from four modules. Each child is one vocabulary that one module declares, so a requirement names the code that owns it.

## Source

> Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 1): "Agree to all."
