---
id: SCEN-cli-migrate
title: Migration command reviews and updates KB schema
status: active
created_at: 2026-05-30T00:00:00Z
updated_at: 2026-06-01T00:00:00Z
source: packages/cli/tests/commands/migrate.test.ts
tags: [cli, migration, schema]
links:
  - type: verified_by
    target: TEST-cli-migrate
---

Given a branch KB with legacy schema metadata, when the operator runs the migration command in dry-run mode, it previews required schema updates without writing files. When the operator applies the migration, the command updates compatible KB metadata and records audit-oriented migration output without corrupting existing ontology data.
