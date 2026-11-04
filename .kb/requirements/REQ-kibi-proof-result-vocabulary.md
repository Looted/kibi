---
title: Proof run result vocabulary
status: open
semantic_text: A proof result outcome shall be passed, failed, timed_out, skipped, interrupted or errored. A proof run failure phase shall be setup, collection, execution, teardown or infrastructure. A proof run attempts status shall be complete or unavailable.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 98a0c2e0365042f390fd64ca982ddb1a0ff1939a6d6863205bb512a80775a0e1
semantic_inventory:
  - claim_key: CLAIM-D8E61F01CA133EFE
    claim_text: A proof result outcome shall be passed, failed, timed_out, skipped, interrupted or errored
    role: normative
    status: modeled
    span:
      start: 0
      end: 90
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-D6A80A6B786D845A
    claim_text: A proof run failure phase shall be setup, collection, execution, teardown or infrastructure
    role: normative
    status: modeled
    span:
      start: 92
      end: 183
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-90AD356D3D051F57
    claim_text: A proof run attempts status shall be complete or unavailable
    role: normative
    status: modeled
    span:
      start: 185
      end: 245
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-D8E61F01CA133EFE
  - CLAIM-D6A80A6B786D845A
  - CLAIM-90AD356D3D051F57
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 1): "Agree to all."'
  approved_by: maintainer
  recorded_at: '2026-11-04T14:49:25.720Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - proof
id: REQ-kibi-proof-result-vocabulary
type: req
---
A proof result outcome shall be passed, failed, timed_out, skipped, interrupted or errored. A proof run failure phase shall be setup, collection, execution, teardown or infrastructure. A proof run attempts status shall be complete or unavailable.

## Context

packages/cli/src/public/proof-protocol.ts closes the lists a proof run reports its results with.

REQ-kibi-fresh-verification-receipts records proof runs as receipts. packages/cli/src/public/proof-protocol.ts closes the lists a run reports with, packages/cli/src/proof/integrations.ts names the producers and where runs and integrations live, and the receipt and coverage report are bounded. They are stated here so every value is proved against its constant.

## Why this changed

Split from REQ-kibi-proof-run-vocabulary, which held ten closed values from four modules. Each child is one vocabulary that one module declares, so a requirement names the code that owns it.

## Source

> Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 1): "Agree to all."
