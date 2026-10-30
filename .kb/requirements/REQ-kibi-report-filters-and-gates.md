---
title: Health report filters and proof gates
status: open
priority: must
firmness: firm
semantic_text: A health report filter shall be all, proved, tested, attention, below_floor, pending_reproof, stale or contradiction. A health report proof gate shall be semantic, scenario, implementation, e2e, evidence or proved.
semantic_clauses:
  - A health report filter shall be all, proved, tested, attention, below_floor, pending_reproof, stale or contradiction.
  - A health report proof gate shall be semantic, scenario, implementation, e2e, evidence or proved.
tags:
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn''t have a UI, so it should be possible to proove more?"'
  approved_by: maintainer
  recorded_at: '2026-10-29T10:24:57.457Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 4339edad40f1d37fda920e642ce61a87b2b9c5ec076a3b95d446ed109756c167
semantic_inventory:
  - claim_key: CLAIM-9F74F3CE7D64FDC4
    claim_text: A health report filter shall be all, proved, tested, attention, below_floor, pending_reproof, stale or contradiction
    role: normative
    status: modeled
    span:
      start: 0
      end: 116
  - claim_key: CLAIM-792537721948631C
    claim_text: A health report proof gate shall be semantic, scenario, implementation, e2e, evidence or proved
    role: normative
    status: modeled
    span:
      start: 118
      end: 213
logic_claims:
  - CLAIM-9F74F3CE7D64FDC4
  - CLAIM-792537721948631C
id: REQ-kibi-report-filters-and-gates
type: req
---
A health report filter shall be all, proved, tested, attention, below_floor, pending_reproof, stale or contradiction. A health report proof gate shall be semantic, scenario, implementation, e2e, evidence or proved.

## Context

packages/cli/src/report/report-view.ts defines the filters and gates of the report REQ-kibi-html-health-report renders. Both sets are stated here so they are proved against the report view.

## Source

Maintainer decision, 2026-10-27, approving requirement rewrites and splits that let structural claims be proved: "Please work towards full proof." Restated 2026-10-28: "Can we do more than 7? Kibi doesn't have a UI, so it should be possible to proove more?"