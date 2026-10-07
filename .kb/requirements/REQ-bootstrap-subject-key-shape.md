---
title: Bootstrap plans name claims component-first and carry stated rationale
status: open
priority: must
tags:
  - bootstrap
  - modeling
  - naming
semantic_text: Bootstrap planning must name each planned claim as a dotted component and aspect pair. Bootstrap planning must report an intent claim it cannot place under a component instead of planning it. Bootstrap planning must carry a declared claim rationale onto the planned requirement.
semantic_clauses:
  - Bootstrap planning must name each planned claim as a dotted component and aspect pair.
  - Bootstrap planning must report an intent claim it cannot place under a component instead of planning it.
  - Bootstrap planning must carry a declared claim rationale onto the planned requirement.
logic_claims:
  - CLAIM-100A008EF1D0B501
  - CLAIM-25BE94E1EFE8773C
  - CLAIM-0DE494E27AD0339A
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: a98589ed0a4ee3493732a87f2de0411db36bf58c6d0b1bfa476efbcdb01edad1
semantic_inventory:
  - claim_key: CLAIM-100A008EF1D0B501
    claim_text: Bootstrap planning must name each planned claim as a dotted component and aspect pair
    role: normative
    status: modeled
    span:
      start: 0
      end: 85
  - claim_key: CLAIM-25BE94E1EFE8773C
    claim_text: Bootstrap planning must report an intent claim it cannot place under a component instead of planning it
    role: normative
    status: modeled
    span:
      start: 87
      end: 190
  - claim_key: CLAIM-0DE494E27AD0339A
    claim_text: Bootstrap planning must carry a declared claim rationale onto the planned requirement
    role: normative
    status: modeled
    span:
      start: 192
      end: 277
origin:
  kind: agent
  recorded_at: '2026-10-07T19:01:48.450Z'
id: REQ-bootstrap-subject-key-shape
type: req
---
Bootstrap planning must name each planned claim as a dotted component and aspect pair. Bootstrap planning must report an intent claim it cannot place under a component instead of planning it. Bootstrap planning must carry a declared claim rationale onto the planned requirement.

## Context

Right after a bootstrap apply, `kb_check` reported `subject-key-shape` on every bootstrapped requirement (95 of 95 in one evaluation) because the plan named claims such as `beginning_to_record_while_idle` with no component segment, and `requirement-rationale-missing` on requirements whose sources gave no reason. Kibi's own output should pass Kibi's quality rules: the plan takes the component from the claim or its knowledge source and the aspect from the claim's subject, reports a claim it cannot place instead of writing a malformed name, and carries a rationale when the source or the human states one.

## Source

Onboarding evaluation round 5 analysis (2026-10-07), finding K6: an external agent onboarded a test project with Kibi 2.9.0 and kibi-mcp 3.4.0.
