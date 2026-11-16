---
title: kibi init that leaves GEMINI.md without the AGENTS.md import
status: active
fact_kind: property_value
subject_key: kibi.init.agent_instructions
property_key: gemini_md_imports_agents_md
operator: eq
value_type: bool
value_bool: false
origin:
  kind: agent
  recorded_at: '2026-11-16T17:00:00.000Z'
tags:
  - init
id: FACT-init-gemini-md-not-written
type: fact
---
Scenario input: kibi init writes AGENTS.md and CLAUDE.md but no GEMINI.md import, so Gemini CLI never reads the Kibi instructions.