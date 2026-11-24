---
title: Engine client reclaims dead ECONNREFUSED Unix sockets under startLockPath while failing closed on non-sockets and waiting for draining peers
status: active
priority: should
tags:
  - cli
  - engine
  - socket
expects: success
origin:
  kind: agent
  recorded_at: '2026-11-23T10:47:01.544Z'
id: SCEN-kibi-engine-dead-socket-reclaim
type: scenario
---
Verifies GitHub issue #829 (item 3, dead engine socket auto-reclaim): `EngineClient` probes Unix socket files under `startLockPath` or the publication lease, unlinks `isSocket() && ECONNREFUSED` remnants at 0 ms even when the OS recycles the old PID, fails closed on regular files or `EACCES`, and waits up to 5 s for draining daemons touching `.sock.pid`.