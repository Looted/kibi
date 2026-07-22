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

Consult this skill before any Kibi knowledge base operation, on first interaction with a Kibi-enabled repo, after detecting stale or dirty KB status, and before performing mutations.

## Interface Selection

Use this capability state machine for every Kibi operation:

1. If Kibi MCP tools are positively visible and approved in the current host, use MCP.
2. Otherwise, in a trusted workspace, use the project-local CLI through a non-installing runner: `npx --no-install kibi ...` or `bunx --no-install kibi ...`.
3. If the project-local CLI is unavailable or too old for the dedicated route, stop and tell the operator to enable or install Kibi.
4. Never use a global fallback or an installing runner. Never probe or install packages as a side effect of selecting an interface.

Both interfaces execute the same operation catalog. Use the exact MCP names, dedicated CLI routes, input modes, effects, and Prolog requirements in `resources/operation-access.md`; do not invent a generic operation runner. Do not read or edit files inside `.kb/` directly through either interface.

CLI JSON mode accepts the MCP-shaped business input at `--input <file|->`. For example, the project-local mutation recipe is:

```bash
echo '{"type":"req","id":"REQ-001","properties":{"title":"Test","status":"open"}}' | npx --no-install kibi upsert --input -
```

The equivalent Bun runner is:

```bash
echo '{"query":"authentication","limit":10}' | bunx --no-install kibi search --input -
```

### Tool Name Prefixes

Kibi's canonical MCP names are `kb_search`, `kb_query`, `kb_upsert`, `kb_check`, and related `kb_*` tools. Some hosts add a server prefix when exposing tools to agents. In OpenCode, use the visible `kibi_kb_search`, `kibi_kb_query`, `kibi_kb_upsert`, and `kibi_kb_check` names when exact tool identifiers are required; they map to the same canonical MCP names.

## Discovery-First Workflow

Always discover before you mutate. Start with `kb_search` for exploratory discovery across metadata and markdown body text. Split broad queries into 1-3 focused probes. Review top hits for relevance before concluding the KB lacks knowledge.

Follow up with `kb_query` for exact lookups by `id`, `type`, `tags`, or `sourceFile`. Call `kb_status` to inspect branch attachment and freshness when stale context would affect decisions. Only after discovery and confirmation should you mutate.

## Release Versioning Workflow

Release preparation happens on `develop`:

1. Add human-readable changesets for publishable package changes.
2. Run `bun run version-packages` to consume changesets, update package versions and changelogs, and synchronize plugin manifests.
3. Review the generated package/dependency changes and run the release checks before committing.
4. Merge `develop` into `master`; publishing is performed by the master-branch CI workflow.

Never publish manually from an agent session, and never merge `master` back into `develop`.

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

## Symbol-First Traceability

Trace code through `symbol` entities, not inline legacy comments. Do not use legacy `// implements REQ-xxx` comments as the primary marker for new or modified code. If a symbol is new or its requirement ownership changes, create or update the `symbol` entity and add an `implements` relationship from the symbol to the requirement.

Use comments only as a temporary backward-compatibility fallback when the symbol manifest cannot be updated in the same task. Prefer durable symbol coordinates in `documentation/symbols.yaml` and `documentation/symbol-coordinates.yaml`, then link those symbols through MCP relationships.

```yaml
# Preferred traceability model
symbol:
  id: SYM-admin-billing-policy
  title: Admin billing policy check
  status: active
relationships:
  - type: implements
    from: SYM-admin-billing-policy
    to: REQ-ADMIN-BILLING-POLICY
```

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

### Granular fact examples for coherence checks

Model one semantic claim per strict `property_value` fact. Reusing the same `subject_key` and `property_key` lets `domain-contradictions` compare requirements mechanically.

Incoherent role-set example: `REQ-ROLE-SET-2` says the allowed user roles are exactly `user,admin`, while `REQ-ROLE-SET-3` says the same property is exactly `user,admin,superadmin`. Both constrain `FACT-USER-ROLES` and require different values for `user.roles.allowed_set`, so they cannot both be current.

```yaml
subject:
  id: FACT-USER-ROLES
  fact_kind: subject
  subject_key: user.roles

property_values:
  - id: FACT-USER-ROLES-ALLOWED-2
    fact_kind: property_value
    subject_key: user.roles
    property_key: user.roles.allowed_set
    operator: eq
    value_type: string
    value_string: user,admin
  - id: FACT-USER-ROLES-ALLOWED-3
    fact_kind: property_value
    subject_key: user.roles
    property_key: user.roles.allowed_set
    operator: eq
    value_type: string
    value_string: user,admin,superadmin

requirements:
  - id: REQ-ROLE-SET-2
    relationships:
      - { type: constrains, from: REQ-ROLE-SET-2, to: FACT-USER-ROLES }
      - { type: requires_property, from: REQ-ROLE-SET-2, to: FACT-USER-ROLES-ALLOWED-2 }
  - id: REQ-ROLE-SET-3
    relationships:
      - { type: constrains, from: REQ-ROLE-SET-3, to: FACT-USER-ROLES }
      - { type: requires_property, from: REQ-ROLE-SET-3, to: FACT-USER-ROLES-ALLOWED-3 }
```

Incoherent permission example: `REQ-ADMIN-CAN-MANAGE-BILLING` says `admin` can manage billing, while `REQ-ONLY-SUPERADMIN-MANAGES-BILLING` says the only allowed actor is `superadmin`. Model both against `billing.manage.allowed_actor` with `operator: eq` so the conflict is explicit.

```yaml
property_values:
  - id: FACT-BILLING-MANAGE-ACTOR-ADMIN
    fact_kind: property_value
    subject_key: billing.manage
    property_key: billing.manage.allowed_actor
    operator: eq
    value_type: string
    value_string: admin
  - id: FACT-BILLING-MANAGE-ACTOR-SUPERADMIN
    fact_kind: property_value
    subject_key: billing.manage
    property_key: billing.manage.allowed_actor
    operator: eq
    value_type: string
    value_string: superadmin
```

If a new requirement intentionally changes a value, create a replacement requirement and link the old requirement to the new one with `supersedes` instead of leaving two current contradictory requirements.

## Fact vs Flag

Use `flag` for runtime or config gates only. Feature flags, kill-switches, and deferred capabilities are valid `flag` entities.

Bugs, incidents, and workarounds belong in `fact` entities with `fact_kind: observation` or `meta`. These fact kinds are excluded from contradiction inference, making them appropriate for non-blocking evidence.

Anti-example: do not create a `flag` named `BUG-123` to track a defect. Create a `fact` with `fact_kind: observation` instead.

## Create-Before-Link

Always confirm or create endpoint entities before linking them. Query target IDs with `kb_query` first. If an endpoint does not exist, create it with `kb_upsert` before creating the relationship. Creating relationships to non-existent entities produces dangling references that `kb_check` will flag.

For `kb_upsert`, keep relationship rows anchored to the entity you are upserting: each row's `from` must equal the upserted entity ID. If you need a `SYM -> REQ` link, upsert the symbol endpoint first, then link that symbol to the requirement.

Keep symbol payloads minimal: include only the fields needed to identify the symbol, its status, and its source traceability. Put extra prose, examples, or audit notes in docs or evidence files instead of custom `kb_upsert.properties`; strict `kb_upsert.properties` rejects unknown fields.

When a generic `Query failed` appears, do not keep retrying the same payload. First call `kb_validate_upsert`, query or create the missing endpoints, reduce the payload to the minimum required fields, and retry once. If it still fails, report the blocker instead of looping.

## Small Behavior Fix Impact Evidence

For a behavior-changing source edit with no existing requirement, create a requirement for the corrected behavior. If no requirement exists, create one for the corrected behavior, then model strict facts from that requirement when the invariant is contradiction-sensitive.

Do not link facts directly to tests. Facts describe the invariant; requirements or scenarios are verified by executable tests. Use `REQ -> TEST` with `verified_by` or `TEST -> REQ` with `validates`, then link the requirement to facts with `constrains` and `requires_property`. Link the touched production symbol to the requirement with `implements` and to the test with `covered_by` when coverage evidence is needed.

Kibi operation writes do not automatically stage markdown evidence. When a staged hook requires impact evidence, ensure the repo's tracked documentation artifacts for the requirement, fact, test, symbol metadata, or coordinate refresh are authored and staged alongside the source change.

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
| Legacy implements comments | Comments are not durable queryable symbols | Create or update a `symbol` entity and link it to the requirement |
| Bug-as-flag | `flag` misused for defect tracking | Use `fact` with `fact_kind: observation` or `meta` |
| Parallel upserts | Lock contention and nondeterminism | Execute `kb_upsert` calls sequentially |
| Embedded scenarios in reqs | Violates canonical traceability chain | Create separate `req`, `scen`, and `test` entities |
| Missing `kb_check` | Undetected dangling refs and violations | Run targeted checks during work, full check at completion |
| Tags as multi-ID lookup | Tags are metadata, not identifiers | Use `kb_query` with explicit `id` values |
| `relates_to` for strict modeling | Loses contradiction safety | Use `constrains` and `requires_property` instead |
| `status: implemented` on requirements | Not a valid lifecycle status | Use a valid status such as `closed`, add an `implemented` tag, and link evidence instead |

Before/after for reversed direction:

- Wrong: `relationships: [{ type: "implements", from: "REQ-001", to: "SYM-001" }]`
- Right: `relationships: [{ type: "implements", from: "SYM-001", to: "REQ-001" }]`

See `resources/workflows.md` for the golden-path discovery to validation sequence.
