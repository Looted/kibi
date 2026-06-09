---
name: init-kibi
description: Bootstrap Kibi knowledge for the current branch using the MCP autopilot workflow
---

# Initialize Kibi

Bootstrap repo-local Kibi memory without editing `.kb/` files directly.

## Workflow

1. Run `kb_autopilot_generate` for read-only synthesis.
2. Show the preview and get explicit approval before writes.
3. Apply approved entities with sequential `kb_upsert`.
4. Finish with `kb_check`.

## Guidance

- Ask at most four bounded context questions when repository evidence is insufficient.
- Prefer source-linked entities so future `kb_query` lookups can verify context.
- Keep mutation batches small and reviewable.
