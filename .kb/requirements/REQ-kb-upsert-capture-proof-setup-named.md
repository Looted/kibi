---
title: A requirement write names the missing proof setup
status: open
priority: must
firmness: default
required_evidence: tested
tags:
  - kb_upsert
  - next-actions
  - proof
origin:
  kind: agent
  ref: 'Maintainer approval of the benchmark-driven capture, lookup and hook fixes, statement 2 of 8: ''Approve all''.'
  approved_by: maintainer
  recorded_at: '2026-11-24T20:00:10.104Z'
rationale: In the crowded-store benchmark the test project had no proof integration, so kibi prove could not run and the agent learned it only after the scenario and test were written.
semantic_text: When the workspace has no .kb/proof/integrations.json, the nextActions of a requirement write below a tested or proved floor must include the kibi proof inspect step and name that file as a new tracked file the person approves.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: a512174057de1b9be56b8d49fbc8a8246a8126ea66c8f97619f70d139d51600b
semantic_inventory:
  - claim_key: CLAIM-843314B3F314A2CA
    claim_text: When the workspace has no .kb/proof/integrations.json, the nextActions of a requirement write below a tested or proved floor must include the kibi proof inspect step and name that file as a new tracked file the person approves
    role: condition
    status: modeled
    span:
      start: 0
      end: 226
    subjects:
      - mcp.kb_upsert
logic_claims:
  - CLAIM-843314B3F314A2CA
id: REQ-kb-upsert-capture-proof-setup-named
type: req
---
When the workspace has no .kb/proof/integrations.json, the nextActions of a requirement write below a tested or proved floor must include the kibi proof inspect step and name that file as a new tracked file the person approves.

## Context

In the crowded-store benchmark the test project had no proof integration, so kibi prove could not run and the agent learned it only after the scenario and test were written.

## Source

> Maintainer approval of the benchmark-driven capture, lookup and hook fixes, statement 2 of 8: 'Approve all'.
