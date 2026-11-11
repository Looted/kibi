---
title: Failed or whole-file after-side analysis gaps block a change; before-side gaps are informational
status: open
semantic_text: Failed analysis and non-local analysis gaps on the after side must block a change. Before-side analysis gaps must be informational only.
semantic_clauses:
  - Failed analysis and non-local analysis gaps on the after side must block a change
  - Before-side analysis gaps must be informational only
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: df2b670a98b9342c9f25e8ff2a07cf8d734e598e3306f0f7b69c4196613c53fe
semantic_inventory:
  - claim_key: CLAIM-C176A2A1F075665C
    claim_text: Failed analysis and non-local analysis gaps on the after side must block a change
    role: normative
    status: modeled
    span:
      start: 0
      end: 81
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-359764E86E322746
    claim_text: Before-side analysis gaps must be informational only
    role: normative
    status: modeled
    span:
      start: 83
      end: 135
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-C176A2A1F075665C
  - CLAIM-359764E86E322746
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the new-sentence children of the single-surface requirements in the KB gold-standard review (split batch 5): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T10:47:12.229Z'
firmness: firm
required_evidence: tested
priority: must
tags:
  - source-analysis
  - staged-check
  - impact-review
id: REQ-kibi-analysis-gate
type: req
---
Failed analysis and non-local analysis gaps on the after side must block a change. Before-side analysis gaps must be informational only.

## Context

The before side is history the author cannot fix, so its gaps never block or need review. On the after side, a failed analysis or a parser, syntax, timeout or integrity gap makes the whole parse unreliable and always blocks, while a local gap such as a decorator matters only where it overlaps the changed lines.

Carved out of REQ-source-analysis-v2, which keeps the source analysis v2 result contract (completeness status, UTF-16 ranges, authored identity); each child names one decision the staged and diff analysis makes around it.

## Source

> Maintainer decision, 2026-11-05, approving the new-sentence children of the single-surface requirements in the KB gold-standard review (split batch 5): "ok"
