---
title: A leftover .kb/config.json without a manifest leaves the project uninitialized
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T09:00:00.000Z'
id: SCEN-NEG-kibi-manifest-initialized-signal-CONFIG-AS-INITIALIZED
type: scenario
---
Given a workspace whose .kb directory holds only a leftover config.json, when the packed Cursor session hook runs, then its context reports that Kibi config was not found. After .kb/manifest.json is added, the same hook no longer reports it.

This is the failure side of the manifest readiness signal: a pre-canonical config file never stands in for an initialized project. documentation/tests/e2e/packed/cursor-plugin-launcher.test.ts "the packed session hook treats a leftover .kb/config.json without .kb/manifest.json as an uninitialized project" exercises it, inside the TEST-cursor-kibi-plugin-v1 proof run.
