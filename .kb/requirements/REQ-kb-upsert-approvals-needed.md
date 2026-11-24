---
title: A requirement write lists what only the person can settle
status: open
priority: must
firmness: default
required_evidence: tested
tags:
  - kb_upsert
  - decision-capture
  - approvals
origin:
  kind: agent
  ref: 'Maintainer approval of the benchmark-driven capture, lookup and hook fixes, statement 3 of 8: ''Approve all''.'
  approved_by: maintainer
  recorded_at: '2026-11-24T20:00:12.798Z'
rationale: In the crowded-store benchmark the agent asked the person one question per check result; listing every decision the person must make lets the agent ask once.
semantic_text: 'A requirement write''s result must list under approvalsNeeded every decision only the person can settle before the requirement reaches its evidence floor: the statement signoff, each firm pair review''s approved_by, a new proof integration file, and a failure-side waiver as the alternative to the failure scenario.'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ce32b448a433e092a129b3b89e0054422324d36f720b729b1f3a30997f9327fe
semantic_inventory:
  - claim_key: CLAIM-C0E1CB332181CB94
    claim_text: 'A requirement write''s result must list under approvalsNeeded every decision only the person can settle before the requirement reaches its evidence floor: the statement signoff, each firm pair review''s approved_by, a new proof integration file, and a failure-side waiver as the alternative to the failure scenario'
    role: normative
    status: modeled
    span:
      start: 0
      end: 312
    subjects:
      - mcp.kb_upsert
logic_claims:
  - CLAIM-C0E1CB332181CB94
id: REQ-kb-upsert-approvals-needed
type: req
---
A requirement write's result must list under approvalsNeeded every decision only the person can settle before the requirement reaches its evidence floor: the statement signoff, each firm pair review's approved_by, a new proof integration file, and a failure-side waiver as the alternative to the failure scenario.

## Context

In the crowded-store benchmark the agent asked the person one question per check result; listing every decision the person must make lets the agent ask once.

## Source

> Maintainer approval of the benchmark-driven capture, lookup and hook fixes, statement 3 of 8: 'Approve all'.
