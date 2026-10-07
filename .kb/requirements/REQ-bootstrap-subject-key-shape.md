---
title: Bootstrap plans generate conventional subject keys and carry stated rationale
status: open
priority: must
tags:
  - bootstrap
  - modeling
  - subject-keys
semantic_text: Bootstrap planning must generate subject keys in the component aspect shape. Bootstrap planning must report an intent claim whose subject names no component instead of writing a malformed subject key. Bootstrap planning must carry a declared claim rationale onto the planned requirement.
semantic_clauses:
  - Bootstrap planning must generate subject keys in the component aspect shape.
  - Bootstrap planning must report an intent claim whose subject names no component instead of writing a malformed subject key.
  - Bootstrap planning must carry a declared claim rationale onto the planned requirement.
logic_claims:
  - CLAIM-1A922B54DBA2C3A8
  - CLAIM-CFB9362C9653280F
  - CLAIM-0DE494E27AD0339A
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 9ee6f5aa803cdfa2ae4745c69a34a5827d8b11ad527bc801c65f7a0ab43eb35c
semantic_inventory:
  - claim_key: CLAIM-1A922B54DBA2C3A8
    claim_text: Bootstrap planning must generate subject keys in the component aspect shape
    role: normative
    status: modeled
    span:
      start: 0
      end: 75
  - claim_key: CLAIM-CFB9362C9653280F
    claim_text: Bootstrap planning must report an intent claim whose subject names no component instead of writing a malformed subject key
    role: normative
    status: modeled
    span:
      start: 77
      end: 199
  - claim_key: CLAIM-0DE494E27AD0339A
    claim_text: Bootstrap planning must carry a declared claim rationale onto the planned requirement
    role: normative
    status: modeled
    span:
      start: 201
      end: 286
origin:
  kind: agent
  recorded_at: '2026-10-07T19:01:48.450Z'
id: REQ-bootstrap-subject-key-shape
type: req
---
Bootstrap planning must generate subject keys in the component aspect shape. Bootstrap planning must report an intent claim whose subject names no component instead of writing a malformed subject key. Bootstrap planning must carry a declared claim rationale onto the planned requirement.

## Context

Right after a bootstrap apply, `kb_check` reported `subject-key-shape` on every bootstrapped requirement (95 of 95 in one evaluation) because the plan wrote subject keys such as `beginning_to_record_while_idle` with no component segment, and `requirement-rationale-missing` on requirements whose sources gave no reason. Kibi's own output should pass Kibi's quality rules: the plan takes the component from the claim or its knowledge source and the aspect from the claim's subject, reports a claim it cannot place instead of writing a malformed key, and carries a rationale when the source or the human states one.

## Source

Onboarding evaluation round 5 analysis (2026-10-07), finding K6: an external agent onboarded a test project with Kibi 2.9.0 and kibi-mcp 3.4.0.
