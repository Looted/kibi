---
title: kb_check rejects a KB whose sources declare one entity id twice instead of passing it
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-05T11:47:36.323Z'
id: SCEN-NEG-kibi-duplicate-entity-declarations
type: scenario
---
Given authored Kibi sources that declare one entity id twice, in `.kb/symbols.yaml` or in two entity files, when `kibi check` runs on the full KB, then Kibi rejects the KB as valid: the check exits non-zero with a blocking `source-relationship-parity` finding for the id instead of passing while the staged gate refuses every commit.

This is the failure side of duplicate entity declarations. packages/cli/tests/commands/duplicate-entity-declarations.test.ts "kibi check blocks a symbol declared twice in .kb/symbols.yaml and passes once one declaration remains" exercises it.