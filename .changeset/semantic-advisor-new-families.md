---
"kibi-mcp": patch
---

Semantic advisor suggestions now cover five additional real-product requirement families from product KB audits. Agents can model abstraction boundaries, security configuration requirements, ordered strategy selection, refresh policies, and scoped authorization without falling back to generic ontology-gap observations.

- Add built-in predicate schemas, usage hints, extraction, scoring, and advisor receipt suggestions for `abstraction_boundary_rule`, `security_configuration_rule`, `ordered_strategy_rule`, `refresh_policy_rule`, and `scoped_authorization_rule`.
- Extend deterministic prose coverage fixtures and direct MCP predicate/advisor tests for the new families.
- Document the expanded advisory-only predicate catalog in agent-facing docs.
