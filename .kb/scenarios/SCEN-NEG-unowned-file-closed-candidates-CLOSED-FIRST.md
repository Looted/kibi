---
title: The note for an unlinked file names current candidates before a closed one
status: active
expects: rejection
tags:
  - negative-path
  - search
origin:
  kind: agent
  recorded_at: '2026-11-11T17:33:48.963Z'
id: SCEN-NEG-unowned-file-closed-candidates-CLOSED-FIRST
type: scenario
---
Given a closed requirement whose title shares more of a file's path words than a current one, when an agent edits that file and no symbol in it is linked, the hook note and an impact kb_check scoped to it name the current requirement first and the closed one after it, instead of leading with the closed one. packages/agent-core/tests/requirement-candidates.test.ts "a closed requirement is offered only after every current one" and packages/cli/tests/traceability/unowned-files.test.ts exercise it.

This is the failure side of the closed candidate requirement.