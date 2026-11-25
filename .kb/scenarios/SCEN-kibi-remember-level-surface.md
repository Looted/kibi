---
title: At level remember the tool listing and kb_skills leave out proof work
status: active
expects: success
tags:
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T09:49:17.885Z'
id: SCEN-kibi-remember-level-surface
type: scenario
---
Given a project at level remember, when the MCP server starts, then no tool profile lists kb_ingest_proof and the instructions do not offer it; and kb_skills lists every bundled skill but kibi-provable-code, which still loads by id. At test every tool and skill is offered.
