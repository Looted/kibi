---
title: An editor file without registered symbols gets no Kibi code lenses
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:13:32.052Z'
id: SCEN-NEG-vscode-source-to-kb-UNINDEXED-FILE-LENSES
type: scenario
---
Given the built extension activated against a real Kibi workspace, when code lenses are requested for a source file that no symbol in the KB is registered to, then the provider returns no lenses, while the indexed file gets one.

This is the failure side of editor context: the extension must not claim knowledge base links for code the knowledge base does not know. documentation/tests/e2e/vscode-extension-lifecycle.e2e.ts, through documentation/tests/e2e/vscode-extension-driver.ts in its code lens stage, exercises it.
