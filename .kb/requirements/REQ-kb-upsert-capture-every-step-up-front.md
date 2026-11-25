---
title: A requirement write lists every later kb_check step up front
status: open
priority: must
firmness: default
required_evidence: tested
tags:
  - kb_upsert
  - next-actions
  - decision-capture
origin:
  kind: agent
  ref: 'Maintainer approval of the benchmark-driven capture, lookup and hook fixes, statement 1 of 8: ''Approve all''.'
  approved_by: maintainer
  recorded_at: '2026-11-24T20:00:07.411Z'
rationale: 'In the crowded-store benchmark, long Kibi sessions ran as a staircase: after each fix kb_check reported the next gap (pair review, evidence floor, happy path only), and each one became another question to the person.'
semantic_text: When kb_upsert or kb_record writes a requirement below its evidence floor, its nextActions must also include a pair-review step for each current requirement on its claims' subjects, a kb_model step for its unmodeled claims, and a failure-side scenario that the same test validates.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d8fda0334bd1cc539a2ae53771185ced2873adc0de706fd3492f870bae8ba368
semantic_inventory:
  - claim_key: CLAIM-0FAE8DE1666484D6
    claim_text: When kb_upsert or kb_record writes a requirement below its evidence floor, its nextActions must also include a pair-review step for each current requirement on its claims' subjects, a kb_model step for its unmodeled claims, and a failure-side scenario that the same test validates
    role: condition
    status: modeled
    span:
      start: 0
      end: 280
    subjects:
      - mcp.kb_upsert
logic_claims:
  - CLAIM-0FAE8DE1666484D6
id: REQ-kb-upsert-capture-every-step-up-front
type: req
---
When kb_upsert or kb_record writes a requirement below its evidence floor, its nextActions must also include a pair-review step for each current requirement on its claims' subjects, a kb_model step for its unmodeled claims, and a failure-side scenario that the same test validates.

## Context

In the crowded-store benchmark, long Kibi sessions ran as a staircase: after each fix kb_check reported the next gap (pair review, evidence floor, happy path only), and each one became another question to the person.

## Source

> Maintainer approval of the benchmark-driven capture, lookup and hook fixes, statement 1 of 8: 'Approve all'.
