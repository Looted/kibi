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

Set up or refresh Kibi knowledge for the current branch through approved Kibi interfaces only. Maintain source-file traceability for every repository-backed claim, and require explicit operator approval before any mutation.

## Interface Selection

1. If approved Kibi MCP tools are visible, use the MCP route.
2. Otherwise, in a trusted workspace, use the canonical project-local CLI fallback: `npx --no-install kibi ...`.
3. If neither approved MCP tools nor the project-local CLI are available, stop and tell the operator to enable or install Kibi for this workspace.
4. Never use a global fallback, an installing runner, or any route outside the approved Kibi interface.

Use `kibi-usage/resources/operation-access.md` for the exact operation-to-route mapping. The CLI preview route accepts the same JSON object as `kb_autopilot_generate`:

```bash
echo '{"maxCandidates":25,"minConfidence":0.8}' | npx --no-install kibi autopilot-generate --input -
```

## Capability Workflow

- Generate a read-only bootstrap preview with `kb_autopilot_generate`, or the dedicated CLI route `autopilot-generate --input`.
- Show the generated preview and obtain explicit approval before writes.
- Apply reviewed entity creation or updates with `kb_upsert`, or `upsert --input`.
- If cleanup is needed, use `kb_delete`, or `delete --input`, only after checking dependencies and obtaining approval for the specific removal.
- Finish with `kb_check`, or `check --input`, to validate the branch snapshot.

## Guidance

- Keep mutation requests explicit, small, and sequential.
- Prefer source-linked entities so future `kb_query` lookups can verify repository context against source files.
- Preserve traceability by linking facts, claims, scenarios, and tests to concrete project files whenever repository evidence supports it.
- Do not read or edit files inside `.kb` directly; all changes go through the selected Kibi interface.
- Ask at most four bounded context questions, and only when repository evidence is insufficient.
- Stop at the documented operator repair boundary if the setup appears partial, inconsistent, or unsupported by the approved interface.

## Public Training Trajectories

- `init-kibi-bootstrap-analysis-train-1`: Analyze the cold-start repository and produce a read-only bootstrap preview using only the public Kibi MCP surface.
- `init-kibi-bootstrap-analysis-train-2`: Analyze the cold-start repository and produce a read-only bootstrap preview using only the public Kibi MCP surface.
- `init-kibi-bounded-context-questions-train-1`: Ask only the bounded context questions needed before bootstrap synthesis using only the public Kibi MCP surface.
- `init-kibi-bounded-context-questions-train-2`: Ask only the bounded context questions needed before bootstrap synthesis using only the public Kibi MCP surface.
- `init-kibi-approval-sequential-writes-train-1`: Apply the approved bootstrap plan sequentially and finish with validation using only the public Kibi MCP surface.
- `init-kibi-approval-sequential-writes-train-2`: Apply the approved bootstrap plan sequentially and finish with validation using only the public Kibi MCP surface.
- `init-kibi-repair-escalation-train-1`: Identify the partial setup and stop at the documented operator repair boundary using only the public Kibi MCP surface.
- `init-kibi-repair-escalation-train-2`: Identify the partial setup and stop at the documented operator repair boundary using only the public Kibi MCP surface.

## Training Data

```json
[{"taskId":"init-kibi-bootstrap-analysis-train-1","family":"bootstrap-analysis","reflection":"Analyze the cold-start repository and produce a read-only bootstrap preview. This is train case 1; use only the public Kibi MCP surface."},{"taskId":"init-kibi-bootstrap-analysis-train-2","family":"bootstrap-analysis","reflection":"Analyze the cold-start repository and produce a read-only bootstrap preview. This is train case 2; use only the public Kibi MCP surface."},{"taskId":"init-kibi-bounded-context-questions-train-1","family":"bounded-context-questions","reflection":"Ask only the bounded context questions needed before bootstrap synthesis. This is train case 1; use only the public Kibi MCP surface."},{"taskId":"init-kibi-bounded-context-questions-train-2","family":"bounded-context-questions","reflection":"Ask only the bounded context questions needed before bootstrap synthesis. This is train case 2; use only the public Kibi MCP surface."},{"taskId":"init-kibi-approval-sequential-writes-train-1","family":"approval-sequential-writes","reflection":"Apply the approved bootstrap plan sequentially and finish with validation. This is train case 1; use only the public Kibi MCP surface."},{"taskId":"init-kibi-approval-sequential-writes-train-2","family":"approval-sequential-writes","reflection":"Apply the approved bootstrap plan sequentially and finish with validation. This is train case 2; use only the public Kibi MCP surface."},{"taskId":"init-kibi-repair-escalation-train-1","family":"repair-escalation","reflection":"Identify the partial setup and stop at the documented operator repair boundary. This is train case 1; use only the public Kibi MCP surface."},{"taskId":"init-kibi-repair-escalation-train-2","family":"repair-escalation","reflection":"Identify the partial setup and stop at the documented operator repair boundary. This is train case 2; use only the public Kibi MCP surface."}]
```
