---
title: A source proof stands in for an implementing symbol
status: active
expects: success
tags:
  - proof
origin:
  kind: agent
  recorded_at: '2026-11-18T10:54:34.899Z'
id: SCEN-kibi-source-proof-scopes-unimplemented-rule
type: scenario
---
A project keeps "every environment variable the app reads must be one of DATABASE_URL, PORT or SECRET" and "every table must have id and created_at" as requirements that no symbol implements. kibi prove records a source proof of each claim with a derived binding, and kibi coverage reports each requirement's production-symbol stage as passed with scope source_proof and the proving test, with no missing_production_symbol gap. A rule whose source binding is rejected still reports the missing symbol.