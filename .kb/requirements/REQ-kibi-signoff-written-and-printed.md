---
title: Kibi signoff writes JSON, Markdown and HTML views and prints unfenced Markdown by default
status: open
semantic_text: Kibi signoff must write its latest view as JSON, Markdown and a self-contained HTML page under .kb/briefs/signoff. Kibi signoff must print the view as unfenced Markdown by default, so that it renders in any chat window or messaging tool.
semantic_clauses:
  - Kibi signoff must write its latest view as JSON, Markdown and a self-contained HTML page under .kb/briefs/signoff
  - Kibi signoff must print the view as unfenced Markdown by default, so that it renders in any chat window or messaging tool
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 9c595972ab028267c43c630f07e471a1de44ab3e48a4193aafbd4b11b78a0f3d
semantic_inventory:
  - claim_key: CLAIM-5E9619C61E20EAAF
    claim_text: Kibi signoff must write its latest view as JSON, Markdown and a self-contained HTML page under .kb/briefs/signoff
    role: normative
    status: modeled
    span:
      start: 0
      end: 113
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-9866F122FBE889F5
    claim_text: Kibi signoff must print the view as unfenced Markdown by default, so that it renders in any chat window or messaging tool
    role: normative
    status: modeled
    span:
      start: 115
      end: 236
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-5E9619C61E20EAAF
  - CLAIM-9866F122FBE889F5
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"'
  approved_by: maintainer
  recorded_at: '2026-11-10T09:01:33.359Z'
priority: should
firmness: default
required_evidence: tested
tags:
  - cli
  - signoff
  - output
id: REQ-kibi-signoff-written-and-printed
type: req
---
Kibi signoff must write its latest view as JSON, Markdown and a self-contained HTML page under .kb/briefs/signoff. Kibi signoff must print the view as unfenced Markdown by default, so that it renders in any chat window or messaging tool.

## Context

The written files let any tool open the latest view, and plain Markdown on stdout renders in whatever chat or messaging window the person is using.

Signoff is where a person reads what a change does to the recorded requirements before agreeing, so the view must be complete, readable wherever it lands, and offered when requirements were written.

## Why this changed

Split from REQ-kibi-signoff-views, which held three behaviors: what the signoff view lists, where it is written and how it is printed, and how host integrations render it and ask for it. Each child is one of them, and only the functions that decide each behavior keep their implements links.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 4): "ok"
