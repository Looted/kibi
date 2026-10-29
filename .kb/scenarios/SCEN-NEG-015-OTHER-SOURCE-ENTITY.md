---
title: A query by source file path excludes entities whose source is another file
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:59:56.862Z'
id: SCEN-NEG-015-OTHER-SOURCE-ENTITY
type: scenario
---
Given two synced requirements from .kb/requirements/req-billing.md and .kb/requirements/req-audit.md, when kibi query req --source .kb/requirements/req-billing.md runs, then only req-billing is returned and req-audit, whose source does not match, is excluded.

This is the failure side of querying by source file: an entity from another file must not leak into the result. documentation/tests/e2e/packed/init-sync-check.test.ts "should query by source file return only entities whose source matches that path" exercises it.
