---
title: A permission declared by the kibi-plugin-ui export fails the plugin contract guard
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:12:02.319Z'
id: SCEN-CASE-ui-plugin-design-policy-DECLARED-PERMISSION
type: scenario
---
Given the kibi-plugin-ui package export, when the plugin SDK validates it, then its permissions are network false, metered false and no secrets, and its only capability is checkPolicy; a declared network, metered or secret permission fails the guard.

This covers the value past the bound, `gt 0`, of the claim that the package declares no permissions. packages/plugin-ui/tests/plugin.test.ts "is a valid permission-free plugin contributing only a check policy" exercises it.
