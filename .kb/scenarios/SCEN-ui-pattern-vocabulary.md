---
title: UI design prose is suggested the UI pattern predicates
status: active
tags:
  - predicates
  - ui
  - modeling
priority: must
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-09: UI design plugin'
  recorded_at: '2026-10-09T12:13:22.309Z'
id: SCEN-ui-pattern-vocabulary
type: scenario
---
Given the built-in predicate catalog, when an agent asks kb_model for predicates, then ui_pattern(subject, pattern), same_pattern(subject, variant, other_variant), pattern_marker(subject, marker) and ui_container(subject, size, overflow) are available, a sentence saying a concept is displayed as a named pattern ranks ui_pattern first, a sentence saying two views must use the same pattern ranks same_pattern first, a marker class sentence ranks pattern_marker first and a half-page scrolling container sentence ranks ui_container first, while a developer coding standard such as using computed signals still ranks coding_standard_rule first.
