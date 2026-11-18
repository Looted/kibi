---
title: The staged gate ignores a real text change to a declaration
status: active
fact_kind: property_value
subject_key: kibi.cli.check.staged
property_key: changed_declaration_means_new_title_or_normalized_text_change
operator: neq
value_type: bool
value_bool: true
tags:
  - negative-path
  - staged-gate
  - symbols
origin:
  kind: agent
  recorded_at: '2026-11-16T09:00:00.000Z'
id: FACT-NEG-staged-gate-changed-declaration-definition-CHANGED-DECLARATION-IGNORED
type: fact
---
The failure side of the rule: an edit to a declaration's code would go unjudged because the gate did not count it as changed.