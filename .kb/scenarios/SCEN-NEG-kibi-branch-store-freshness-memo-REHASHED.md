---
title: Missing or unpersisted branch-store freshness memo re-hashing unchanged files is caught
status: active
tags:
  - negative-path
expects: rejection
origin:
  kind: agent
  recorded_at: '2026-11-23T10:45:57.419Z'
id: SCEN-NEG-kibi-branch-store-freshness-memo-REHASHED
type: scenario
---
Negative-path scenario for GitHub issue #829 (item 2, persisted freshness memo): catches regressions where `freshness-memo.json` is omitted or fails to persist `(mtimeMs, ctimeMs, size, ino)` across separate CLI invocations, forcing full SHA-256 re-reads of unchanged `.kb/` files.