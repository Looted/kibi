---
title: A client replaces an engine daemon with other package versions
status: active
priority: must
tags:
  - engine
  - daemon
  - prolog
origin:
  kind: agent
  recorded_at: '2026-10-08T21:05:00.221Z'
id: SCEN-engine-daemon-package-versions
type: scenario
---
Given an engine daemon started by an install with other package versions, when a client connects, the daemon reports its package versions in the handshake and refuses that client's other requests, and the client stops the daemon and starts its own instead of reusing it; kibi doctor reports the package versions of the daemon that is running.