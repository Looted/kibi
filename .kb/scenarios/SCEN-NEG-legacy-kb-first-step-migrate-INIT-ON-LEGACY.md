---
title: kb_status on a legacy KB refuses to name kibi init first and names kibi migrate --yes
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:20:04.188Z'
id: SCEN-NEG-legacy-kb-first-step-migrate-INIT-ON-LEGACY
type: scenario
---
Given a workspace with a legacy .kb/config.json, an untyped requirement file and no .kb/manifest.json, when kibi doctor and kibi status run, then both name kibi migrate --yes as the required first step, the reason says not to run kibi init first, and the bootstrap block never offers kibi init as the command to run.

This is the failure side of the legacy first step: kibi init on a legacy layout would skip the legacy migration, so it must not be offered. packages/cli/tests/commands/migrate-entity-type.test.ts "a legacy KB: doctor and kb_status both name kibi migrate --yes first, migrate states the type, and a status-only upsert changes only the status line" exercises it.
