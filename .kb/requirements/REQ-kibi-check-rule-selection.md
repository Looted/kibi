---
title: A plain kibi check runs canonical and advisory rules, never lets repository config disable a canonical rule, and fails only on canonical findings
status: open
semantic_text: A plain kibi check must run the canonical and advisory rules and skip migration rules. Repository configuration must not disable a canonical check rule. kibi check must report advisory and migration rule findings as non-blocking quality diagnostics and fail only on canonical rule findings.
semantic_clauses:
  - A plain kibi check must run the canonical and advisory rules and skip migration rules
  - Repository configuration must not disable a canonical check rule
  - kibi check must report advisory and migration rule findings as non-blocking quality diagnostics and fail only on canonical rule findings
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 667379f311151ad54b773c8a5e31c33916feeab866374a18c9e62f763be0a746
semantic_inventory:
  - claim_key: CLAIM-168F00C51DF5F43E
    claim_text: A plain kibi check must run the canonical and advisory rules and skip migration rules
    role: normative
    status: modeled
    span:
      start: 0
      end: 85
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-5375EAF387185F2E
    claim_text: Repository configuration must not disable a canonical check rule
    role: normative
    status: modeled
    span:
      start: 87
      end: 151
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-12B95C2196450B63
    claim_text: kibi check must report advisory and migration rule findings as non-blocking quality diagnostics and fail only on canonical rule findings
    role: normative
    status: modeled
    span:
      start: 153
      end: 289
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-168F00C51DF5F43E
  - CLAIM-5375EAF387185F2E
  - CLAIM-12B95C2196450B63
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the new-sentence children of the single-surface requirements in the KB gold-standard review (split batch 5): "ok"; sentence 3 as reworded, 2026-11-10: "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T14:52:24.818Z'
firmness: firm
required_evidence: tested
priority: must
tags:
  - check
  - rules
id: REQ-kibi-check-rule-selection
type: req
---
A plain kibi check must run the canonical and advisory rules and skip migration rules. Repository configuration must not disable a canonical check rule. kibi check must report advisory and migration rule findings as non-blocking quality diagnostics and fail only on canonical rule findings.

## Context

Kibi, not the repository, owns each rule's enforcement class. Canonical rules are correctness checks that gate health; advisory rules guide agents; migration rules such as strict-readiness and semantic-completeness describe how far a legacy KB is from the current model and run only when named with --rules. A legacy .kb/config.json that tries to switch a rule off is ignored, so a project cannot silence a correctness check by configuration.

Carved out of REQ-cli-check, which keeps what kibi check runs and reports; this child names which rules a check runs and which findings fail it.

## Source

> Maintainer decision, 2026-11-05, approving the new-sentence children of the single-surface requirements in the KB gold-standard review (split batch 5): "ok"; sentence 3 as reworded, 2026-11-10: "Ok"
