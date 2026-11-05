---
title: kibi report writes to a chosen file or directory and opens it only after a successful write
status: open
semantic_text: The output option must accept an HTML file or directory and default to kibi-report/index.html. The open option must launch the generated file in the default browser only after a successful write.
semantic_clauses:
  - The output option must accept an HTML file or directory and default to kibi-report/index.html.
  - The open option must launch the generated file in the default browser only after a successful write.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: f4e685608247d9b9036f4d6bd78ee9a36592f1088f52c5bbacaf2efe34ae965e
semantic_inventory:
  - claim_key: CLAIM-0611D9341478B890
    claim_text: The output option must accept an HTML file or directory and default to kibi-report/index.html
    role: normative
    status: modeled
    span:
      start: 0
      end: 93
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-31FEA3FB7DDEB58C
    claim_text: The open option must launch the generated file in the default browser only after a successful write
    role: normative
    status: modeled
    span:
      start: 95
      end: 194
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-0611D9341478B890
  - CLAIM-31FEA3FB7DDEB58C
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 3): "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-05T06:48:25.562Z'
priority: must
firmness: default
required_evidence: tested
tags:
  - cli
  - report
  - html
  - coverage
  - proof
  - ci
  - review:context-missing
id: REQ-kibi-health-report-output
type: req
---
The output option must accept an HTML file or directory and default to kibi-report/index.html. The open option must launch the generated file in the default browser only after a successful write.

## Context

Opening the browser before the write lands would show a stale or missing page.



## Why this changed

Split from REQ-kibi-html-health-report, which held three behaviors: building the report from complete data, what the report shows, and where it is written and opened. Each child is one of them.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 3): "Ok"
