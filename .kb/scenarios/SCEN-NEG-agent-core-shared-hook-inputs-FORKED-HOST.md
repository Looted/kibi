---
title: A host hook that declares its own path classification is caught
status: active
priority: must
expects: rejection
tags:
  - negative-path
  - hooks
  - agent-core
origin:
  kind: agent
  recorded_at: '2026-11-04T14:44:07.609Z'
id: SCEN-NEG-agent-core-shared-hook-inputs-FORKED-HOST
type: scenario
---
Given a host hook source that imports the shared `classifyPath` but also declares its own `classifyPath` with a different rule
When the shared hook input contract runs over it
Then the contract reports the local declaration, so a host cannot fork a hook input decision unnoticed.

`packages/agent-core/tests/shared-hook-inputs.test.ts` "a host that reimplements a decision is caught" exercises it.
