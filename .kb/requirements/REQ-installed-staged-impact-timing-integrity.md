---
title: Installed staged-impact measurements remain bounded and fail closed
status: open
text_ref: docs/benchmarks/installed-staged-impact.md
tags:
  - multilingual
  - benchmark
  - timing-integrity
  - lane:strict
semantic_text: The installed staged-impact benchmark must record bounded timing and cache observations without weakening failures or claiming unavailable evidence.
logic_claims:
  - CLAIM-6C792A2AEEBB048C
semantic_clauses:
  - The installed staged-impact benchmark must record bounded timing and cache observations without weakening failures or claiming unavailable evidence.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 8a3287c60f64a030585e17ae17a3a524c6fb1c60bf66f736f521a8998c4cad41
semantic_inventory:
  - claim_key: CLAIM-6C792A2AEEBB048C
    claim_text: The installed staged-impact benchmark must record bounded timing and cache observations without weakening failures or claiming unavailable evidence
    role: normative
    status: modeled
    span:
      start: 0
      end: 147
id: REQ-installed-staged-impact-timing-integrity
type: req
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Firmness relabelled to default until reviewed. Maintainer decision, 2026-11-03, approving the requirements audit fixes (exact bundled skill sets, the kibi-provable-code skill requirement, requirement body cleanup, firmness relabelling and neutral origin references): "Yes, do both suggested." Maintainer decision, 2026-11-10, approving the entity context recovered from history in the KB gold-standard review (context batch 3): "Agree with batch 3 as well."'
  recorded_at: '2026-10-04T01:17:15.284Z'
firmness: default
required_evidence: tested
---
The installed staged-impact benchmark must record bounded timing and cache observations without weakening failures or claiming unavailable evidence.

## Why
Operators need to see where staged-review time goes in an installed Kibi. Timings are opt-in and carry no goals, source text or paths, and they never enter result schemas, so measuring can't leak code or change results. Measurement also must not weaken a failure. Source: PR 284 "Opt-in timing observations".
