---
title: kibi migrate refuses to apply an upgrade whose approved hash does not match the current plan
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:20:07.482Z'
id: SCEN-NEG-cli-schema-migration-UNAPPROVED-PLAN-HASH
type: scenario
---
Given a schema 5 KB whose migration plan was previewed with kibi migrate --dry-run, when kibi migrate --apply-safe runs with an approved plan hash that is not the plan's hash, then the migration is refused: the command exits non-zero, asks to regenerate the plan and approve its current hash, and leaves .kb/manifest.json unchanged.

This is the failure side of explicit migration application: an upgrade the person did not approve, or approved in another state, must not be applied. packages/cli/tests/consumer/schema6-migration.test.ts "an upgrade applied with a hash other than the planned one is refused and changes nothing" exercises it.
