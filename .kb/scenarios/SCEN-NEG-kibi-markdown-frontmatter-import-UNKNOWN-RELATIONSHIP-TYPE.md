---
title: Sync refuses a front matter relationship of an unknown type
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T11:00:00.000Z'
id: SCEN-NEG-kibi-markdown-frontmatter-import-UNKNOWN-RELATIONSHIP-TYPE
type: scenario
---
Given a test whose front matter relationship type is changed to one outside the typed vocabulary, when sync runs, then it reports Invalid relationship type naming the file and the type, and no relationship of that type reaches the KB.

This is the failure side of typed front matter import. documentation/tests/e2e/packed/issue-93-regression.test.ts "sync imports a typed front matter relationship with its type and refuses an unknown type" exercises it, inside the TEST-015 proof run.
