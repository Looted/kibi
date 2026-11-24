---
title: The engine client must reclaim a dead Unix socket refusing connections under the start lock, fail closed on non-socket files or ambiguous socket errors, and wait for a draining daemon before starting or replacing a writer
status: active
tags:
  - strict-modeling
  - lane:strict
  - fact:property_value
  - cli
  - engine
  - socket
fact_kind: property_value
subject_key: kibi.engine.dead_socket_reclaim
property_key: unsafe_or_unreclaimed_dead_engine_sockets
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-528E25F76490BE42
claim_text: The engine client must reclaim a dead Unix socket refusing connections under the start lock, fail closed on non-socket files or ambiguous socket errors, and wait for a draining daemon before starting or replacing a writer
text_ref: REQ-engine-client-reclaim-dead-unix-socket
origin:
  kind: agent
  recorded_at: '2026-11-23T10:46:57.544Z'
id: FACT-kibi-engine-dead-socket-reclaim
type: fact
---
The engine client must reclaim a dead Unix socket refusing connections under the start lock, fail closed on non-socket files or ambiguous socket errors, and wait for a draining daemon before starting or replacing a writer.