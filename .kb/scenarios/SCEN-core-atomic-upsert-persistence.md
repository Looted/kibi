---
id: SCEN-core-atomic-upsert-persistence
title: Upsert commits RDF and audit state atomically across runtimes
status: active
created_at: 2026-08-11T00:00:00Z
updated_at: 2026-08-11T00:00:00Z
source: documentation/requirements/REQ-core-atomic-upsert-persistence.md
priority: must
tags:
  - core
  - persistence
  - audit
  - concurrency
links:
  - type: relates_to
    target: REQ-core-atomic-upsert-persistence
  - type: verified_by
    target: TEST-core-atomic-upsert-persistence
---

**Scenario: successful atomic commit**

Given an attached branch with a populated historical `audit.log`, when a caller upserts an entity with relationships, then the entity, relationships, entity audit row, relationship audit rows, and one RDF snapshot are durable and a later attachment can read all of them.

**Scenario: stale runtime or failed pre-save stage**

Given an older runtime holds the audit journal lock, or an attached runtime has a stale branch snapshot, when a caller attempts an upsert, then the operation returns within its configured bound with a stage-specific actionable error and the new entity and relationships are absent from the durable snapshot.

**Scenario: bounded process timeout**

Given a Prolog child blocks during a commit stage, when the configured query deadline expires, then Kibi reports the last emitted stage and child PID, terminates and reaps the complete process group, and a later operation can run cleanly.
