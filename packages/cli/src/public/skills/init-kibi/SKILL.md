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

## Interface Selection

1. If Kibi MCP tools are positively visible and approved, use MCP.
2. Otherwise, in a trusted workspace, use the project-local CLI through `npx --no-install kibi ...` or `bunx --no-install kibi ...`.
3. If the CLI is unavailable or too old, stop and tell the operator to enable or install Kibi.
4. Never use a global fallback or an installing runner.

Use `kibi-usage/resources/operation-access.md` for the exact operation-to-route mapping. For example, the CLI preview route accepts the same JSON object as `kb_autopilot_generate`:

```bash
echo '{"maxCandidates":25,"minConfidence":0.8}' | npx --no-install kibi autopilot-generate --input -
```

## Capability workflow

- Run `kb_autopilot_generate`, or dedicated CLI route `autopilot-generate --input`, for suggested initial facts and claims.
- Show the generated preview and get explicit approval before writes.
- Use `kb_upsert`, or `upsert --input`, for reviewed entity creation or updates.
- If cleanup is needed, use `kb_delete`, or `delete --input`, only after checking dependencies.
- Finish with `kb_check`, or `check --input`, to validate the branch snapshot.

## Guidance

- Keep mutation requests explicit and small.
- Use source-linked entities where possible so future `kb_query` lookups can verify context.
- Do not edit `.kb/**` files directly; all changes go through the selected Kibi interface.
- Ask at most four bounded context questions, and only when repository evidence is insufficient.
