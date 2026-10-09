---
title: Component tests prove scenarios grounded only in UI pattern predicates
status: open
priority: must
tags:
  - proof
  - ui
  - proof-ladder
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-09: UI design plugin'
  recorded_at: '2026-10-09T12:13:34.643Z'
rationale: A visual pattern is fully observable by rendering one component in isolation, so demanding a browser test for every pattern would make end-to-end suites heavy without adding evidence.
semantic_text: A scenario whose specifying requirements are grounded only in ui_pattern, same_pattern and pattern_marker predicates must accept unit and integration tests with fresh passing receipts as proof. Every other scenario must accept only end-to-end tests as proof.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 71d96d168f5574ec412c9ac147ca51c3c4c1450c88377de6d89ae1b8f6e854bf
semantic_inventory:
  - claim_key: CLAIM-48DD5A9E3BE8C4C1
    claim_text: A scenario whose specifying requirements are grounded only in ui_pattern, same_pattern and pattern_marker predicates must accept unit and integration tests with fresh passing receipts as proof
    role: normative
    status: modeled
    span:
      start: 0
      end: 192
  - claim_key: CLAIM-000ADB011443E23F
    claim_text: Every other scenario must accept only end-to-end tests as proof
    role: normative
    status: modeled
    span:
      start: 194
      end: 257
semantic_clauses:
  - A scenario whose specifying requirements are grounded only in ui_pattern, same_pattern and pattern_marker predicates must accept unit and integration tests with fresh passing receipts as proof.
  - Every other scenario must accept only end-to-end tests as proof.
logic_claims:
  - CLAIM-48DD5A9E3BE8C4C1
  - CLAIM-000ADB011443E23F
id: REQ-ui-pattern-component-proof
type: req
---
A scenario whose specifying requirements are grounded only in ui_pattern, same_pattern and pattern_marker predicates must accept unit and integration tests with fresh passing receipts as proof. Every other scenario must accept only end-to-end tests as proof.

## Context

The project owner did not want UI design enforcement to make end-to-end suites heavy, and clarified that what matters is testing one unit in isolation, not which test runner is used. The agreed rule keys component-scope proof on the built-in pattern vocabulary rather than on a plugin, because the proof ladder runs in Prolog and cannot read plugin data. Receipts, freshness, executable_for and covered_by still apply; adding ui_container, a strict property or a logic rule to the requirement brings back the end-to-end obligation.

## Source

> Now what I don't want is making E2E extremely heavy because of it.

> By units, I don't mean traditional unit test runners, which are just architecture. What I mean is specifically testing one unit in isolation.

Project owner, project thread on the UI design plugin, 2026-10-09.
