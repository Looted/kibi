---
title: A contradiction question names the check only in the text
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-24T08:39:02.758Z'
id: SCEN-NEG-kibi-search-next-step-CONTRADICTION-ONLY-IN-TEXT
type: scenario
---
Given a question about contradictions, when its structured result is read, then it names no kb_check, so the advice that search only finds mentions of a conflict is lost.

packages/cli/tests/public-mutation/operations/discovery-search.mutation.test.ts "a question about contradictions names the check" rejects it.