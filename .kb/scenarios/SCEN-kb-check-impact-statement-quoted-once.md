---
title: A requirement statement is quoted once in a kb_check impact diagnostic
status: active
tags:
  - check
  - cost
origin:
  kind: agent
  recorded_at: '2026-11-24T19:19:33.735Z'
id: SCEN-kb-check-impact-statement-quoted-once
type: scenario
---
Given a change to code that implements a current requirement, when kb_check runs with impact diagnostics on that file, then the requirement_statement_unverified diagnostic carries the statement in evidence.statement, and its message names the requirement and its firmness and points at evidence.statement instead of quoting the statement again.
