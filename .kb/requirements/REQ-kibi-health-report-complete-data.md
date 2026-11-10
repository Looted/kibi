---
title: The HTML health report is built only from complete requirement and symbol coverage data
status: open
semantic_text: The Kibi CLI must generate a self-contained HTML requirement-health report from complete requirement and symbol coverage data. Report generation must fail when pagination would make requirement-level health metrics incomplete.
semantic_clauses:
  - The Kibi CLI must generate a self-contained HTML requirement-health report from complete requirement and symbol coverage data.
  - Report generation must fail when pagination would make requirement-level health metrics incomplete.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: acf819d9bb4c92cfdf1fa42ab032fdedb61ed34f737709a778dad30e2a3fcbb2
semantic_inventory:
  - claim_key: CLAIM-C6E61A5288CDB088
    claim_text: The Kibi CLI must generate a self-contained HTML requirement-health report from complete requirement and symbol coverage data
    role: normative
    status: modeled
    span:
      start: 0
      end: 125
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-8F61569C04F4BEF8
    claim_text: Report generation must fail when pagination would make requirement-level health metrics incomplete
    role: normative
    status: modeled
    span:
      start: 127
      end: 225
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-C6E61A5288CDB088
  - CLAIM-8F61569C04F4BEF8
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 3): "Ok"'
  approved_by: maintainer
  recorded_at: '2026-11-05T06:46:36.112Z'
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
id: REQ-kibi-health-report-complete-data
type: req
---
The Kibi CLI must generate a self-contained HTML requirement-health report from complete requirement and symbol coverage data. Report generation must fail when pagination would make requirement-level health metrics incomplete.

## Context

A health percentage computed from one page of coverage rows would misstate the project, so the report refuses partial data.



## Why this changed

Split from REQ-kibi-html-health-report, which held three behaviors: building the report from complete data, what the report shows, and where it is written and opened. Each child is one of them.

## Source

> Maintainer decision, 2026-11-05, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 3): "Ok"
