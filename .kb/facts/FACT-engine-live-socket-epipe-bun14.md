---
title: Live socket probe ignores late EPIPE under Bun 1.4
status: open
fact_kind: observation
tags:
  - engine
  - bun
id: FACT-engine-live-socket-epipe-bun14
type: fact
---
# FACT-engine-live-socket-epipe-bun14

Observation: Bun 1.4 can emit a late EPIPE when destroying a connected unix-socket probe. runEngineDaemon marks the listener live before destroy and ignores peer write errors so colliding binds still report already-listening.
