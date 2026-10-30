---
title: A second replace provider for the same capability is refused
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:01:40.189Z'
id: SCEN-CASE-capability-plugin-three-capabilities-v1-second-replace-provider
type: scenario
---
Given a project configuration that activates two plugin packages in replace mode for the semantic classifier capability, when the capability registry resolves the semantic classifiers, then resolution fails with "At most one replace provider is allowed" naming the second package, and no classifier is returned.

documentation/tests/e2e/capability-plugins.e2e.ts exercises this edge case in its assertion "a second replace provider for the same capability is refused". It covers the value past the bound, `replace_providers_per_capability gt 1`.
