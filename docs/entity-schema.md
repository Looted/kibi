# Entity Schema Documentation

This document describes the entity and relationship schema for the Kibi Knowledge Base. It covers all supported entity types, their properties, relationship types, and provides frontmatter examples for each entity and relationship.

---

## Entity Types

Kibi intentionally supports **eight core entity types**, organized into two logical groups:

### Common Authoring Entities (Standard Workflow)
| Type | Description |
|------|-------------|
| req | Software requirement specifying functionality or constraints |
| scenario | BDD scenario describing user behavior (Given/When/Then) |
| test | Unit, integration, or e2e test case |
| fact | Atomic domain fact; includes strict lanes and observation/meta notes |

### Supporting & System Entities (Context & Infrastructure)
| Type | Description |
|------|-------------|
| adr | Architecture Decision Record documenting technical choices |
| flag | Runtime or config gate (feature flag, kill-switch, deferred capability) |
| event | Domain or system event published/consumed by components |
| symbol | Abstract code symbol (function, class, module) - language-agnostic |


---

## Entity Choice: When to Use Each Type

This section provides guidance on selecting the appropriate entity type for your documentation needs.

### Decision Table

| What you are documenting | Entity Type | Notes |
|--------------------------|-------------|-------|
| Intended or corrected behavior | `req` | Requirements specify what the system should do |
| Bug, incident, or workaround | `fact` (observation/meta) | Use `fact_kind: observation` or `meta` for non-blocking evidence |
| Runtime/config gate controlling feature access | `flag` | Feature flags, kill-switches, deferred capabilities |
| Executable verification or reproduction | `test` | Unit, integration, or e2e tests |
| Technical decision or tradeoff rationale | `adr` | Architecture Decision Records |

### Important Rules

**Do NOT create a `flag` for bugs or workarounds unless there is an actual runtime/config gate.** Use `fact` with `fact_kind: observation` or `meta` instead.

**When a bug is mitigated by a feature gate:** Create TWO records - a `fact` describing the issue and a `flag` representing the gate. Link them with `relates_to` since no typed relationship exists for this case.

### Canonical Mapping Summary

- `flag` = Runtime/config gate (includes kill-switches, deferred capabilities) - NOT for bug records
- `fact` (observation/meta) = Bug records, incident notes, workarounds
- `req` = Intended/corrected behavior
- `test` = Executable verification/reproduction
- `adr` = Durable design rationale
---

### Common Properties (All Entities)

| Property     | Required | Type           | Description                                      |
|--------------|----------|----------------|--------------------------------------------------|
| id           | Yes      | string         | Unique identifier (SHA256 or explicit frontmatter)|
| title        | Yes      | string         | Short summary/name                               |
| status       | Yes      | string         | Entity status (see below for values)             |
| created_at   | Yes      | ISO 8601       | Creation timestamp                               |
| updated_at   | Yes      | ISO 8601       | Last update timestamp                            |
| source       | Yes      | string         | The entity's own file (workspace-relative). Always compiled from the file path; Kibi ignores an authored `source` frontmatter field and never writes one, so `kb_upsert` cannot set it. A leftover authored value must name an existing workspace path (`#anchor` allowed), an existing entity id, or an http(s) URL, or `kibi check` blocks it under `source-path-dangling`; `kibi migrate` (`source_path_rewrite`) removes values that name the entity's own file or nothing, and rewrites pre-canonical paths to another moved knowledge file |
| tags[]       | No       | array[string]  | Array of metadata/search tags only               |
| owner        | No       | string         | Owner/assignee                                   |
| priority     | No       | string         | Priority level (must, should, could)             |
| severity     | No       | string         | Severity level                                   |
| links[]      | No       | array[string]  | Array of URLs                                    |
| text_ref     | No       | string         | Pointer to Markdown/doc blob                     |
| origin       | No       | object         | Provenance: who authored the entity and on what authority (see [Entity origin](#entity-origin)). Valid on every type; optional on symbols |

### Entity origin

`origin` records who authored an entity (KB schema 6 and later):

| Field         | Required | Type     | Description |
|---------------|----------|----------|-------------|
| `kind`        | Yes      | string   | `human`, `agent`, `migration` (backfilled by `kibi migrate`) or `import` |
| `ref`         | No       | string   | Where the content came from: URL, document path, ticket, commit or conversation id |
| `approved_by` | No       | string   | The person who reviewed and approved the entity's content. For an exception requirement this corroborates the requirement-level `approved_by` |
| `recorded_at` | No       | ISO 8601 | When the provenance was recorded |

```yaml
origin:
  kind: agent
  ref: https://tracker.example/ISSUE-42
  approved_by: Dana Lee
  recorded_at: '2026-10-01T09:30:00Z'
```

How `kb_upsert` (and `kibi upsert`) sets it:

- A new entity written without `origin` is recorded as `{kind: agent, recorded_at: <write time>}`; `kb_upsert` is the agent write path, so a human or an import says so explicitly.
- Updating an entity without `origin` never changes the stored origin. An entity that has no origin (written before schema 6 or by hand) stays without one; editing it does not make the editor its author.
- A supplied `origin` is written as given (unknown kinds and unknown fields are rejected); when it has no `recorded_at`, the write time is filled in.
- `kibi migrate` (schema 5 to 6) stamps `{kind: migration, ref: "kibi migrate v5->v6", recorded_at}` on every authored entity without an origin.

Kibi cannot verify a person's approval. The advisory checks `exception-unapproved`, `exception-approval-self-attested` and `agent-requirement-unapproved` make missing or agent-recorded approvals visible so a human can confirm them (see `docs/cli-reference.md`).

---

### Entity Type Details & Example Frontmatter

#### Requirement (`req`)

| Property     | Required | Type           | Description                                      |
|--------------|----------|----------------|--------------------------------------------------|
| id           | Yes      | string         | Unique identifier                                |
| title        | Yes      | string         | Requirement summary                              |
| status       | Yes      | string         | open, in_progress, closed, deprecated. ADR vocabulary such as `accepted` compiles but is not a requirement status: it silently removes the requirement from the proof ladder, and `kibi check` reports it under `req-status-vocabulary`. A superseded requirement (the target of a `supersedes` link from its successor) must be `closed`; `kibi check` blocks an open one under `superseded-requirement-open`. |
| created_at   | Yes      | ISO 8601       | Creation timestamp                               |
| updated_at   | Yes      | ISO 8601       | Last update timestamp                            |
| source       | Yes      | string         | Provenance                                       |
| tags[]       | No       | array[string]  | Tags                                             |
| owner        | No       | string         | Owner/assignee                                   |
| priority     | No       | string         | must, should, could                              |
| severity     | No       | string         | Severity level                                   |
| links[]      | No       | array[string]  | URLs or entity IDs (for relationships)           |
| text_ref     | No       | string         | Independent code/doc evidence pointer            |
| proof_exempt | No       | boolean        | Marks a current requirement as intentionally outside E2E-proof scope. Requires `proof_exempt_reason`; coverage reports the requirement `not_applicable` with that reason |
| proof_exempt_reason | No | string        | Required when `proof_exempt` is true — the reviewable justification surfaced in coverage rows |
| approved_by  | No       | string         | Exception requirements only: the human who approved the exception. An exception that `exempts` a requirement makes its specified success scenarios feasible only when `approved_by` is non-empty; without it the advisory `exception-unapproved` check reports the exception |
| approval_ref | No       | string         | Optional reference to the exception's approval record (ticket, ADR or review link). When an agent recorded the exception (`origin.kind: agent`), the advisory `exception-approval-self-attested` check asks for `approval_ref` and `origin.approved_by` |
| rationale    | No       | string         | Why the requirement exists, in one or two sentences from whoever stated the intent. Explanation only, never part of the checked meaning. The advisory `requirement-rationale-missing` check asks human- and agent-authored requirements for it unless the body has a `## Rationale` or `## Why` section or an ADR is linked |
| exempts_claims[] | No   | array[string]  | Exception requirements only: claim keys (`CLAIM-...`) of the exempted requirement's clauses this exception waives. Absent, it waives the whole requirement; present, only constraints grounded by facts carrying a listed `claim_key`. The canonical `exception-claim-keys` check requires every key to be a claim of a requirement it `exempts` |
| semantic_text | No      | string         | Requirement-only normalized authored prose that anchors semantic byte spans |
| logic_claims | No       | array[string]  | Requirement-only manifest of stable atomic claim keys |
| semantic_clauses | No | array[string] | Reviewed atomic decomposition override used against the exact semantic source |
| semantic_inventory_version | No | string | `kibi.semantic-inventory.v1` for source-bound ledgers |
| semantic_source_field | No | string | `semantic_text`, `text_ref`, or `title`, identifying the field that owns ledger byte spans; new authored requirements prefer `semantic_text` |
| semantic_source_hash | No | string | SHA-256 of the exact semantic source text |
| semantic_inventory | No | array[object] | Proposition ledger with exact claim text, UTF-8 byte span, role, status, and optional semantic key |

**Canonical Example: REQ + SCEN + TEST (Golden Path)**

```yaml
# .kb/requirements/REQ-auth-login.md
---
id: REQ-auth-login
title: User authentication
status: open
created_at: 2026-03-10T10:00:00Z
updated_at: 2026-03-10T10:00:00Z
source: .kb/requirements/REQ-auth-login.md
links:
  - type: specified_by
    target: SCEN-auth-login-success
---

# .kb/scenarios/SCEN-auth-login-success.md
---
id: SCEN-auth-login-success
title: Login with valid credentials
status: active
created_at: 2026-03-10T10:01:00Z
updated_at: 2026-03-10T10:01:00Z
source: .kb/scenarios/SCEN-auth-login-success.md
---

# .kb/tests/TEST-auth-login-success.md
---
id: TEST-auth-login-success
title: Login test
status: passing
created_at: 2026-03-10T10:02:00Z
updated_at: 2026-03-10T10:02:00Z
source: .kb/tests/TEST-auth-login-success.md
links:
  - type: validates
    target: SCEN-auth-login-success
---
```

**Generic Link Shorthand:**

```yaml
links:
  - ADR-session-token-storage
  - FACT-auth-session-ttl
```

Plain string Markdown `links` entries are imported as generic `relates_to`
relationships. Use typed link objects or relationship rows when the semantic
relationship matters.

**Relationship Rows Example:**

```yaml
# Relationship: REQ-auth-login specified_by SCEN-auth-login-success
relationship:
  type: specified_by
  source: REQ-auth-login
  target: SCEN-auth-login-success
  created_at: 2026-03-10T10:03:00Z
  created_by: analyst
  source: .kb/requirements/REQ-auth-login.md
---
# Relationship: REQ-auth-login verified_by TEST-auth-login-success
relationship:
  type: verified_by
  source: REQ-auth-login
  target: TEST-auth-login-success
  created_at: 2026-03-10T10:04:00Z
  created_by: qa
  source: .kb/requirements/REQ-auth-login.md
```

> **Rule:** Never embed scenarios or tests inside requirement records. Always create separate files for each entity and link them with explicit typed `links` entries or relationship rows (`specified_by`, `verified_by`). Plain string `links` are generic `relates_to` only.

**Strict Fact Modeling (Normative Lane):**

- Preserve readable requirement prose, but decompose the entire assertive body into atomic propositions with `kb_semantic_advisor`. Context-only rationale, examples, and subjective commentary remain in the inventory as `nonlogical` and do not enter `logic_claims`.
- For a current requirement write, persist the receipt's `inventory_contract` as `semantic_inventory_version`, `semantic_source_field`, and `semantic_source_hash`. Ledger spans are UTF-8 byte offsets into that exact field; the advisor canonicalizes repeated identical normalized claims to one proposition at the first source occurrence, while duplicate keys/spans in a submitted ledger, source drift, and silent omission are rejected before mutation.
- Store exactly all returned assertive keys in the requirement `logic_claims` manifest. Each `modeled` entry must resolve through exactly one `requires_property`, `requires_predicate`, or `requires_rule` edge to a fact carrying the same `claim_key`; explicit `ambiguous`, `ontology_gap`, or `missing` entries remain ingestible but unresolved.
- `logic-coverage` checks manifest-to-ground-fact correspondence and is enabled by default. Requirements without manifests remain a gradual-backfill case; quality diagnostics identify every current requirement with this debt, while the default rule prevents explicitly modeled manifests from drifting.

- New contradiction-sensitive requirements should use the strict fact lane:
  - one `fact_kind: subject` fact linked via `constrains`
  - one `fact_kind: property_value` fact linked via `requires_property`
- For v1, the supported evolution path is append-only: create a new requirement and link it to the prior one with `supersedes`.
- Automated modeling via `kb_model_requirement` can produce deterministic write plans. `/kibi-bootstrap` returns `kibi.bootstrap-plan.v1`; bootstrap writes require a user-facing preview and explicit approval before calling `kb_apply_plan`.
- **Low-confidence downgrade:** If confidence is < 0.7, requirements are downgraded to `observation` facts to avoid false-positive contradictions.
- Use `observation` and `meta` facts for runtime evidence, historical notes, and governance context that should not participate in contradiction blocking.

**Canonical Contradiction-Safe Example:**

```yaml
# .kb/facts/FACT-USER-ROLE.md
---
id: FACT-USER-ROLE
title: User Role Assignment
status: active
created_at: 2026-03-24T00:00:00Z
updated_at: 2026-03-24T00:00:00Z
source: .kb/facts/FACT-USER-ROLE.md
fact_kind: subject
subject_key: user.role_assignment
---

# .kb/facts/FACT-LIMIT-3.md
---
id: FACT-LIMIT-3
title: Maximum of Three
status: active
created_at: 2026-03-24T00:00:00Z
updated_at: 2026-03-24T00:00:00Z
source: .kb/facts/FACT-LIMIT-3.md
fact_kind: property_value
subject_key: user.role_assignment
property_key: max_roles
operator: lte
value_type: int
value_int: 3
---

# .kb/requirements/REQ-user-role-limits.md
---
id: REQ-user-role-limits
title: Users can now have 3 roles
status: open
created_at: 2026-02-20T13:06:00Z
updated_at: 2026-03-24T00:00:00Z
source: .kb/requirements/REQ-user-role-limits.md
links:
  - type: constrains
    target: FACT-USER-ROLE
  - type: requires_property
    target: FACT-LIMIT-3
  - type: supersedes
    target: REQ-user-role-assignment
---
```
```

**Schema Migration:**

Older KBs can be upgraded to the latest schema using the `migrate` command. This ensures all entities are compatible with the latest contradiction and validation rules.

```bash
# Check if migration is required
kibi status

# Perform the migration
kibi migrate --yes
```

Schema version 2 introduces strict symbol granularity. During migration, existing coarse file/module links that can be explained by older ontology data are marked with `granularity_reason: legacy-link`; new or updated symbol traceability should target the narrow function, class method (`ClassName.methodName`), class, or other behavioral symbol whenever one exists. Interfaces, type aliases, and enums are `type-shape` symbols; they describe code shape and do not by themselves block a coarse behavioral link.

**Invalid Example (Prohibited):**

```yaml
# WRONG - embedded scenario
---
id: REQ-auth-login
title: User authentication
scenarios:
  - given: user is on login page
    when: they enter valid credentials
    then: they are logged in
---
```

#### Scenario (`scenario`)

| Property     | Required | Type           | Description                                      |
|--------------|----------|----------------|--------------------------------------------------|
| id           | Yes      | string         | Unique identifier                                |
| title        | Yes      | string         | Scenario summary                                 |
| status       | Yes      | string         | draft, active, deprecated                        |
| created_at   | Yes      | ISO 8601       | Creation timestamp                               |
| updated_at   | Yes      | ISO 8601       | Last update timestamp                            |
| source       | Yes      | string         | Provenance                                       |
| tags[]       | No       | array[string]  | Tags                                             |
| owner        | No       | string         | Owner/assignee                                   |
| priority     | No       | string         | Priority level                                   |
| severity     | No       | string         | Severity level                                   |
| links[]      | No       | array[string]  | URLs                                             |
| text_ref     | No       | string         | Markdown/doc pointer                             |
| expects      | No       | enum           | Intended outcome: `success`, `rejection` or `error` |

A scenario that sets `expects: success` and links the values its outcome depends on with `assumes` (scenario → `property_value` fact) is checked against current requirements by the canonical `scenario-feasibility` rule, through their `requires_property` facts and their typed `requires_rule` rules alike. A rule restricting an action ("checkout may happen only when the cart total is positive") governs the scenarios that perform it: those `specified_by` the requirement, or that assume a predicate fact naming the action. A requirement constraint only applies inside the validity window (`valid_from`/`valid_to`) of the fact that grounds it, and a scoped one only in its scope. When a current requirement forbids an assumed value (for example it requires `client.call_quota.remaining > 0` and the scenario assumes `= 0`), or several assumptions can only hold together with a value the requirements forbid (it requires `<= 5` and the scenario assumes `>= 5` and `!= 5`), `kb_check` reports the scenario, the requirements and the facts involved, and every requirement the scenario specifies gets the `infeasible_scenario` proof gap. Reuse the requirement's `subject_key` and `property_key` in the assumption fact: a differently named property is not compared, and no violation is not proof the scenario is feasible. Scenarios that expect `rejection` or `error` are not checked.

To allow an intended exception without weakening the rule, record a human-approved exception requirement that `exempts` the base requirement, is `specified_by` the scenario, and sets `approved_by` (optionally `approval_ref`). The base requirement stays current and unchanged, and the exception covers only the scenarios it specifies. An exception without `approved_by` does not exempt anything; the violation then says the exception is not approved. To waive one clause of a multi-clause requirement, list that clause's claim key in `exempts_claims`: the other clauses still govern the scenario.

A success scenario whose feasibility cannot be decided (it assumes nothing, its assumptions contradict each other, it assumes a property no current requirement governing it constrains, an assumption's type, unit or operator cannot be compared with the requirement's, the governing requirements admit no common value, the assumptions neither satisfy nor refute a governing rule's conditions, or it conflicts only with constraints whose validity window may or may not cover its time) is reported by the advisory `scenario-feasibility-unknown` rule and the `unknown_scenario_feasibility` proof advisory; it is never counted as feasible.

**Example:**
```yaml
---
id: SCEN-auth-login-success
title: Sample scenario SCEN-auth-login-success
status: active
created_at: 2026-02-17T13:00:00Z
updated_at: 2026-02-17T13:00:00Z
source: https://example.com/fixtures/scenarios/SCEN-auth-login-success
tags:
  - sample
---
```

#### Test (`test`)

| Property     | Required | Type           | Description                                      |
|--------------|----------|----------------|--------------------------------------------------|
| id           | Yes      | string         | Unique identifier                                |
| title        | Yes      | string         | Test summary                                     |
| status       | Yes      | string         | passing, failing, skipped, pending               |
| created_at   | Yes      | ISO 8601       | Creation timestamp                               |
| updated_at   | Yes      | ISO 8601       | Last update timestamp                            |
| source       | Yes      | string         | Provenance                                       |
| tags[]       | No       | array[string]  | Tags                                             |
| owner        | No       | string         | Owner/assignee                                   |
| priority     | No       | string         | Priority level                                   |
| severity     | No       | string         | Severity level                                   |
| links[]      | No       | array[string]  | URLs                                             |
| text_ref     | No       | string         | Markdown/doc pointer                             |
| verification_scope | No | enum           | `unit`, `integration`, or `end_to_end`           |
| verification_perspective | No | enum     | `internal` or `consumer`                         |
| proof_contract | No | object | `kibi.proof-contract.v1`: explicit `required_proofs` obligations (`symbol_id` + ecosystem-neutral `target`) executed by one configured integration; requires `verification_scope` |
| proof_bindings | No | array[object] | Optional native-runner bindings (`native_id`, aliases, source coordinates) for proof obligations; provenance metadata, never a contract replacement |
| proof_receipts | No | array[object] | Append-only proof-receipt execution history; evidence is `kibi.proof-receipt.v1`; requires `verification_scope` |

`proof_receipts` is append-only for authors: never remove or rewrite existing entries, and include the full history when authoring a test file directly. Only the engine shortens a history: `kibi prove` compacts it on ingest to the receipts that can still decide proof, and `kibi proof compact` and `kibi proof prune` are the maintenance commands. Receipts are engine-derived from `kibi.proof-run.v1` producer artifacts — see [proving requirements](proving-requirements.md) for contracts, the `kibi prove` workflow, and the artifact reference.

`tags` remain metadata only. They do not alias or replace typed verification fields.

Coverage-depth reporting uses typed verification fields before legacy hints. A test with `status: passing` and `verification_scope: end_to_end` supplies structural depth evidence even if it has no `e2e` tag; tag or path heuristics are only fallback evidence for older records. Durable status never supplies conservative proof evidence by itself. Requirement coverage rows can therefore report deterministic depth labels without changing the underlying covered/uncovered decision:

- `direct_passing_e2e` — the requirement is directly linked to a passing e2e test.
- `scenario_passing_e2e` — a linked scenario is validated by a passing e2e test.
- `unit_only` — passing evidence exists, but only at unit scope.
- `open_or_nonpassing_tests_only` — tests exist but none are passing.
- `scenario_only_no_test` — scenarios exist without executable test evidence.
- `no_test_evidence` — no scenario or test evidence is linked.

Conservative requirement proof uses receipt history instead. Each `kibi.proof-receipt.v1` binds `receipt_id`, `test_id`, typed `scope`, `outcome`, `code_snapshot`, `environment_hash`, `started_at`, `finished_at`, `artifact_digest`, `contract_hash`, execution `fingerprint`, `integration_id`, `producer`, and `command_argv`. History is capped at 50 entries, receipt IDs are unique, finish times increase strictly, and existing entries cannot be removed, changed, or reordered through upsert or incremental sync. Proof accepts only the newest receipt for the deterministic current workspace snapshot when it passed, is not future-dated, and is at most seven days old. Missing, wrong-snapshot, stale, failed, malformed, or future-dated evidence produces explicit proof gaps.

`kibi.workspace-snapshot.v2` hashes current versionable code plus requirement, scenario, fact, test-contract, and symbol-manifest inputs. It excludes `.kb/` derived runtime trees, release changesets, general `docs/`, and the `proof_receipts` frontmatter field inside every tracked Markdown file, preventing a receipt from invalidating its own code hash without hiding changes to the surrounding test contract. A receipt bound to an older snapshot hash is not proof of the current snapshot. Rerun `kibi prove` so the receipt matches the snapshot the branch is on now.

#### Check output diagnostics

`kibi check`, MCP `kb_check`, staged impact checks, and OpenCode scheduled checks use a two-lane output contract rather than modeling audit findings as new entity types:

- `violations[]` is the hard correctness lane. Graph, schema, contradiction, query-plan, and staged blocking failures stay here and continue to fail checks.
- `qualityDiagnostics[]` is the audit-quality lane. Modeling reviews, coverage-depth reviews, broad requirement fanout, duplicate coordinates, symbol fanout, status misuse, and strict-fact modeling suggestions are advisory unless a diagnostic explicitly sets `blocking: true` or `severity: "error"`.

The public severity values are `error`, `warning`, `review`, and `info`. `review` and `info` do not fail checks by default; `warning` is also non-blocking unless paired with `blocking: true`. Integrations should inspect both `severity` and `blocking` instead of treating every diagnostic-like record as a failure.

**Example:**
```yaml
---
id: TEST-auth-login-success
title: Sample test TEST-auth-login-success
status: passing
created_at: 2026-02-17T13:00:00Z
updated_at: 2026-02-17T13:00:00Z
source: https://example.com/fixtures/tests/TEST-auth-login-success
tags:
  - sample
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-auth-login-success
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-TEST-auth-login-success-20260217T1305
    test_id: TEST-auth-login-success
    scope: end_to_end
    outcome: passed
    code_snapshot: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    environment_hash: bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
    started_at: 2026-02-17T13:00:00Z
    finished_at: 2026-02-17T13:05:00Z
    artifact_digest: cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc
    contract_hash: dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd
    fingerprint: eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
    fingerprint_components:
      contract: 111111111111111111111111111111111111111111111111111111111111111a
      integration: 222222222222222222222222222222222222222222222222222222222222222a
      command: 333333333333333333333333333333333333333333333333333333333333333a
      bindings: 4444444444444444444444444444444444444444444444444444444444444444a
      producer: 5555555555555555555555555555555555555555555555555555555555555555a
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv: [node, scripts/run-proof-producer.mjs]
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-test-auth-login-success
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
---
```

See `docs/examples/test-verification-fields.md` for a complete example using both typed fields.

#### ADR (`adr`)

| Property     | Required | Type           | Description                                      |
|--------------|----------|----------------|--------------------------------------------------|
| id           | Yes      | string         | Unique identifier                                |
| title        | Yes      | string         | ADR summary                                      |
| status       | Yes      | string         | proposed, accepted, deprecated, superseded       |
| created_at   | Yes      | ISO 8601       | Creation timestamp                               |
| updated_at   | Yes      | ISO 8601       | Last update timestamp                            |
| source       | Yes      | string         | Provenance                                       |
| tags[]       | No       | array[string]  | Tags                                             |
| owner        | No       | string         | Owner/assignee                                   |
| priority     | No       | string         | Priority level                                   |
| severity     | No       | string         | Severity level                                   |
| links[]      | No       | array[string]  | URLs                                             |
| text_ref     | No       | string         | Markdown/doc pointer                             |

**Example:**
```yaml
---
id: ADR-session-token-storage
title: Sample ADR ADR-session-token-storage
status: accepted
created_at: 2026-02-17T13:00:00Z
updated_at: 2026-02-17T13:00:00Z
source: https://example.com/fixtures/adrs/ADR-session-token-storage
tags:
  - architecture
---
```

#### Flag (`flag`)

| Property     | Required | Type           | Description                                      |
|--------------|----------|----------------|--------------------------------------------------|
| id           | Yes      | string         | Unique identifier                                |
| title        | Yes      | string         | Flag summary                                     |
| status       | Yes      | string         | active, inactive, deprecated                     |
| created_at   | Yes      | ISO 8601       | Creation timestamp                               |
| updated_at   | Yes      | ISO 8601       | Last update timestamp                            |
| source       | Yes      | string         | Provenance                                       |
| tags[]       | No       | array[string]  | Tags                                             |
| owner        | No       | string         | Owner/assignee                                   |
| priority     | No       | string         | Priority level                                   |
| severity     | No       | string         | Severity level                                   |
| links[]      | No       | array[string]  | URLs                                             |
| text_ref     | No       | string         | Markdown/doc pointer                             |

**Example:**
```yaml
---
id: FLAG-login-rate-limit
title: Sample flag FLAG-login-rate-limit
status: active
created_at: 2026-02-17T13:00:00Z
updated_at: 2026-02-17T13:00:00Z
source: https://example.com/fixtures/flags/FLAG-login-rate-limit
tags:
  - rollout
---
```

#### Event (`event`)

| Property     | Required | Type           | Description                                      |
|--------------|----------|----------------|--------------------------------------------------|
| id           | Yes      | string         | Unique identifier                                |
| title        | Yes      | string         | Event summary                                    |
| status       | Yes      | string         | active, deprecated                               |
| created_at   | Yes      | ISO 8601       | Creation timestamp                               |
| updated_at   | Yes      | ISO 8601       | Last update timestamp                            |
| source       | Yes      | string         | Provenance                                       |
| tags[]       | No       | array[string]  | Tags                                             |
| owner        | No       | string         | Owner/assignee                                   |
| priority     | No       | string         | Priority level                                   |
| severity     | No       | string         | Severity level                                   |
| links[]      | No       | array[string]  | URLs                                             |
| text_ref     | No       | string         | Markdown/doc pointer                             |

**Example:**
```yaml
---
id: EVT-user-logged-in
title: Sample event EVT-user-logged-in
status: active
created_at: 2026-02-17T13:00:00Z
updated_at: 2026-02-17T13:00:00Z
source: https://example.com/fixtures/events/EVT-user-logged-in
tags:
  - domain
---
```

#### Symbol (`symbol`)

| Property     | Required | Type           | Description                                      |
|--------------|----------|----------------|--------------------------------------------------|
| id           | Yes      | string         | Unique identifier                                |
| title        | Yes      | string         | Symbol summary                                   |
| status       | Yes      | string         | active, deprecated, removed                      |
| created_at   | Yes      | ISO 8601       | Creation timestamp                               |
| updated_at   | Yes      | ISO 8601       | Last update timestamp                            |
| source       | Yes      | string         | Provenance                                       |
| tags[]       | No       | array[string]  | Tags                                             |
| owner        | No       | string         | Owner/assignee                                   |
| priority     | No       | string         | Priority level                                   |
| severity     | No       | string         | Severity level                                   |
| links[]      | No       | array[string]  | URLs                                             |
| text_ref     | No       | string         | Markdown/doc pointer                             |
| sourceFile   | No       | string         | Code source path                                 |
| sourceLine   | Generated | integer       | One-based start line persisted during sync       |
| sourceColumn | Generated | integer       | Zero-based start column persisted during sync    |
| sourceEndLine | Generated | integer      | One-based end line persisted during sync         |
| sourceEndColumn | Generated | integer    | Zero-based end column persisted during sync      |

**Example:**
```yaml
---
id: SYM-login-handler
title: Sample symbol SYM-login-handler
status: active
created_at: 2026-02-17T13:00:00Z
updated_at: 2026-02-17T13:00:00Z
source: https://example.com/fixtures/symbols/SYM-login-handler
tags:
  - code
---
```

#### Fact (`fact`)

Facts support two authoring lanes:

- **Strict lane** for normative, contradiction-sensitive knowledge
  - `subject`: requires `subject_key`
  - `property_value`: requires `subject_key`, `property_key`, `operator`, `value_type`, and exactly one value field
  - A scalar obligation such as "Exports must include headers" uses `operator: eq`, `value_type: bool`, `value_bool: true`, and `polarity: require` (or `forbid` for "must not"). Polarity modifies a typed comparison and never replaces it. Schema 7 makes malformed strict fact shapes blocking; `kibi migrate --yes` converts legacy polarity-only facts without changing IDs.
- **Context lane** for non-blocking knowledge
  - `observation`
  - `meta`
- **Ontology lane** for project-local predicate modeling
  - `predicate_schema`: defines an allowed predicate signature; requires `predicate_name`, `predicate_arity`, `argument_names`, and `argument_types`. May close argument vocabularies with `argument_constants` (allowed values keyed by argument name) and `argument_aliases` (legacy spellings keyed by argument name, each mapped to a declared constant); unlisted arguments stay open. Optional `key_arguments` (a non-empty list of declared argument names) states that those arguments determine the rest; rule contradiction analysis identifies two atoms of the predicate only when their key arguments are identical
  - `predicate`: stores a ground predicate claim; requires `predicate_name`, non-empty `predicate_args`, and `canonical_key`; may use `polarity: assert` or `deny`; logical coverage also uses the paired `claim_key` and `claim_text` provenance fields
- **Logic lane** for conditional and modal requirements
  - `rule_schema`: declares the stable `kibi.logic.v1` signature used by rule facts
  - `rule`: stores schema-validated canonical Logic IR JSON, a full `rule_hash`, semantic key, provenance span, and `rule_schema_id`

Legacy prose facts without `fact_kind` remain readable during migration, but new requirements should prefer the strict lane when the fact expresses a rule that should block contradictions.

`fact` entities represent atomic domain concepts and invariants (for example domain nouns, cardinalities, property values, ontology predicates, and safe rules). Requirements can link to strict facts using `constrains` and `requires_property`, ontology predicate facts using `requires_predicate`, or safe Logic IR rules using `requires_rule`, so domain claims become structural and queryable. When either `claim_key` or `claim_text` is supplied, both are required.

**Migration note:** schema v4 adds `semantic_inventory`, its source-binding contract, `rule_schema`, `rule`, and `requires_rule` additively. Existing Markdown requirements receive a one-time semantic-hash baseline; the next semantic edit, or any newly added requirement after that baseline, must carry a complete ledger. Projects can adopt the logic lane incrementally by preserving advisor proposition ledgers, adding rule schemas, then linking modeled requirements to safe facts while leaving unresolved states explicit.

### Logic IR facts

`rule_ir` is a JSON object with `version: kibi.logic.v1`; it is validated and canonicalized before persistence. It supports typed atoms, variables, conjunction/disjunction, comparisons, bounded counts, temporal intervals, exceptions, and the modalities `assert`, `deny`, `oblige`, `permit`, and `forbid`. `rule_hash` is the full SHA-256 of canonical IR; `semantic_key` is a shorter stable identity for paraphrase convergence. Kibi renders Prolog for inspection, but never evaluates stored source text. `rule-safety` and `rule-verifiability` are blocking checks for new rule records.

Requirements also retain a `semantic_inventory` proposition ledger. Each entry binds a claim key and exact claim text to a UTF-8 byte span and one of `modeled`, `ambiguous`, `ontology_gap`, `nonlogical`, or `missing`. An assertive proposition that is not modeled must be explicitly unresolved; prose alone is not logical coverage.

Symbol coordinates are generated compiler state. Callers cannot author `sourceLine`, `sourceColumn`, `sourceEndLine`, or `sourceEndColumn` through `kb_upsert`: source-first symbol upserts re-extract the canonical manifest plus `.kb/symbol-coordinates.yaml` before committing, so partial payloads can no longer erase persisted coordinates, and coordinate refresh failures abort the mutation instead of being reported as complete. The artifact is version 2: every record carries an identity hash bound to the extraction that produced it, malformed artifacts fail sync and mutations closed, and publication is atomic. This lets conservative proof reporting validate the exact source-bound symbols that carry implementation and executable-test evidence; the authored manifest remains coordinate-free and `.kb/symbol-coordinates.yaml` remains the generated source of truth.

| Property     | Required | Type           | Description                                      |
|--------------|----------|----------------|--------------------------------------------------|
| id           | Yes      | string         | Unique identifier                                |
| title        | Yes      | string         | Fact summary                                     |
| status       | Yes      | string         | active, deprecated                               |
| created_at   | Yes      | ISO 8601       | Creation timestamp                               |
| updated_at   | Yes      | ISO 8601       | Last update timestamp                            |
| source       | Yes      | string         | Provenance                                       |
| tags[]       | No       | array[string]  | Tags                                             |
| owner        | No       | string         | Owner/assignee                                   |
| priority     | No       | string         | Priority level                                   |
| severity     | No       | string         | Severity level                                   |
| links[]      | No       | array[string]  | URLs                                             |
| text_ref     | No       | string         | Markdown/doc pointer                             |

**Example:**
```yaml
---
id: FACT-USER-ROLE
title: User Role Assignment
status: active
created_at: 2026-02-20T13:00:00Z
updated_at: 2026-02-20T13:00:00Z
source: .kb/facts/FACT-USER-ROLE.md
tags:
  - domain
  - auth
---
```

---

## Relationship Types

Kibi supports relationship types listed below. Each relationship has metadata:

| Property     | Required | Type           | Description                                      |
|--------------|----------|----------------|--------------------------------------------------|
| created_at   | Yes      | ISO 8601       | Creation timestamp                               |
| created_by   | Yes      | string         | Creator identifier                               |
| source       | Yes      | string         | Provenance                                       |
| confidence   | No       | string/number  | Optional confidence level                        |

### Relationship Table

| Relationship         | Source Entity         | Target Entity         | Description                                      |
|---------------------|----------------------|----------------------|--------------------------------------------------|
| depends_on          | req                  | req                  | Requirement depends on another requirement        |
| specified_by        | req                  | scenario             | Requirement is specified by a scenario            |
| verified_by         | req/scenario         | test                 | Requirement or scenario is verified by a test     |
| validates           | test                 | req/scenario         | Test validates a requirement or scenario          |
| implements          | symbol               | req                  | Symbol owns or implements requirement behavior    |
| covered_by          | symbol               | test                 | Production symbol has coverage evidence from a test |
| executable_for      | symbol               | test                 | Symbol is executable test code for a test entity  |
| constrained_by      | symbol               | adr                  | Symbol constrained by ADR                         |
| constrains          | req                  | fact                 | Requirement constrains a specific domain fact     |
| requires_property   | req                  | fact                 | Requirement requires a property fact/value        |
| requires_predicate  | req                  | fact                 | Requirement requires a ground ontology predicate fact |
| requires_rule       | req                  | fact                 | Requirement requires a schema-validated kibi.logic.v1 rule fact |
| guards              | flag                 | symbol/event/req     | Flag guards symbol, event, or requirement         |
| publishes           | symbol               | event                | Symbol publishes event                            |
| consumes            | symbol               | event                | Symbol consumes event                             |
| supersedes          | adr                  | adr                  | The source ADR formally replaces the target ADR. The target is expected to carry status: archived or deprecated |
| supersedes          | req                  | req                  | The source requirement replaces the target requirement; the target stops being current |
| restates            | req                  | req                  | The source requirement intentionally restates a current requirement (e.g. a product requirement echoed in a platform requirement). Both stay current; `domain-redundancy` is suppressed for the pair |
| assumes             | scenario             | fact                 | The scenario's outcome depends on this `property_value` fact holding; checked by `scenario-feasibility` when the scenario expects success |
| exempts             | req                  | req                  | An approved exception requirement exempts the scenarios it specifies from the target requirement's property and rule constraints (only the clauses in `exempts_claims` when set); the target stays current |
| relates_to          | a                    | b                    | Generic relationship (escape hatch)               |

---

### Relationship Examples

**depends_on**
```yaml
# req REQ-auth-login-lockout depends_on req REQ-auth-login
relationship:
  type: depends_on
  source: REQ-auth-login-lockout
  target: REQ-auth-login
  created_at: 2026-02-17T13:10:00Z
  created_by: analyst
  source: https://example.com/fixtures/requirements/REQ-auth-login-lockout
```

**specified_by**
```yaml
# req REQ-auth-login specified_by scenario SCEN-auth-login-success
relationship:
  type: specified_by
  source: REQ-auth-login
  target: SCEN-auth-login-success
  created_at: 2026-02-17T13:15:00Z
  created_by: analyst
  source: https://example.com/fixtures/requirements/REQ-auth-login
```

**verified_by**
```yaml
# req REQ-auth-login verified_by test TEST-auth-login-success
relationship:
  type: verified_by
  source: REQ-auth-login
  target: TEST-auth-login-success
  created_at: 2026-02-17T13:20:00Z
  created_by: qa
  source: https://example.com/fixtures/tests/TEST-auth-login-success
```

`verified_by` has one frozen meaning: a requirement or scenario is verified by a test. Direct `req -> test` is fallback only when no scenario exists. Prefer `req -> scenario -> test`.

Facts are not directly verified by tests. Model the behavior through a requirement: link the requirement to strict or observation facts with `constrains`, `requires_property`, or `requires_predicate`, then link the requirement or scenario to the test with `verified_by` / `validates`.

**validates**
```yaml
# test TEST-auth-login-success validates scenario SCEN-auth-login-success
relationship:
  type: validates
  source: TEST-auth-login-success
  target: SCEN-auth-login-success
  created_at: 2026-02-17T13:22:00Z
  created_by: qa
  source: https://example.com/fixtures/tests/TEST-auth-login-success
```

`validates` is the inverse edge for req/scenario ↔ test links.

**implements**
```yaml
# symbol SYM-login-handler implements req REQ-auth-login
relationship:
  type: implements
  source: SYM-login-handler
  target: REQ-auth-login
  created_at: 2026-02-17T13:25:00Z
  created_by: dev
  source: https://example.com/fixtures/symbols/SYM-login-handler
```

`implements` is frozen to requirement ownership only (`symbol -> req`).

**covered_by**
```yaml
# symbol SYM-login-handler covered_by test TEST-auth-login-success
relationship:
  type: covered_by
  source: SYM-login-handler
  target: TEST-auth-login-success
  created_at: 2026-02-17T13:30:00Z
  created_by: dev
  source: https://example.com/fixtures/tests/TEST-auth-login-success
```

`covered_by` is frozen to production coverage evidence only (`symbol -> test`).

**executable_for**
```yaml
# symbol SYM-test-auth-login-success executable_for test TEST-auth-login-success
relationship:
  type: executable_for
  source: SYM-test-auth-login-success
  target: TEST-auth-login-success
  created_at: 2026-02-17T13:32:00Z
  created_by: dev
  source: https://example.com/fixtures/symbols/SYM-test-auth-login-success
```

`executable_for` is frozen to executable test code identity only (`symbol -> test`).

For the canonical symbol taxonomy, integration/e2e N/A rubric, and anti-blanket requirement checklist, see [Symbol Traceability Taxonomy](symbol-traceability-taxonomy.md).

**constrained_by**
```yaml
# symbol SYM-login-handler constrained_by adr ADR-session-token-storage
relationship:
  type: constrained_by
  source: SYM-login-handler
  target: ADR-session-token-storage
  created_at: 2026-02-17T13:35:00Z
  created_by: architect
  source: https://example.com/fixtures/adrs/ADR-session-token-storage
```


**guards**
```yaml
# flag FLAG-login-rate-limit guards req REQ-auth-login
relationship:
  type: guards
  source: FLAG-login-rate-limit
  target: REQ-auth-login
  created_at: 2026-02-17T13:45:00Z
  created_by: devops
  source: https://example.com/fixtures/flags/FLAG-login-rate-limit
```

**publishes**
```yaml
# symbol SYM-login-handler publishes event EVT-user-logged-in
relationship:
  type: publishes
  source: SYM-login-handler
  target: EVT-user-logged-in
  created_at: 2026-02-17T13:50:00Z
  created_by: dev
  source: https://example.com/fixtures/symbols/SYM-login-handler
```

**consumes**
```yaml
# symbol SYM-login-handler consumes event EVT-user-logged-in
relationship:
  type: consumes
  source: SYM-login-handler
  target: EVT-user-logged-in
  created_at: 2026-02-17T13:55:00Z
  created_by: dev
  source: https://example.com/fixtures/symbols/SYM-login-handler
```

**constrains**
```yaml
# req REQ-user-role-assignment constrains fact FACT-USER-ROLE
relationship:
  type: constrains
  source: REQ-user-role-assignment
  target: FACT-USER-ROLE
  created_at: 2026-02-20T14:00:00Z
  created_by: analyst
  source: .kb/requirements/REQ-user-role-assignment.md
```

**requires_property**
```yaml
# req REQ-user-role-assignment requires_property fact FACT-LIMIT-2
relationship:
  type: requires_property
  source: REQ-user-role-assignment
  target: FACT-LIMIT-2
  created_at: 2026-02-20T14:01:00Z
  created_by: analyst
  source: .kb/requirements/REQ-user-role-assignment.md
```

**relates_to**
```yaml
# Generic relationship between any two entities
relationship:
  type: relates_to
  source: ENTITY-A
  target: ENTITY-B
  kind: custom
  created_at: 2026-02-17T14:00:00Z
  created_by: analyst
  source: https://example.com/fixtures/entities/ENTITY-A
```

**supersedes**
```yaml
# adr ADR-session-token-storage-v2 supersedes adr ADR-session-token-storage
relationship:
  type: supersedes
  source: ADR-session-token-storage-v2
  target: ADR-session-token-storage
  created_at: 2026-02-20T10:00:00Z
  created_by: architect
  source: https://example.com/fixtures/adrs/ADR-session-token-storage-v2
```

**restates**
```yaml
# req REQ-billing-invoice-retention restates req REQ-platform-record-retention
relationship:
  type: restates
  source: REQ-billing-invoice-retention
  target: REQ-platform-record-retention
  created_at: 2026-09-28T10:00:00Z
  created_by: analyst
  source: .kb/requirements/REQ-billing-invoice-retention.md
```

**assumes** and **exempts**
```yaml
# scenario SCEN-promo-zero-quota-call expects success and assumes zero quota
links:
  - type: assumes
    target: FACT-quota-remaining-zero
# exception req REQ-quota-promo-exception exempts REQ-quota-call and specifies the scenario
approved_by: Product owner
approval_ref: DEC-quota-promo
# optional: waive only these clauses of REQ-quota-call
exempts_claims: [CLAIM-0123456789ABCDEF]
links:
  - type: exempts
    target: REQ-quota-call
  - type: specified_by
    target: SCEN-promo-zero-quota-call
```

---

## Body contract

The Markdown body is where context lives; front matter is the checked meaning. Sections are split by ATX headings. The context headings are `Context`, `Rationale`, `Why`, `Background`, `Source`, `Notes` and `Evidence` (case-insensitive prefix match); a context section runs to the next heading of the same or higher level.

| Type | What counts as context | Body should carry |
| --- | --- | --- |
| `req` | Only text under context headings | The statement, `## Context` (why, who asked, constraints), `## Source` (blockquoted excerpt and reference) |
| `scenario` | All non-heading prose | Given/When/Then prose and the assumptions it depends on |
| `test` | All non-heading prose | What it asserts, how (fixture, entry point), what would make it a false pass |
| `adr` | All non-heading prose | Context, Decision, Consequences |
| `fact` (`observation`, `meta`) | All non-heading prose | What was seen, where, when, how confirmed |
| `symbol`, `flag`, `event`, other fact kinds | Exempt | Front matter is the content |

The blocking `entity-context-missing` check requires at least 12 words of context that are not a restatement of the title (normalized token-set Jaccard below 0.8; a requirement is also compared with `semantic_text`). Never invent a reason: write "Reason not stated" and the source. Context sections of a requirement are excluded when `semantic_text` is derived from the body, and Kibi writes `semantic_text` explicitly in front matter on every requirement it authors, so adding context never changes claim spans or hashes. Entities that predate the rule are tagged `review:context-missing` by the schema 8 migration (see `kibi migrate`) and counted by the advisory `entity-context-acknowledged` diagnostic instead of blocking.

## Notes
- The schema is the eight entity types and the relationship catalog in this document.
- IDs must be stable and unique. Set an explicit frontmatter `id` named by what the entity governs (`<TYPE>-<area>-<behavior>`, e.g. `REQ-cli-gc`) and keep the filename stem equal to it; never pick the next free number. A missing `id` falls back to a path-and-title hash that changes on rename. `entity-id-style` reports stem mismatches and newly created numeric IDs; legacy numbered entities are grandfathered.
- Relationship metadata supports audit and conflict resolution.
- Status values are entity-type specific (see above).

---

End of schema documentation.
