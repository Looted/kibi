---
title: A kb_upsert of a requirement that contradicts an existing requirement is rejected and not persisted
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:00:26.205Z'
id: SCEN-NEG-mcp-tool-upsert-CONTRADICTION
type: scenario
---
Given a KB where requirement A requires a 30 minute session timeout, when an agent calls kb_upsert for requirement B requiring a 60 minute timeout on the same subject without a supersedes relationship, then the write is rejected with a contradiction error that names requirement A and how to resolve it, and requirement B is not queryable afterwards.

This is the failure side of requirement consistency enforcement in kb_upsert: a conflicting requirement must not reach the knowledge base silently. documentation/tests/e2e/packed/mcp-crud.test.ts "should reject a contradicting requirement with the actionable structured error" exercises it.
