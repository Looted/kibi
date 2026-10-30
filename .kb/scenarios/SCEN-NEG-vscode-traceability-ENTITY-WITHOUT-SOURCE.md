---
title: The extension does not trace an entity without a source file to any document
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:13:17.092Z'
id: SCEN-NEG-vscode-traceability-ENTITY-WITHOUT-SOURCE
type: scenario
---
Given the built extension activated against a real Kibi workspace, when navigation is requested for an entity ID the KB does not index, then no document is opened and the user is told the entity has no local source file.

This is the failure side of bidirectional traceability: a link from the knowledge base to code is only shown where the knowledge base actually records one. documentation/tests/e2e/vscode-extension-lifecycle.e2e.ts, through documentation/tests/e2e/vscode-extension-driver.ts in its navigation stage, exercises it.
