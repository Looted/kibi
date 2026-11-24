---
title: Persisted branch-store freshness memo detects tracked .kb/ drift across CLI processes without re-hashing unchanged files
status: active
priority: should
tags:
  - cli
  - sync
  - freshness
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-23T10:45:56.404Z'
id: SCEN-kibi-branch-store-freshness-memo
type: scenario
---
Verifies GitHub issue #829 (item 2, persisted freshness memo): because each CLI command runs in a fresh Node process, `FreshnessMemo` persists `(mtimeMs, ctimeMs, size, ino) -> sha256` entries with Git racy-tick guards in `freshness-memo.json` inside the gitignored branch store so unchanged tracked `.kb/` files are not re-hashed while in-place edits are detected immediately.