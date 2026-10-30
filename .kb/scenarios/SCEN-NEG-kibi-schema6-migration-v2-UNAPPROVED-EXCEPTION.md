---
title: Migration leaves an unapproved exception as a review action that requires a disposition
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:09:09.091Z'
id: SCEN-NEG-kibi-schema6-migration-v2-UNAPPROVED-EXCEPTION
type: scenario
---
Given a schema 5 KB holding an exception requirement that exempts the call quota requirement but carries no approved_by, when kibi migrate plans the upgrade, then the plan lists review-exception-unapproved for it with review safety and a required disposition, and the exception is never approved or applied automatically.

This is the failure side of the schema migration: an exception nobody approved must not start exempting a requirement through an upgrade. packages/cli/tests/consumer/schema6-migration.test.ts "a schema 5 KB migrates to schema 6 with migration origins and its grounding intact, and a rerun finds nothing to do" exercises it.
