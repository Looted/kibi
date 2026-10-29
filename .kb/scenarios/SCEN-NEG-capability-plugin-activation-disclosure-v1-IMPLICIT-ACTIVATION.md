---
title: An installed capability plugin that package.json does not activate is never imported
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:15:46.056Z'
id: SCEN-NEG-capability-plugin-activation-disclosure-v1-IMPLICIT-ACTIVATION
type: scenario
---
Given a workspace where a capability plugin package is installed but the project configuration activates no plugin, when the capability registry resolves semantic classifiers, then the plugin loader is never called and only builtin providers serve.

This is the failure side of explicit activation: being installed must not be enough to run third-party code. documentation/tests/e2e/capability-plugins.e2e.ts asserts "installed-but-inactive plugins are not imported" with a loader that fails if it is ever called.
