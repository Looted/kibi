---
id: SCEN-skill-behavioral-efficacy
title: Skill candidates are gated by hidden cross-host behavioral evidence
type: scenario
status: active
created_at: 2026-07-21T00:00:00Z
updated_at: 2026-07-21T00:00:00Z
source: documentation/evaluations/skillopt/methodology.md
priority: must
tags: [skills, evaluation, traceability, security]
links:
  - type: relates_to
    target: REQ-skill-behavioral-efficacy
  - type: verified_by
    target: TEST-skill-behavioral-efficacy
---

Given a frozen skill candidate and disposable Kibi fixture, the evaluator runs the candidate and both controls on Codex, OpenCode, and Cursor, reconciles brokered MCP evidence with final state, and reports a stratified gate without exposing private scoring data.
