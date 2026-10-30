---
title: kibi sync refuses to import a README.md inside an entity directory as an entity
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:00:03.779Z'
id: SCEN-NEG-cli-canonical-runtime-README-INGESTED
type: scenario
---
Given an initialized workspace whose .kb/requirements directory holds a real requirement and a README.md with requirement-shaped frontmatter, when kibi sync runs and kibi query req lists requirements, then the real requirement is listed and the README.md is not imported as an entity.

This is the failure side of sync discovery: directory documentation must never become knowledge just because it sits in an entity lane. documentation/tests/e2e/packed/init-sync-check.test.ts "should not import a README.md inside an entity directory" exercises it.
