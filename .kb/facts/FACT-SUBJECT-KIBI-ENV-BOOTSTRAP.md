---
title: Kibi Env Bootstrap
status: active
tags:
  - lane:strict
  - env
  - bootstrap
text_ref: .kb/requirements/REQ-kibi-env-bootstrap.md
fact_kind: subject
subject_key: kibi.env_bootstrap
canonical_key: kibi.env_bootstrap
id: FACT-SUBJECT-KIBI-ENV-BOOTSTRAP
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

How the CLI and MCP load environment variables and env files: one shared resolver for the workspace, a fixed source order, a blank-value policy, and doctor attributing each secret to its real source without importing plugins. It works the same with or without an agent harness.
