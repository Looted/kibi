---
id: init-kibi
name: init-kibi
description: Bootstrap and model knowledge safely using approved Kibi MCP initialization and mutation workflow.
version: 1.0.0
kibiCompatibility: "*"
tags:
  - kibi
  - mcp
  - bootstrap
  - agent-guidance
---

## Goal

Set up or refresh Kibi knowledge for the current branch without manual filesystem edits.

## MCP workflow

- Run `kb_autopilot_generate` for suggested initial facts and claims.
- Show the generated preview and get explicit approval before writes.
- Use `kb_upsert` for reviewed entity creation or updates.
- If cleanup is needed, use `kb_delete` only after checking dependencies.
- Finish with `kb_check` to validate the branch snapshot.

## Guidance

- Keep mutation requests explicit and small.
- Use source-linked entities where possible so future `kb_query` lookups can verify context.
- Do not edit `.kb/**` files directly; all changes go through MCP calls.
- Ask at most four bounded context questions, and only when repository evidence is insufficient.
