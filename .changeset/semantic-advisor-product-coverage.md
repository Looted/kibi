---
"kibi-mcp": patch
---

Semantic advisor coverage now handles additional broad requirement shapes found in product KB audits. Requirements about documentation obligations, warmup behavior, visual layout consistency, enforcement location, reconciliation cleanup, throttling policies, migration-boundary variants, API-avoidance coding standards, and readiness ordering now produce reviewable semantic suggestions instead of generic observation gaps.

- Add built-in predicate schemas and advisor detections for documentation standards, warmup policies, visual layout rules, enforcement-location rules, reconciliation rules, and throttling policies.
- Extend migration-boundary, coding-standard, and temporal-order phrase handling for product-style requirement prose.
- Expand deterministic coverage fixtures and direct MCP predicate/advisor tests for the remaining product-audit examples.
