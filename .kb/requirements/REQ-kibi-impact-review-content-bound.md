---
title: Impact review evidence is bound to the exact reviewed content and invalidated when it changes
status: open
semantic_text: Kibi must bind impact review evidence to the complete immutable Git change inventory, exact before and after source bytes, authored knowledge fingerprints, source analyzer provenance and trusted target policy. Kibi must require an updated or still-current knowledge decision with a written explanation for every affected requirement. Kibi must accept no-impact decisions only for permitted reasons covering the complete file and residual ranges. Kibi must require explicit review of every permitted after-side partial-analysis limitation range that overlaps a changed line. Kibi must accept unsupported source analysis only with explicit whole-file review permitted by trusted policy. Kibi must reject impact review for after-side syntax errors and failed after-side source analyzers. Kibi must invalidate review evidence when source bytes, Git index, HEAD, policy, provider or evaluator changes. Kibi must preserve source bytes, the Git index and HEAD when rejecting invalid review evidence. Kibi must label impact review author identity as self-claimed unless a separate authenticated authority is provided.
semantic_clauses:
  - Kibi must bind impact review evidence to the complete immutable Git change inventory, exact before and after source bytes, authored knowledge fingerprints, source analyzer provenance and trusted target policy
  - Kibi must require an updated or still-current knowledge decision with a written explanation for every affected requirement
  - Kibi must accept no-impact decisions only for permitted reasons covering the complete file and residual ranges
  - Kibi must require explicit review of every permitted after-side partial-analysis limitation range that overlaps a changed line
  - Kibi must accept unsupported source analysis only with explicit whole-file review permitted by trusted policy
  - Kibi must reject impact review for after-side syntax errors and failed after-side source analyzers
  - Kibi must invalidate review evidence when source bytes, Git index, HEAD, policy, provider or evaluator changes
  - Kibi must preserve source bytes, the Git index and HEAD when rejecting invalid review evidence
  - Kibi must label impact review author identity as self-claimed unless a separate authenticated authority is provided
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: c515095630810eb29a27fe290eb8921e6ef861795761630e3e0d9f3c80ef5528
semantic_inventory:
  - claim_key: CLAIM-43E7502CC01143B9
    claim_text: Kibi must bind impact review evidence to the complete immutable Git change inventory, exact before and after source bytes, authored knowledge fingerprints, source analyzer provenance and trusted target policy
    role: normative
    status: modeled
    span:
      start: 0
      end: 208
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-95B622628DF93B07
    claim_text: Kibi must require an updated or still-current knowledge decision with a written explanation for every affected requirement
    role: normative
    status: modeled
    span:
      start: 210
      end: 332
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-871721A2555885B9
    claim_text: Kibi must accept no-impact decisions only for permitted reasons covering the complete file and residual ranges
    role: normative
    status: modeled
    span:
      start: 334
      end: 444
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-3DC4E54394289A04
    claim_text: Kibi must require explicit review of every permitted after-side partial-analysis limitation range that overlaps a changed line
    role: normative
    status: modeled
    span:
      start: 446
      end: 572
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-8705A8806E2038ED
    claim_text: Kibi must accept unsupported source analysis only with explicit whole-file review permitted by trusted policy
    role: normative
    status: modeled
    span:
      start: 574
      end: 683
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-7F35CFCC9C4CD183
    claim_text: Kibi must reject impact review for after-side syntax errors and failed after-side source analyzers
    role: normative
    status: modeled
    span:
      start: 685
      end: 783
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-BFC6D501B2221523
    claim_text: Kibi must invalidate review evidence when source bytes, Git index, HEAD, policy, provider or evaluator changes
    role: normative
    status: modeled
    span:
      start: 785
      end: 895
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-3A4340EBE891D8D0
    claim_text: Kibi must preserve source bytes, the Git index and HEAD when rejecting invalid review evidence
    role: normative
    status: modeled
    span:
      start: 897
      end: 991
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-1FAF2CA08169368C
    claim_text: Kibi must label impact review author identity as self-claimed unless a separate authenticated authority is provided
    role: exception
    status: modeled
    span:
      start: 993
      end: 1108
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-43E7502CC01143B9
  - CLAIM-95B622628DF93B07
  - CLAIM-871721A2555885B9
  - CLAIM-3DC4E54394289A04
  - CLAIM-8705A8806E2038ED
  - CLAIM-7F35CFCC9C4CD183
  - CLAIM-BFC6D501B2221523
  - CLAIM-3A4340EBE891D8D0
  - CLAIM-1FAF2CA08169368C
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T07:59:41.477Z'
tags:
  - multilingual
  - impact-policy
  - stage-e
  - content-bound-review
firmness: firm
id: REQ-kibi-impact-review-content-bound
type: req
---
Kibi must bind impact review evidence to the complete immutable Git change inventory, exact before and after source bytes, authored knowledge fingerprints, source analyzer provenance and trusted target policy. Kibi must require an updated or still-current knowledge decision with a written explanation for every affected requirement. Kibi must accept no-impact decisions only for permitted reasons covering the complete file and residual ranges. Kibi must require explicit review of every permitted after-side partial-analysis limitation range that overlaps a changed line. Kibi must accept unsupported source analysis only with explicit whole-file review permitted by trusted policy. Kibi must reject impact review for after-side syntax errors and failed after-side source analyzers. Kibi must invalidate review evidence when source bytes, Git index, HEAD, policy, provider or evaluator changes. Kibi must preserve source bytes, the Git index and HEAD when rejecting invalid review evidence. Kibi must label impact review author identity as self-claimed unless a separate authenticated authority is provided.

## Context

A review record names the exact bytes, knowledge and analyzer it judged, so any later change to them makes the record stale instead of silently carrying it over.

Impact review is how a change proves it considered every affected requirement, so evidence that drifts from the reviewed bytes, a gate that trusts the candidate, or a policy that switches itself on would each let unreviewed changes through.

## Why this changed

Split from REQ-impact-policy-stage-e-content-bound-review, which held three behaviors: review evidence bound to exact content, the trusted aggregate pull request gate, and receipt, advisory and opt-in handling around them. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
