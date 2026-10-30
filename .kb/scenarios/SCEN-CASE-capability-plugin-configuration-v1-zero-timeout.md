---
title: A Jev timeout of 0 milliseconds is refused before any client call
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:01:07.430Z'
id: SCEN-CASE-capability-plugin-configuration-v1-zero-timeout
type: scenario
---
Given KIBI_JEV_TIMEOUT_MS set to 0, when the Jev semantic classifier is constructed, then construction fails with a malformed JevProviderError naming the effective model and the timeout bound, and the client factory is never called.

documentation/tests/e2e/capability-plugins.e2e.ts exercises this edge case in its assertion "KIBI_JEV_TIMEOUT_MS=0 outside 1..120000 fails before any client call". It covers the value below the bound, `timeout_ms lt 1`.
