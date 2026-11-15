---
title: Bootstrap write safety
status: active
fact_kind: subject
subject_key: bootstrap.write_safety
origin:
  kind: agent
  recorded_at: '2026-10-04T16:03:02.801Z'
id: FACT-bootstrap-write-safety-subject
type: fact
---

The guarantees around bootstrap writes: a plan is not bound when existing ids cannot be read, every payload is validated before the journal or any entity is written, and every skipped candidate and extraction failure is reported. It is about safe writing, not about what is planned.
