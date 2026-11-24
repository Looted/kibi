---
title: Engine client unlinking a non-socket or racing a starting or draining daemon is caught
status: active
tags:
  - negative-path
expects: rejection
origin:
  kind: agent
  recorded_at: '2026-11-23T10:47:02.553Z'
id: SCEN-NEG-kibi-engine-dead-socket-reclaim-UNSAFE
type: scenario
---
Negative-path scenario for GitHub issue #829 (item 3, dead engine socket auto-reclaim): catches regressions where `EngineClient` unlinks a regular file at the socket path, races the `bind()`-to-`listen()` window without `startLockPath`, or kills a live draining daemon.