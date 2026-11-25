---
title: A whole-file read of a busy file names its requirement ids on one line
status: open
priority: must
firmness: default
required_evidence: tested
tags:
  - hooks
  - read-rows
origin:
  kind: agent
  ref: 'Maintainer approval of the read and search hook statements built on the Nov 25 cost analysis, statement 5 of 6: ''Approve all as worded''.'
  approved_by: maintainer
  recorded_at: '2026-11-25T14:29:23.936Z'
semantic_text: A whole-file read of a file that implements more than 5 requirements must name their ids on one line, without titles.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 032fee1976c53d7cd38fb003e5a0bf577db9b71357dd31c3e0f5db2da2e10788
semantic_inventory:
  - claim_key: CLAIM-3759C5E9D86989A3
    claim_text: A whole-file read of a file that implements more than 5 requirements must name their ids on one line, without titles
    role: normative
    status: modeled
    span:
      start: 0
      end: 116
    subjects:
      - kibi.host.read_rows
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-3759C5E9D86989A3
rationale: Rows for every requirement of a busy file would flood the agent, but showing nothing would hide which rules apply; one line of ids lets it narrow the view to the code it needs.
id: REQ-hook-busy-file-ids
type: req
---
A whole-file read of a file that implements more than 5 requirements must name their ids on one line, without titles.

## Context

Rows for every requirement of a busy file would flood the agent, but showing nothing would hide which rules apply; one line of ids lets it narrow the view to the code it needs.

## Source

> Maintainer approval of the read and search hook statements built on the Nov 25 cost analysis, statement 5 of 6: 'Approve all as worded'.
