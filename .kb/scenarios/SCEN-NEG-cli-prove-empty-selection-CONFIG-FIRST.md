---
title: An empty selection refused for a missing configuration is caught
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T13:40:40.563Z'
id: SCEN-NEG-cli-prove-empty-selection-CONFIG-FIRST
type: scenario
---
Given a workspace with no proof integration configuration and no proof-bearing test, when kibi prove stops with PROOF_INTEGRATIONS_UNAVAILABLE instead of reporting no proof-bearing tests selected, then the prove command tests fail. packages/cli/tests/proof/prove-command.test.ts and packages/cli/tests/commands/prove-mutation.test.ts exercise it.