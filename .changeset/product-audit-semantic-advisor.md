---
"kibi-mcp": patch
---

Semantic advisor suggestions now recognize more requirement shapes found in real product repositories. Agents get reviewable predicate plans for build constraints, environment safety, schema invariants, coding standards, migration boundaries, absence/removal requirements, offline behavior, release gates, platform consistency, and preservation rules instead of falling back to generic prose.

- Add built-in predicate schemas, usage hints, extraction, and advisor detections for ten product-audit families.
- Extend deterministic prose coverage fixtures and MCP predicate/advisor tests for the new families.
- Document the expanded advisory-only predicate coverage in agent-facing docs.
