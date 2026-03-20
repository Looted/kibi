---
id: SCEN-opencode-enforcement
title: OpenCode plugin enforces Kibi-first behaviors
type: scenario
status: active
created_at: 2026-03-17T00:00:00Z
updated_at: 2026-03-17T00:00:00Z
source: docs/plans/2026-03-17-opencode-kibi-enforcement-plan.md
priority: must
tags:
  - enforcement
  - opencode
  - kibi-first
  - guidance
---

## Scenario

An AI agent is working on code changes and Kibi documentation in an OpenCode session with the Kibi plugin active.

### Steps

1. Agent edits a TypeScript file in `src/app/`.
2. Plugin detects code file edit and injects dynamic guidance mentioning:
   - Query Kibi by sourceFile before implementation
   - Prefer Kibi over code comments for durable knowledge
   - Add `// implements REQ-xxx` to changed symbols
3. Agent edits a requirement file `documentation/requirements/REQ-001.md`.
4. Plugin detects requirement edit and injects guidance about:
   - Separate SCEN and TEST entities
   - Avoid embedding scenarios/tests inside requirements
5. Agent adds a long explanatory comment to a code file.
6. Plugin detects comment pattern and suggests routing to FACT, ADR, or REQ as appropriate.
7. Agent attempts to edit a file under `.kb/relationships/`.
8. Plugin emits loud warning via log and prompt injection, directing agent to MCP/CLI tools.
9. Agent creates a new requirement with `priority: must`.
10. Plugin runs targeted background check: `kibi check --rules must-priority-coverage,no-dangling-refs`.
11. Agent attempts to create a new repo without Kibi initialized.
12. Plugin detects missing `.kb/config.json` and injects bootstrap guidance for `/init-kibi`.

### Expected Outcomes

- Agent receives contextual guidance appropriate to the type of work being done.
- Fewer long explanatory comments remain in code files.
- More requirements gain linked scenarios and tests promptly.
- Manual `.kb/**` edits are discouraged and intercepted early.
- Domain knowledge is routed to appropriate entity types (FACT vs REQ vs ADR).
- Uninitialized repos receive early bootstrap nudges.
- Targeted validation catches consistency issues without blocking the editor.
