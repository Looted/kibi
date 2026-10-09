---
title: Built-in predicates name UI patterns, shared variants, pattern markers and containers
status: open
priority: must
tags:
  - predicates
  - ui
  - modeling
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-09: UI design plugin'
  recorded_at: '2026-10-09T12:13:23.515Z'
rationale: Agents need a shared vocabulary for which visual pattern a UI concept uses, so a rewrite to a different pattern becomes a checkable claim instead of prose.
semantic_text: The built-in predicate catalog must offer the ui_pattern, same_pattern, pattern_marker and ui_container schemas. Predicate suggestions must route UI pattern prose to the UI predicates instead of coding standard rules.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: dc0d5d73b0fff35ae1ba1c0927740d8917a3b0315b54bc1dea568c25a8808298
semantic_inventory:
  - claim_key: CLAIM-41E11E10F6D50D64
    claim_text: The built-in predicate catalog must offer the ui_pattern, same_pattern, pattern_marker and ui_container schemas
    role: normative
    status: modeled
    span:
      start: 0
      end: 111
  - claim_key: CLAIM-F05A72F2A40AD831
    claim_text: Predicate suggestions must route UI pattern prose to the UI predicates instead of coding standard rules
    role: normative
    status: modeled
    span:
      start: 113
      end: 216
semantic_clauses:
  - The built-in predicate catalog must offer the ui_pattern, same_pattern, pattern_marker and ui_container schemas.
  - Predicate suggestions must route UI pattern prose to the UI predicates instead of coding standard rules.
logic_claims:
  - CLAIM-41E11E10F6D50D64
  - CLAIM-F05A72F2A40AD831
id: REQ-ui-pattern-vocabulary
type: req
---
The built-in predicate catalog must offer the ui_pattern, same_pattern, pattern_marker and ui_container schemas. Predicate suggestions must route UI pattern prose to the UI predicates instead of coding standard rules.

## Context

In a test project an agent redid one role's view of a screen as cards while the agreed design for both roles was a line-and-dots timeline, and nothing in the knowledge base could say so. The project owner wanted those patterns written down so drift becomes visible. The design keeps the vocabulary in the built-in catalog rather than in the plugin, because kb_check and the proof ladder only see built-in schemas; ui_container covers layout shells such as a half-page panel with a scrollbar.

## Source

> Agent uses whole different pattern than the established, e.g. recent case when [in a test project] it used card design for the timeline, where the agreed upon was a line with dots for moments.

Project owner, project thread on the UI design plugin, 2026-10-09.
