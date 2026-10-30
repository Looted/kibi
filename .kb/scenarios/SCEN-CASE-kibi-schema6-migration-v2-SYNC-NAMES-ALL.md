---
title: Sync fails once and names every requirement whose drifted inventory fails ingestion
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:52:48.366Z'
id: SCEN-CASE-kibi-schema6-migration-v2-SYNC-NAMES-ALL
type: scenario
---
Given a schema 5 KB with two requirements whose inventories an older advisor wrote, each storing a normative clause as rationale, when kibi sync runs, then it fails with one error that counts two failing requirements, names the document of each and points to kibi migrate, instead of stopping at the first.

This covers the value past the bound, `gt 0`, of the claim that sync names every failing requirement in its migrate error. packages/cli/tests/consumer/schema6-migration.test.ts "sync names every requirement whose drifted inventory fails ingestion in one error that points to kibi migrate" exercises it through the built CLI.
