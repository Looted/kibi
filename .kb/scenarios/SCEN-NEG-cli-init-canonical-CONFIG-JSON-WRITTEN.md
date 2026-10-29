---
title: kibi init writes no .kb/config.json, entity path overrides or check-disabling policy
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T20:59:48.490Z'
id: SCEN-NEG-cli-init-canonical-CONFIG-JSON-WRITTEN
type: scenario
---
Given a fresh git repository, when kibi init scaffolds the knowledge base, then it does not write a user-configurable .kb/config.json, and the Kibi-owned .kb/manifest.json carries no paths, checks, rules or disabledRules override.

This is the failure side of canonical init: a configurable layout or a persistent rule switch would let a workspace drift from the canonical .kb/ contract. documentation/tests/e2e/packed/init-sync-check.test.ts "should init write no .kb/config.json, path overrides or check-disabling policy" exercises it.
