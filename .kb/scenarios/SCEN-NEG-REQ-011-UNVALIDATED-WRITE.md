---
title: A write whose entity payload fails schema validation is rejected before anything is stored
status: active
expects: rejection
tags:
  - negative-path
  - write-governance
origin:
  kind: agent
  recorded_at: '2026-10-29T19:55:25.769Z'
id: SCEN-NEG-REQ-011-UNVALIDATED-WRITE
type: scenario
---
Given an upsert whose entity payload does not satisfy the entity schema, when kb_upsert receives it, then the write is rejected with the validation errors and Prolog is never asked to store anything.

This is the failure side of write governance: a changeset that skips schema and relationship validation must not reach the knowledge base. The MCP upsert handler test "rejects invalid entity payloads before querying Prolog" exercises it.
