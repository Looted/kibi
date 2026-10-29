---
title: With kibi.plugins absent the host uses builtin providers and imports no plugin
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:15:59.827Z'
id: SCEN-NEG-capability-plugin-builtin-parity-v1-PLUGINS-ABSENT-IMPORT
type: scenario
---
Given a workspace whose project configuration has no kibi.plugins entry, when the capability registry resolves semantic classifiers, then no plugin package is imported and classification is served by the automatically registered builtin providers.

This is the failure side of builtin parity: an absent configuration must not pull in external providers. documentation/tests/e2e/capability-plugins.e2e.ts asserts "installed-but-inactive plugins are not imported" with a loader that throws if it is reached.
