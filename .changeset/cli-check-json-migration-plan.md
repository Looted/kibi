---
"kibi-cli": patch
---

`kibi check --format json` now includes the `migrationPlan` that `kb_check` already returns, so the CLI and MCP check report the same plan.
