---
title: A repository hook refuses the action's merge
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T18:11:51.466Z'
id: SCEN-NEG-kb-merge-action-no-hooks-VIOLATED
type: scenario
---
npm ci installs a pre-commit or pre-push hook in the checkout, and the hook fails the action's merge commit or push, so the conflict stays although the merge and the check were fine.

This is the failure side the action must not produce; scripts/tests/kb-merge-action.test.ts checks it.