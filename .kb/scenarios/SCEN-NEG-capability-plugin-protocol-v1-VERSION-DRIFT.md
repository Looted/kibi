---
title: A plugin whose exported version differs from its package version is refused at load
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:16:40.005Z'
id: SCEN-NEG-capability-plugin-protocol-v1-VERSION-DRIFT
type: scenario
---
Given a declared plugin dependency whose package.json says version 1.0.0 while its kibiPlugin export claims 2.0.0, when the host loads the package, then loading fails with PLUGIN_VERSION_MISMATCH and the plugin is not used.

This is the failure side of provider provenance: a plugin must not report a version that its resolved package does not have. documentation/tests/e2e/capability-plugins.e2e.ts asserts "an exported provider version that differs from the resolved package version is refused".
