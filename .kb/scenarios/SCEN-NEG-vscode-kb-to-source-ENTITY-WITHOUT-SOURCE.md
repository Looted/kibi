---
title: Navigating to an entity without a source file opens nothing and says so
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:13:03.793Z'
id: SCEN-NEG-vscode-kb-to-source-ENTITY-WITHOUT-SOURCE
type: scenario
---
Given the built extension activated against a real Kibi workspace, when kibi.openEntityById is run for an ID that the KB does not index, then no document is opened and the user is told the entity has no local source file.

This is the failure side of tree-to-source navigation: an entity Kibi cannot place in the source must not open an unrelated file. documentation/tests/e2e/vscode-extension-lifecycle.e2e.ts, through documentation/tests/e2e/vscode-extension-driver.ts in its navigation stage, exercises it.
