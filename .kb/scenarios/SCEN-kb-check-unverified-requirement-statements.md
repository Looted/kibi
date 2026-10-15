---
title: A scoped kb_check quotes the requirements the changed code implements
status: active
priority: must
tags:
  - kb
  - check
origin:
  kind: agent
  recorded_at: '2026-10-14T16:34:00.463Z'
id: SCEN-kb-check-unverified-requirement-statements
type: scenario
---
Given a source file whose function implements a firm requirement stating "Kibi must reject a swipl on PATH older than version 9.0", an agent-written requirement, and a closed requirement, when kb_check runs with impact diagnostics scoped to that file, then it reports requirement_statement_unverified for the firm and the agent-written requirement, quoting each statement with its firmness, skips the closed one, and its summary opens with "No structural violations found" and the two ids instead of "No violations found".

Given the same file in a Git checkout where the firm requirement's own document changed since the last commit, when kb_check runs the same way, then only the agent-written requirement is reported.

This exists because agents read "0 violations" after a change that contradicted the governing requirement as permission to keep it.
