---
title: Advisor and preflight evidence count only within the same session and actor
status: open
semantic_text: Correlation for advisor evidence must require matching session and actor identifiers when both records expose them. Correlation for preflight evidence must require matching session and actor identifiers when both records expose them.
semantic_clauses:
  - Correlation for advisor evidence must require matching session and actor identifiers when both records expose them.
  - Correlation for preflight evidence must require matching session and actor identifiers when both records expose them.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 7326d89e219c93dba7d606bc8898f2ee1c1299a2e74e6eb3cbce3fa552ae7eeb
semantic_inventory:
  - claim_key: CLAIM-F103B7734DDF4FD9
    claim_text: Correlation for advisor evidence must require matching session and actor identifiers when both records expose them
    role: normative
    status: modeled
    span:
      start: 0
      end: 114
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-A5586B623795B679
    claim_text: Correlation for preflight evidence must require matching session and actor identifiers when both records expose them
    role: normative
    status: modeled
    span:
      start: 116
      end: 232
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-F103B7734DDF4FD9
  - CLAIM-A5586B623795B679
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 3): "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-05T06:50:40.024Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - telemetry
  - diagnostics
  - remediation
  - correlation
  - cli
  - mcp
  - review:context-missing
id: REQ-kibi-telemetry-evidence-correlation
type: req
---
Correlation for advisor evidence must require matching session and actor identifiers when both records expose them. Correlation for preflight evidence must require matching session and actor identifiers when both records expose them.

## Context

Evidence from another session or actor must not satisfy a write.



## Why this changed

Split from REQ-kibi-telemetry-remediation-evidence, which held three behaviors: appending diagnostic usage records, correlating evidence by session and actor, and the remediation report. Each child is one of them.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 3): "Ok"
