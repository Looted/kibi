---
id: kibi-usage
name: Kibi Usage
description: Guides agents to use Kibi MCP, facts, relationships, and validation correctly
version: 1.0.0
kibiCompatibility: ">=0.11.0"
tags:
  - kibi
  - mcp
  - knowledge-base
  - traceability
  - agent-guidance
resources:
  - resources/relationship-directions.md
  - resources/fact-lanes.md
  - resources/workflows.md
---

# Kibi Usage

Consult this skill before any Kibi knowledge base operation, on first interaction with a Kibi-enabled repo, after detecting stale or dirty KB status, and before performing mutations.

## MCP-Only Rules

Interact with the knowledge base exclusively through MCP tools. Do not read or edit files inside `.kb/` directly. Do not run any `kibi` CLI commands from the agent session. The MCP surface is the only sanctioned interface for agents.

## Discovery-First Workflow

Always discover before you mutate. Start with `kb_search` for exploratory discovery across metadata and markdown body text. Split broad queries into 1-3 focused probes. Review top hits for relevance before concluding the KB lacks knowledge.

Follow up with `kb_query` for exact lookups by `id`, `type`, `tags`, or `sourceFile`. Call `kb_status` to inspect branch attachment and freshness when stale context would affect decisions. Only after discovery and confirmation should you mutate.

## Relationship Directions

Relationship direction is fixed and semantic. Getting it wrong breaks traceability queries and validation.

| Relationship | Direction | Meaning |
|-------------|-----------|---------|
| `implements` | symbol -> req | Symbol owns or implements requirement behavior |
| `specified_by` | req -> scenario | Requirement is specified by a scenario |
| `verified_by` | req/scenario -> test | Requirement or scenario is verified by a test |
| `validates` | test -> req/scenario | Test validates a requirement or scenario |
| `executable_for` | symbol -> test | Symbol is executable test code for a test entity |
| `constrains` | req -> fact(subject) | Requirement constrains a domain fact |
| `requires_property` | req -> fact(property_value) | Requirement requires a property value |
| `supersedes` | old-req -> new-req | Old requirement is replaced by new requirement |
| `covered_by` | symbol -> test | Production symbol has coverage evidence from a test |

See `resources/relationship-directions.md` for detailed payload examples.

## Strict Fact Lane

Normative requirements that must participate in contradiction blocking use the strict fact lane. Create a `fact_kind: subject` fact and link it from the requirement via `constrains`. Create a `fact_kind: property_value` fact and link it via `requires_property`.

```yaml
# Fact entity
id: FACT-USER-ROLE
title: User Role Assignment
status: active
fact_kind: subject
subject_key: user.role_assignment

# Requirement entity
id: REQ-019
title: Users can have up to 3 roles
status: open
relationships:
  - type: constrains
    from: REQ-019
    to: FACT-USER-ROLE
  - type: requires_property
    from: REQ-019
    to: FACT-LIMIT-3
```

See `resources/fact-lanes.md` for the full strict vs observation lane comparison.

## Fact vs Flag

Use `flag` for runtime or config gates only. Feature flags, kill-switches, and deferred capabilities are valid `flag` entities.

Bugs, incidents, and workarounds belong in `fact` entities with `fact_kind: observation` or `meta`. These fact kinds are excluded from contradiction inference, making them appropriate for non-blocking evidence.

Anti-example: do not create a `flag` named `BUG-123` to track a defect. Create a `fact` with `fact_kind: observation` instead.

## Create-Before-Link

Always confirm or create endpoint entities before linking them. Query target IDs with `kb_query` first. If an endpoint does not exist, create it with `kb_upsert` before creating the relationship. Creating relationships to non-existent entities produces dangling references that `kb_check` will flag.

## Sequential Upserts

Never fire `kb_upsert` calls in parallel. Execute them sequentially to avoid lock contention and ensure deterministic ordering. This is especially important when creating chains of related entities.

## Targeted and Final Checks

Run `kb_check` with specific rules during iteration for fast feedback. For example, use `rules: ["required-fields", "no-dangling-refs"]` after small changes. Run a full `kb_check` without rule filters before declaring work complete.

## Domain Contradictions and Evolution

The `domain-contradictions` rule detects conflicts between strict-lane facts linked to requirements. When a contradiction is found, the supported escape hatch is `supersedes`: create a new requirement that supersedes the old one, then link the new requirement to updated facts.

Use `kb_model_requirement` for automated strict-fact modeling. It generates the subject and property_value facts, links them via `constrains` and `requires_property`, and handles low-confidence downgrades to `observation` facts automatically.

## Stale or Dirty KB Handling

Call `kb_status` when you suspect the branch KB is stale or when switching context. Report freshness findings to the user rather than relying on outdated KB context. If `kb_status` indicates a schema migration is needed, ask the user or operator to handle it outside the agent session.

## Anti-Patterns and Remediation

| Anti-Pattern | Problem | Remediation |
|-------------|---------|-------------|
| Reversed relationship direction | Traceability queries break | Verify direction against the relationship table above |
| Bug-as-flag | `flag` misused for defect tracking | Use `fact` with `fact_kind: observation` or `meta` |
| Parallel upserts | Lock contention and nondeterminism | Execute `kb_upsert` calls sequentially |
| Embedded scenarios in reqs | Violates canonical traceability chain | Create separate `req`, `scen`, and `test` entities |
| Missing `kb_check` | Undetected dangling refs and violations | Run targeted checks during work, full check at completion |
| Tags as multi-ID lookup | Tags are metadata, not identifiers | Use `kb_query` with explicit `id` values |
| `relates_to` for strict modeling | Loses contradiction safety | Use `constrains` and `requires_property` instead |

Before/after for reversed direction:

- Wrong: `relationships: [{ type: "implements", from: "REQ-001", to: "SYM-001" }]`
- Right: `relationships: [{ type: "implements", from: "SYM-001", to: "REQ-001" }]`

See `resources/workflows.md` for the golden-path discovery to validation sequence.
