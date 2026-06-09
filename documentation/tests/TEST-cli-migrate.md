---
id: TEST-cli-migrate
title: CLI migration command unit tests
status: passing
created_at: 2026-05-30T00:00:00Z
updated_at: 2026-06-08T00:00:00Z
source: packages/cli/tests/commands/migrate.test.ts
tags: [cli, migration, schema, unit]
links:
  - type: validates
    target: SCEN-cli-migrate
---

Verifies that the CLI migration command reports schema migrations in dry-run mode and exercises the command path that applies branch KB schema updates safely, including the semantic-advisor backfill marker written for migrated KBs.
