---
title: A malformed Jev timeout fails closed before any network call
status: active
expects: error
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:16:12.529Z'
id: SCEN-NEG-capability-plugin-configuration-v1-MALFORMED-TIMEOUT
type: scenario
---
Given KIBI_JEV_TIMEOUT_MS set to a value that is not a number, when the Jev semantic classifier is constructed, then construction fails with a malformed JevProviderError that names the effective model and the timeout bound, before any client or network call is made.

This is the failure side of the Jev timeout setting: an invalid timeout must never reach the network. documentation/tests/e2e/capability-plugins.e2e.ts asserts "malformed KIBI_JEV_TIMEOUT_MS fails with the effective model".
