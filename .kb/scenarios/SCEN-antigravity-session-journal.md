---
origin:
  kind: agent
  recorded_at: '2026-11-22T05:03:43.170Z'
status: active
tags:
  - scenario
  - antigravity
  - hooks
title: Antigravity hooks persist per-session state and queued snippets in an append-only JSONL journal
id: SCEN-antigravity-session-journal
type: scenario
expects: success
---
# Per-conversation append-only session journal for Antigravity hooks

- **Given** a conversation in an opted-in Kibi workspace running parallel Antigravity tool calls
- **When** tool hooks append `shown`, `edited`, `checked`, `firm_asked`, and `queued_context` events
- **Then** each hook persists events via O_APPEND to the conversation's `session.jsonl` under the hashed workspace/session data directory
- **And** subsequent `loadSessionState` calls replay all events deterministically while skipping torn lines
- **And** `PreInvocation` flushes queued snippets via `context_flushed` so each snippet is injected once
