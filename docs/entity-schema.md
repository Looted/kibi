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
| source       | Yes      | string         | Provenance (file path, URL, or reference)        |
| tags[]       | No       | array[string]  | Array of metadata/search tags only               |
| owner        | No       | string         | Owner/assignee                                   |
| priority     | No       | string         | Priority level (must, should, could)             |
| severity     | No       | string         | Severity level                                   |
| links[]      | No       | array[string]  | Array of URLs                                    |
| text_ref     | No       | string         | Pointer to Markdown/doc blob                     |

---

### Entity Type Details & Example Frontmatter

#### Requirement (`req`)

| Property     | Required | Type           | Description                                      |
|--------------|----------|----------------|--------------------------------------------------|
| id           | Yes      | string         | Unique identifier                                |
| title        | Yes      | string         | Requirement summary                              |
| status       | Yes      | string         | open, in_progress, closed, deprecated            |
| created_at   | Yes      | ISO 8601       | Creation timestamp                               |
| updated_at   | Yes      | ISO 8601       | Last update timestamp                            |
| source       | Yes      | string         | Provenance                                       |
| tags[]       | No       | array[string]  | Tags                                             |
| owner        | No       | string         | Owner/assignee                                   |
| priority     | No       | string         | must, should, could                              |
| severity     | No       | string         | Severity level                                   |
| links[]      | No       | array[string]  | URLs or entity IDs (for relationships)           |
| text_ref     | No       | string         | Independent code/doc evidence pointer            |
| semantic_text | No      | string         | Requirement-only normalized authored prose that anchors semantic byte spans |
| logic_claims | No       | array[string]  | Requirement-only manifest of stable atomic claim keys |
| semantic_clauses | No | array[string] | Reviewed atomic decomposition override used against the exact semantic source |
| semantic_inventory_version | No | string | `kibi.semantic-inventory.v1` for source-bound ledgers |
| semantic_source_field | No | string | `semantic_text`, `text_ref`, or `title`, identifying the field that owns ledger byte spans; new authored requirements prefer `semantic_text` |
| semantic_source_hash | No | string | SHA-256 of the exact semantic source text |
| semantic_inventory | No | array[object] | Proposition ledger with exact claim text, UTF-8 byte span, role, status, and optional semantic key |

**Canonical Example: REQ + SCEN + TEST (Golden Path)**

```yaml
# .kb/requirements/REQ-001.md
---
id: REQ-001
title: User authentication
status: open
created_at: 2026-03-10T10:00:00Z
updated_at: 2026-03-10T10:00:00Z
source: .kb/requirements/REQ-001.md
links:
  - type: specified_by
    target: SCEN-001
---

# .kb/scenarios/SCEN-001.md
---
id: SCEN-001
title: Login with valid credentials
status: active
created_at: 2026-03-10T10:01:00Z
updated_at: 2026-03-10T10:01:00Z
source: .kb/scenarios/SCEN-001.md
---

# .kb/tests/TEST-001.md
---
id: TEST-001
title: Login test
status: passing
created_at: 2026-03-10T10:02:00Z
updated_at: 2026-03-10T10:02:00Z
source: .kb/tests/TEST-001.md
links:
  - type: validates
    target: SCEN-001
---
```

**Generic Link Shorthand:**

```yaml
links:
  - ADR-001
  - FACT-001
```

Plain string Markdown `links` entries are imported as generic `relates_to`
relationships. Use typed link objects or relationship rows when the semantic
relationship matters.

**Relationship Rows Example:**

```yaml
# Relationship: REQ-001 specified_by SCEN-001
relationship:
  type: specified_by
  source: REQ-001
  target: SCEN-001
  created_at: 2026-03-10T10:03:00Z
  created_by: analyst
  source: .kb/requirements/REQ-001.md
---
# Relationship: REQ-001 verified_by TEST-001
relationship:
  type: verified_by
  source: REQ-001
  target: TEST-001
  created_at: 2026-03-10T10:04:00Z
  created_by: qa
  source: .kb/requirements/REQ-001.md
```

> **Rule:** Never embed scenarios or tests inside requirement records. Always create separate files for each entity and link them with explicit typed `links` entries or relationship rows (`specified_by`, `verified_by`). Plain string `links` are generic `relates_to` only.

**Strict Fact Modeling (Normative Lane):**

- Preserve readable requirement prose, but decompose the entire assertive body into atomic propositions with `kb_semantic_advisor`. Context-only rationale, examples, and subjective commentary remain in the inventory as `nonlogical` and do not enter `logic_claims`.
- For a current requirement write, persist the receipt's `inventory_contract` as `semantic_inventory_version`, `semantic_source_field`, and `semantic_source_hash`. Ledger spans are UTF-8 byte offsets into that exact field; duplicate keys/spans, source drift, and silent omission are rejected before mutation.
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

# .kb/requirements/REQ-019.md
---
id: REQ-019
title: Users can now have 3 roles
status: open
created_at: 2026-02-20T13:06:00Z
updated_at: 2026-03-24T00:00:00Z
source: .kb/requirements/REQ-019.md
links:
  - type: constrains
    target: FACT-USER-ROLE
  - type: requires_property
    target: FACT-LIMIT-3
  - type: supersedes
    target: REQ-018
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
id: REQ-001
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

**Example:**
```yaml
---
id: SCEN-001
title: Sample scenario SCEN-001
status: active
created_at: 2026-02-17T13:00:00Z
updated_at: 2026-02-17T13:00:00Z
source: https://example.com/fixtures/scenarios/SCEN-001
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
| verification_receipts | No | array[object] | Append-only verification-receipt execution history; new evidence is `kibi.verification-receipt.v2`, while v1 entries remain historical compatibility data; requires `verification_scope` |

`tags` remain metadata only. They do not alias or replace typed verification fields.

Coverage-depth reporting uses typed verification fields before legacy hints. A test with `status: passing` and `verification_scope: end_to_end` supplies structural depth evidence even if it has no `e2e` tag; tag or path heuristics are only fallback evidence for older records. Durable status never supplies conservative proof evidence by itself. Requirement coverage rows can therefore report deterministic depth labels without changing the underlying covered/uncovered decision:

- `direct_passing_e2e` — the requirement is directly linked to a passing e2e test.
- `scenario_passing_e2e` — a linked scenario is validated by a passing e2e test.
- `unit_only` — passing evidence exists, but only at unit scope.
- `open_or_nonpassing_tests_only` — tests exist but none are passing.
- `scenario_only_no_test` — scenarios exist without executable test evidence.
- `no_test_evidence` — no scenario or test evidence is linked.

Conservative requirement proof uses receipt history instead. Each receipt binds `receipt_id`, `test_id`, `runner`, `command`, typed `scope`, `outcome`, `code_snapshot`, `environment_hash`, `started_at`, `finished_at`, and `artifact_digest`. History is capped at 50 entries, receipt IDs are unique, finish times increase strictly, and existing entries cannot be removed, changed, or reordered through upsert or incremental sync. Proof accepts only the newest receipt for the deterministic current workspace snapshot when it passed, is not future-dated, and is at most seven days old. Missing, wrong-snapshot, stale, failed, malformed, or future-dated evidence produces explicit proof gaps.

`kibi.workspace-snapshot.v2` hashes current versionable code plus requirement, scenario, fact, test-contract, and symbol-manifest inputs. It excludes `.kb/`, release changesets, general `docs/`, and the `verification_receipts` frontmatter field inside every tracked Markdown file, preventing a receipt from invalidating its own code hash without hiding changes to the surrounding test contract. The v2 algorithm invalidates v1 snapshot-bound receipts once; they must be rerun.

#### Check output diagnostics

`kibi check`, MCP `kb_check`, staged impact checks, and OpenCode scheduled checks use a two-lane output contract rather than modeling audit findings as new entity types:

- `violations[]` is the hard correctness lane. Graph, schema, contradiction, query-plan, and staged blocking failures stay here and continue to fail checks.
- `qualityDiagnostics[]` is the audit-quality lane. Modeling reviews, coverage-depth reviews, broad requirement fanout, duplicate coordinates, symbol fanout, status misuse, and strict-fact modeling suggestions are advisory unless a diagnostic explicitly sets `blocking: true` or `severity: "error"`.

The public severity values are `error`, `warning`, `review`, and `info`. `review` and `info` do not fail checks by default; `warning` is also non-blocking unless paired with `blocking: true`. Integrations should inspect both `severity` and `blocking` instead of treating every diagnostic-like record as a failure.

**Example:**
```yaml
---
id: TEST-001
title: Sample test TEST-001
status: passing
created_at: 2026-02-17T13:00:00Z
updated_at: 2026-02-17T13:00:00Z
source: https://example.com/fixtures/tests/TEST-001
tags:
  - sample
verification_scope: end_to_end
verification_perspective: consumer
verification_receipts:
  - version: kibi.verification-receipt.v2
    receipt_id: VR-TEST-001-20260217T130500Z
    test_id: TEST-001
    runner: bun
    command: bun test ./tests/e2e/sample.test.ts
    command_argv: [bun, test, ./tests/e2e/sample.test.ts]
    scope: end_to_end
    outcome: passed
    code_snapshot: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    environment_hash: bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
    started_at: 2026-02-17T13:00:00Z
    finished_at: 2026-02-17T13:05:00Z
    artifact_digest: cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc
    contract_hash: dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd
    case_results:
      - symbol_id: SYM-TEST-001
        project: default
        outcome: passed
        retries: 0
        duration_ms: 300000
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
id: ADR-001
title: Sample ADR ADR-001
status: accepted
created_at: 2026-02-17T13:00:00Z
updated_at: 2026-02-17T13:00:00Z
source: https://example.com/fixtures/adrs/ADR-001
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
id: FLAG-001
title: Sample flag FLAG-001
status: active
created_at: 2026-02-17T13:00:00Z
updated_at: 2026-02-17T13:00:00Z
source: https://example.com/fixtures/flags/FLAG-001
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
id: EVT-001
title: Sample event EVT-001
status: active
created_at: 2026-02-17T13:00:00Z
updated_at: 2026-02-17T13:00:00Z
source: https://example.com/fixtures/events/EVT-001
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
id: SYM-001
title: Sample symbol SYM-001
status: active
created_at: 2026-02-17T13:00:00Z
updated_at: 2026-02-17T13:00:00Z
source: https://example.com/fixtures/symbols/SYM-001
tags:
  - code
---
```

#### Fact (`fact`)

Facts support two authoring lanes:

- **Strict lane** for normative, contradiction-sensitive knowledge
  - `subject`: requires `subject_key`
  - `property_value`: requires `subject_key`, `property_key`, `operator`, `value_type`, and exactly one value field
- **Context lane** for non-blocking knowledge
  - `observation`
  - `meta`
- **Ontology lane** for project-local predicate modeling
  - `predicate_schema`: defines an allowed predicate signature; requires `predicate_name`, `predicate_arity`, `argument_names`, and `argument_types`
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

Generated symbol coordinates (`sourceLine`, `sourceColumn`, `sourceEndLine`, and `sourceEndColumn`) are persisted into the RDF snapshot during sync alongside `sourceFile`. This lets conservative proof reporting validate the exact source-bound symbols that carry implementation and executable-test evidence; the authored manifest remains coordinate-free and `.kb/symbol-coordinates.yaml` remains the generated source of truth.

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
| relates_to          | a                    | b                    | Generic relationship (escape hatch)               |

---

### Relationship Examples

**depends_on**
```yaml
# req REQ-002 depends_on req REQ-001
relationship:
  type: depends_on
  source: REQ-002
  target: REQ-001
  created_at: 2026-02-17T13:10:00Z
  created_by: analyst
  source: https://example.com/fixtures/requirements/REQ-002
```

**specified_by**
```yaml
# req REQ-001 specified_by scenario SCEN-001
relationship:
  type: specified_by
  source: REQ-001
  target: SCEN-001
  created_at: 2026-02-17T13:15:00Z
  created_by: analyst
  source: https://example.com/fixtures/requirements/REQ-001
```

**verified_by**
```yaml
# req REQ-001 verified_by test TEST-001
relationship:
  type: verified_by
  source: REQ-001
  target: TEST-001
  created_at: 2026-02-17T13:20:00Z
  created_by: qa
  source: https://example.com/fixtures/tests/TEST-001
```

`verified_by` has one frozen meaning: a requirement or scenario is verified by a test. Direct `req -> test` is fallback only when no scenario exists. Prefer `req -> scenario -> test`.

Facts are not directly verified by tests. Model the behavior through a requirement: link the requirement to strict or observation facts with `constrains`, `requires_property`, or `requires_predicate`, then link the requirement or scenario to the test with `verified_by` / `validates`.

**validates**
```yaml
# test TEST-001 validates scenario SCEN-001
relationship:
  type: validates
  source: TEST-001
  target: SCEN-001
  created_at: 2026-02-17T13:22:00Z
  created_by: qa
  source: https://example.com/fixtures/tests/TEST-001
```

`validates` is the inverse edge for req/scenario ↔ test links.

**implements**
```yaml
# symbol SYM-001 implements req REQ-001
relationship:
  type: implements
  source: SYM-001
  target: REQ-001
  created_at: 2026-02-17T13:25:00Z
  created_by: dev
  source: https://example.com/fixtures/symbols/SYM-001
```

`implements` is frozen to requirement ownership only (`symbol -> req`).

**covered_by**
```yaml
# symbol SYM-001 covered_by test TEST-001
relationship:
  type: covered_by
  source: SYM-001
  target: TEST-001
  created_at: 2026-02-17T13:30:00Z
  created_by: dev
  source: https://example.com/fixtures/tests/TEST-001
```

`covered_by` is frozen to production coverage evidence only (`symbol -> test`).

**executable_for**
```yaml
# symbol SYM-TEST-001 executable_for test TEST-001
relationship:
  type: executable_for
  source: SYM-TEST-001
  target: TEST-001
  created_at: 2026-02-17T13:32:00Z
  created_by: dev
  source: https://example.com/fixtures/symbols/SYM-TEST-001
```

`executable_for` is frozen to executable test code identity only (`symbol -> test`).

For the canonical symbol taxonomy, integration/e2e N/A rubric, and anti-blanket requirement checklist, see [Symbol Traceability Taxonomy](symbol-traceability-taxonomy.md).

**constrained_by**
```yaml
# symbol SYM-001 constrained_by adr ADR-001
relationship:
  type: constrained_by
  source: SYM-001
  target: ADR-001
  created_at: 2026-02-17T13:35:00Z
  created_by: architect
  source: https://example.com/fixtures/adrs/ADR-001
```


**guards**
```yaml
# flag FLAG-001 guards req REQ-001
relationship:
  type: guards
  source: FLAG-001
  target: REQ-001
  created_at: 2026-02-17T13:45:00Z
  created_by: devops
  source: https://example.com/fixtures/flags/FLAG-001
```

**publishes**
```yaml
# symbol SYM-001 publishes event EVT-001
relationship:
  type: publishes
  source: SYM-001
  target: EVT-001
  created_at: 2026-02-17T13:50:00Z
  created_by: dev
  source: https://example.com/fixtures/symbols/SYM-001
```

**consumes**
```yaml
# symbol SYM-001 consumes event EVT-001
relationship:
  type: consumes
  source: SYM-001
  target: EVT-001
  created_at: 2026-02-17T13:55:00Z
  created_by: dev
  source: https://example.com/fixtures/symbols/SYM-001
```

**constrains**
```yaml
# req REQ-018 constrains fact FACT-USER-ROLE
relationship:
  type: constrains
  source: REQ-018
  target: FACT-USER-ROLE
  created_at: 2026-02-20T14:00:00Z
  created_by: analyst
  source: .kb/requirements/REQ-018.md
```

**requires_property**
```yaml
# req REQ-018 requires_property fact FACT-LIMIT-2
relationship:
  type: requires_property
  source: REQ-018
  target: FACT-LIMIT-2
  created_at: 2026-02-20T14:01:00Z
  created_by: analyst
  source: .kb/requirements/REQ-018.md
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
# adr ADR-010 supersedes adr ADR-009
relationship:
  type: supersedes
  source: ADR-010
  target: ADR-009
  created_at: 2026-02-20T10:00:00Z
  created_by: architect
  source: https://example.com/fixtures/adrs/ADR-010
```

---

## Notes
- All entity and relationship types are fixed in v0; extensibility is planned for future versions.
- IDs must be stable and unique (content-based SHA256 or explicit frontmatter).
- Relationship metadata supports audit and conflict resolution.
- Status values are entity-type specific (see above).

---

End of schema documentation.
