---
title: Kibi signoff lists every changed or implemented requirement and numbers each decision with its quote
status: open
semantic_text: Kibi signoff must list each requirement a change adds, rewrites or retires and each current requirement the changed code implements, quoting its statement with its firmness and proof state. Kibi signoff with a questions file must number each decision and quote the recorded requirement it changes or conflicts with.
semantic_clauses:
  - Kibi signoff must list each requirement a change adds, rewrites or retires and each current requirement the changed code implements, quoting its statement with its firmness and proof state
  - Kibi signoff with a questions file must number each decision and quote the recorded requirement it changes or conflicts with
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: f6a01f90f6802d4caf2ce57468d3ae035c76b1f1402648dee7baa8603caeb9ab
semantic_inventory:
  - claim_key: CLAIM-AA496D7010BCE3DD
    claim_text: Kibi signoff must list each requirement a change adds, rewrites or retires and each current requirement the changed code implements, quoting its statement with its firmness and proof state
    role: normative
    status: modeled
    span:
      start: 0
      end: 188
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-B670D0ADBB0870D2
    claim_text: Kibi signoff with a questions file must number each decision and quote the recorded requirement it changes or conflicts with
    role: normative
    status: modeled
    span:
      start: 190
      end: 314
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-AA496D7010BCE3DD
  - CLAIM-B670D0ADBB0870D2
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T09:00:24.654Z'
priority: should
firmness: default
required_evidence: tested
tags:
  - cli
  - signoff
  - requirements
id: REQ-kibi-signoff-lists-requirements-and-decisions
type: req
---
Kibi signoff must list each requirement a change adds, rewrites or retires and each current requirement the changed code implements, quoting its statement with its firmness and proof state. Kibi signoff with a questions file must number each decision and quote the recorded requirement it changes or conflicts with.

## Context

Each row quotes the statement itself with its firmness and proof state, so a reader agrees to the words that will be recorded rather than to a summary of them.

Signoff is where a person reads what a change does to the recorded requirements before agreeing, so the view must be complete, readable wherever it lands, and offered when requirements were written.

## Why this changed

Split from REQ-kibi-signoff-views, which held three behaviors: what the signoff view lists, where it is written and how it is printed, and how host integrations render it and ask for it. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
