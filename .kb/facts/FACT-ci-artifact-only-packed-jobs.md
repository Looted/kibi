---
id: FACT-ci-artifact-only-packed-jobs
title: Packed CI regression jobs consume artifacts without repository checkout
status: active
created_at: 2026-04-21T17:11:22Z
updated_at: 2026-04-21T17:11:22Z
source: .kb/facts/FACT-ci-artifact-only-packed-jobs.md
tags:
  - ci
  - workflow
  - e2e
  - artifacts
fact_kind: observation
links:
  - FACT-CI-GATING
  - TEST-opencode-kibi-plugin-v1
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Observation: Packed CI regression jobs (packed CLI and MCP suites) are designed to consume pre-built npm tarballs (artifacts) and should not require a repository checkout. This reduces CI clone traffic and enables promotion workflows that verify published artifacts match source behavior.
