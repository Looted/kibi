---
title: Kibi engine read limits
status: active
fact_kind: subject
subject_key: kibi.engine.read_limits
canonical_key: kibi_engine_read_limits
origin:
  kind: agent
  recorded_at: '2026-10-28T14:36:42.413Z'
id: FACT-kibi-engine-read-limits-component
type: fact
---

The opt-in limits on engine reads, set through KIBI_ENGINE_READ_TIME_LIMIT_MS and KIBI_ENGINE_READ_INFERENCE_LIMIT, that stop a runaway read with an error instead of a partial answer. They are off unless set.
