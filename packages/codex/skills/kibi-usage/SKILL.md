---
id: kibi-usage
name: Kibi Usage
description: Guides agents to use Kibi MCP, facts, relationships, and validation correctly
version: 1.0.1
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
  - resources/operation-access.md
---
# Kibi Usage

Consult this skill before Kibi knowledge base operations, on first interaction with a Kibi-enabled repo, after stale or dirty KB status is suspected, and before mutations.

## Interface Selection

Use this capability order for every Kibi operation:

1. If Kibi MCP tools are visible and approved in the current host, use MCP.
2. Otherwise, in a trusted workspace, use the project-local CLI through a non-installing runner: `npx --no-install kibi ...` or `bunx --no-install kibi ...`.
3. If the project-local CLI is unavailable or too old for the dedicated route, stop and tell the operator to enable or install Kibi.
4. Never use a global fallback or an installing runner. Never probe or install packages as a side effect of interface selection.

Use exact MCP tool names, dedicated CLI routes, input modes, effects, and Prolog requirements from the operation catalog. Do not invent a generic operation runner. Do not read or edit files inside `.kb` directly.

CLI JSON mode accepts MCP-shaped business input at `--input <file|->`.

```bash
echo '{"type":"req","id":"REQ-001","properties":{"title":"Test","status":"open"}}' | npx --no-install kibi upsert --input -
```

```bash
echo '{"query":"authentication","limit":10}' | bunx --no-install kibi search --input -
```

## MCP Tool Names

Kibi canonical MCP names include `kb_search`, `kb_query`, `kb_upsert`, `kb_check`, `kb_status`, `kb_validate_upsert`, and related `kb_*` tools. Some hosts expose prefixed identifiers. Use the visible Kibi MCP tool identifiers and map them back to canonical operations before reasoning about behavior.

## Discovery First

Always discover before mutation. Start exploratory work with `kb_search` across metadata and markdown body text. Split broad queries into one to three focused probes and review top hits before concluding knowledge is absent.

Use `kb_query` for exact lookups by `id`, `type`, `tags`, or `sourceFile`. Use `kb_status` when branch attachment, freshness, or stale context could affect the decision. Mutate only after discovery confirms the target state.

## Approval Boundaries

Do not perform Kibi mutations unless the current task calls for knowledge-base changes or the user explicitly asks for them. Discovery and validation are acceptable when needed to understand impact, freshness, traceability, or existing requirements.

If schema migration, installation, upgrade, publishing, or repository-wide release operation is required, stop and ask the user or operator to handle it outside the agent session. Never publish manually from an agent session. Never use Kibi interface selection to install packages, change dependency manifests, or bypass sandbox and approval boundaries.

## Release Versioning

Release preparation happens on `develop`:

1. Add human-readable changesets for publishable package changes.
2. Run `bun run version-packages` to consume changesets, update package versions and changelogs, and synchronize plugin manifests.
3. Review generated package and dependency changes, then run release checks before committing.
4. Merge `develop` into `master`; publishing is performed by the master-branch CI workflow.

Never publish manually from an agent session, and never merge `master` back into `develop`.

## Relationship Directions

Relationship direction is fixed and semantic. Reversed links break traceability queries and validation.

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

Before/after for reversed direction:

- Wrong: `relationships: [{ type: "implements", from: "REQ-001", to: "SYM-001" }]`
- Right: `relationships: [{ type: "implements", from: "SYM-001", to: "REQ-001" }]`

## Source-File Traceability

Preserve source-file traceability whenever creating or updating requirements, facts, scenarios, tests, or symbols. Prefer durable `sourceFile` references and symbol coordinates that point to tracked repository files. For code ownership, create or update `symbol` entities and link them to requirements with `implements`; link symbols to tests with `covered_by` when coverage evidence is needed.

Do not use legacy `// implements REQ-xxx` comments as the primary marker for new or modified code. Use comments only as a temporary compatibility fallback when symbol metadata cannot be updated in the same task.

Preferred traceability model:

```yaml
symbol:
  id: SYM-admin-billing-policy
  title: Admin billing policy check
  status: active
  sourceFile: src/admin/billing.ts
relationships:
  - type: implements
    from: SYM-admin-billing-policy
    to: REQ-ADMIN-BILLING-POLICY
```

## Strict Fact Lane

Normative requirements that must participate in contradiction blocking use the strict fact lane. Create a `fact_kind: subject` fact and link it from the requirement via `constrains`. Create a `fact_kind: property_value` fact and link it via `requires_property`.

```yaml
id: FACT-USER-ROLE
fact_kind: subject
subject_key: user.role_assignment
```

```yaml
id: REQ-019
relationships:
  - type: constrains
    from: REQ-019
    to: FACT-USER-ROLE
  - type: requires_property
    from: REQ-019
    to: FACT-LIMIT-3
```

Model one semantic claim per strict `property_value` fact. Reusing the same `subject_key` and `property_key` lets `domain-contradictions` compare requirements mechanically. If a new requirement intentionally changes a value, create a replacement requirement and link the old requirement to the new one with `supersedes` instead of leaving two current contradictory requirements.

Use `kb_model_requirement` for automated strict-fact modeling when available. It generates subject and property_value facts, links them with `constrains` and `requires_property`, and handles low-confidence downgrades to observation facts automatically.

## Fact vs Flag

Use `flag` only for runtime or config gates such as feature flags, kill-switches, and deferred capabilities.

Bugs, incidents, and workarounds belong in `fact` entities with `fact_kind: observation` or `meta`. These fact kinds are excluded from contradiction inference, making them appropriate for non-blocking evidence. Do not create a `flag` named like a bug to track a defect.

## Create Before Link

Always confirm or create endpoint entities before linking them. Query target IDs with `kb_query` first. If an endpoint does not exist, create it with `kb_upsert` before creating the relationship. Relationships to missing entities produce dangling references that `kb_check` will flag.

For `kb_upsert`, keep relationship rows anchored to the entity being upserted: each row's `from` must equal that entity ID. If you need a `SYM -> REQ` link, upsert the symbol endpoint first, then link that symbol to the requirement.

Keep symbol payloads minimal: include only fields needed to identify the symbol, status, and source traceability. Put extra prose, examples, or audit notes in documentation or evidence artifacts instead of custom `kb_upsert.properties`; strict `kb_upsert.properties` rejects unknown fields.

When a generic `Query failed` appears, do not keep retrying the same payload. First call `kb_validate_upsert`, query or create missing endpoints, reduce the payload to required fields, and retry once. If it still fails, report the blocker.

## Behavior Fix Evidence

For a behavior-changing source edit with no existing requirement, create a requirement for the corrected behavior. Model strict facts from that requirement when the invariant is contradiction-sensitive.

Do not link facts directly to tests. Facts describe invariants; requirements or scenarios are verified by executable tests. Use `REQ -> TEST` with `verified_by` or `TEST -> REQ` with `validates`, then link the requirement to facts with `constrains` and `requires_property`. Link touched production symbols to requirements with `implements` and to tests with `covered_by` when coverage evidence is needed.

Kibi operation writes do not automatically stage markdown evidence. When a staged hook requires impact evidence, ensure tracked documentation artifacts for requirements, facts, tests, symbol metadata, or coordinate refreshes are authored and staged alongside source changes.

## Sequential Upserts

Never fire `kb_upsert` calls in parallel. Execute them sequentially to avoid lock contention and ensure deterministic ordering, especially when creating chains of related entities.

## Checks

Run `kb_check` with specific rules during iteration for fast feedback, such as `rules: ["required-fields", "no-dangling-refs"]` after small changes. Run a full `kb_check` without rule filters before declaring Kibi work complete.

The `domain-contradictions` rule detects conflicts between strict-lane facts linked to requirements. When a contradiction is found, the supported escape hatch is `supersedes`: create a new requirement that supersedes the old one, then link the new requirement to updated facts.

## Stale or Dirty KB Handling

Call `kb_status` when branch KB context may be stale or after switching context. Report freshness findings to the user rather than relying on outdated KB context. If `kb_status` indicates a schema migration is needed, ask the user or operator to handle it outside the agent session.

## Anti-Patterns

| Anti-Pattern | Problem | Remediation |
|-------------|---------|-------------|
| Reversed relationship direction | Traceability queries break | Verify direction against the relationship table above |
| Legacy implements comments | Comments are not durable queryable symbols | Create or update a `symbol` entity and link it to the requirement |
| Bug-as-flag | `flag` misused for defect tracking | Use `fact` with `fact_kind: observation` or `meta` |
| Parallel upserts | Lock contention and nondeterminism | Execute `kb_upsert` calls sequentially |
| Embedded scenarios in reqs | Violates canonical traceability chain | Create separate `req`, `scen`, and `test` entities |
| Missing `kb_check` | Undetected dangling refs and violations | Run targeted checks during work, full check at completion |
| Tags as multi-ID lookup | Tags are metadata, not identifiers | Use `kb_query` with explicit `id` values |
| `relates_to` for strict modeling | Loses contradiction safety | Use `constrains` and `requires_property` instead |
| `status: implemented` on requirements | Not a valid lifecycle status | Use a valid status such as `closed`, add an `implemented` tag, and link evidence instead |

## Public Training Guidance

For discovery-exact-lookup tasks, discover the relevant requirement before exact source-linked lookup and use only the public Kibi MCP surface.

For safe-mutation-direction tasks, discover existing entities first, then apply the requested relationship in the supported direction using only the public Kibi MCP surface.

For fact-predicate-modeling tasks, model normative claims through the strict fact or predicate workflow using only the public Kibi MCP surface.

For validation-recovery tasks, recover from malformed mutations with validation diagnostics using only the public Kibi MCP surface.