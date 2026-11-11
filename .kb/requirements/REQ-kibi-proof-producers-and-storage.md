---
title: Proof producers and where proof runs are stored
status: open
semantic_text: A proof producer shall be command, playwright, junit or tap. The proof integrations file shall be .kb/proof/integrations.json. Proof runs shall be stored under .kb/proof/runs.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 7535da20363635dbaf774b72fc8e49ad1b5d09b001d969efd89eea7c6b7f250e
semantic_inventory:
  - claim_key: CLAIM-5FD532ADAFB84B98
    claim_text: A proof producer shall be command, playwright, junit or tap
    role: normative
    status: modeled
    span:
      start: 0
      end: 59
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-2BAB7735C9EF0E1A
    claim_text: The proof integrations file shall be .kb/proof/integrations.json
    role: normative
    status: modeled
    span:
      start: 61
      end: 125
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-0432EB217242A518
    claim_text: Proof runs shall be stored under .kb/proof/runs
    role: normative
    status: modeled
    span:
      start: 127
      end: 174
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-5FD532ADAFB84B98
  - CLAIM-2BAB7735C9EF0E1A
  - CLAIM-0432EB217242A518
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 1): "Agree to all."'
  approved_by: maintainer
  recorded_at: '2026-11-04T14:50:20.191Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - proof
id: REQ-kibi-proof-producers-and-storage
type: req
---
A proof producer shall be command, playwright, junit or tap. The proof integrations file shall be .kb/proof/integrations.json. Proof runs shall be stored under .kb/proof/runs.

## Context

packages/cli/src/proof/integrations.ts names the producers a proof integration may use and where integrations and runs live.

Kibi records proof runs as receipts. packages/cli/src/public/proof-protocol.ts closes the lists a run reports with, packages/cli/src/proof/integrations.ts names the producers and where runs and integrations live, and the receipt and coverage report are bounded. They are stated here so every value is proved against its constant.

## Why this changed

Split from REQ-kibi-proof-run-vocabulary, which held ten closed values from four modules. Each child is one vocabulary that one module declares, so a requirement names the code that owns it.

## Source

> Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 1): "Agree to all."
