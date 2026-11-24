---
title: A path in the question is named only in the text
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-24T08:39:01.945Z'
id: SCEN-NEG-kibi-search-next-step-PATH-ONLY-IN-TEXT
type: scenario
---
Given a question that names a file path and no sourceLocations, when its structured result is read, then it names no kb_search with that path, so the advice to pass sourceLocations is lost.

packages/cli/tests/public-mutation/operations/discovery-search.mutation.test.ts "a file path in the question suggests the search with sourceLocations" rejects it.