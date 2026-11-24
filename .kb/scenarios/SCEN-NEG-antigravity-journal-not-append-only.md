---
title: Hook state is kept outside an append-only session journal is rejected
status: active
expects: rejection
tags:
  - negative-path
  - antigravity
origin:
  kind: agent
  recorded_at: '2026-11-24T05:07:28.084Z'
id: SCEN-NEG-antigravity-journal-not-append-only
type: scenario
---
Given parallel tool calls in one conversation, when hooks record dedupe, pending edits, firm confirmations and queued context, then they append to the session JSONL journal; state that is rewritten instead is rejected. packages/antigravity/tests/kb-tools-session.test.ts covers the journal replay of every event kind.