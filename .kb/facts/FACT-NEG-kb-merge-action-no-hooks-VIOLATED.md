---
title: A repository hook refuses the action's merge
status: active
fact_kind: property_value
subject_key: kibi.ci.kb_merge_action
property_key: repository_hooks_run_on_merge
operator: eq
value_type: int
value_int: 1
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T18:11:40.804Z'
id: FACT-NEG-kb-merge-action-no-hooks-VIOLATED
type: fact
---
npm ci installs a pre-commit or pre-push hook in the checkout, and the hook fails the action's merge commit or push, so the conflict stays although the merge and the check were fine.