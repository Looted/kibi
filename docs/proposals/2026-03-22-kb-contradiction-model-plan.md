# KB Contradiction Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a generalized Kibi fact model that supports strict reject-on-write contradiction enforcement for normative requirements, while preserving a softer evidence lane for observational, historical, and governance knowledge across repos like `bizzwords`, `align`, and `kibi`.

**Architecture:** Keep Kibi’s existing entity/relationship system and Prolog-backed validation core, but refine `fact` into explicit sub-kinds and normalized property fields. Enforce contradictions at `kb_upsert` time for strict requirement writes, using `supersedes` as the only built-in escape hatch, and keep `kb_check` as the full-audit/reporting layer for legacy data, migration gaps, and drift between requirements and observations.

**Tech Stack:** TypeScript, MCP server, CLI checks, Prolog (`packages/core/src/kb.pl`), JSON Schema validation, Bun tests, Markdown-backed KB entities.

---

## Task 1: Lock the Product Contract, Transition Rules, and v1 Scope

**Files:**
- Create: `docs/proposals/2026-03-22-kb-contradiction-model-plan.md`
- Modify: `docs/entity-schema.md`
- Modify: `docs/inference-rules.md`
- Modify: `docs/prompts/llm-rules.md`
- Modify: `docs/prompts/retroactive-init.md`
- Modify: `AGENTS.md`

- [ ] Define the two-lane model explicitly:
  - `fact_kind=subject`
  - `fact_kind=property_value`
  - `fact_kind=observation`
  - `fact_kind=meta`
- [ ] State that only `subject` + `property_value` facts participate in hard contradiction enforcement.
- [ ] Define the normative authoring rule: any strict requirement that uses `constrains` must also use at least one `requires_property`.
- [ ] Define the write-time escape hatch: conflicting writes are rejected unless the same write supersedes the conflicting current requirement(s).
- [ ] Narrow v1 semantics to scalar constraints that fit the current storage model safely:
  - `eq`
  - `neq`
  - `lt`
  - `lte`
  - `gt`
  - `gte`
- [ ] Explicitly defer list/set semantics like `in` / `not_in` until storage/coercion support is expanded.
- [ ] Define the transition contract for new requirement writes:
  - new normative requirements should use the strict lane by default
  - legacy prose facts without `fact_kind` remain allowed during migration
  - a new/updated requirement linked only to legacy prose facts should warn/report via `kb_check` migration rules, not silently count as strict
- [ ] Define the mutation contract for normative requirement changes:
  - preferred path is append-only requirement evolution: create a new req + `supersedes`
  - in-place req updates are legacy-compatible but must not be relied on for semantic replacement until relationship replacement semantics are implemented
- [ ] Document repo fit:
  - `bizzwords`: many current facts should become strict subject/property facts
  - `align`: most current facts remain `observation` or `meta` until schema/data cleanup is done
  - `kibi`: use as the canonical fixture repo for contradiction and supersession tests

**Key decision to preserve:** default new requirements into the strict lane unless explicitly marked observational/meta during migration.

---

## Task 2: Add Failing Tests for Schema, Sync, and Upsert Contracts First

**Files:**
- Create: `packages/mcp/tests/tools/upsert-contradictions.test.ts`
- Modify: `packages/mcp/tests/tools/check.test.ts`
- Modify: `packages/mcp/tests/tools/check-aggregated.test.ts`
- Modify: `packages/cli/tests/commands/check.test.ts`
- Modify: `packages/cli/tests/utils/rule-registry.test.ts`
- Modify: `packages/cli/tests/schemas.test.ts`
- Modify: `packages/core/tests/schema.plt`

- [ ] Add tests proving `kb_upsert` rejects a new strict requirement when:
  - it constrains the same subject as a current requirement
  - it requires an incompatible property
  - no `supersedes` edge is present
- [ ] Add tests proving `kb_upsert` succeeds when:
  - the conflicting requirement is deprecated/superseded already
  - the same write includes valid `supersedes` edges from new req -> old req
- [ ] Add tests proving `observation` and `meta` facts do not trigger hard write rejection.
- [ ] Add tests proving strict facts require the normalized property fields.
- [ ] Add tests proving wrong fact-kind pairing is rejected:
  - `constrains` -> non-`subject` fact
  - `requires_property` -> non-`property_value` fact
- [ ] Add tests proving partial or unrelated `supersedes` edges do not satisfy the escape hatch.
- [ ] Add tests proving contradiction rejection rolls back atomically and does not leave partial writes behind.
- [ ] Add tests covering current `_skipContradictionCheck` behavior and the intended narrowed use of that flag.
- [ ] Add tests proving `kb_check --rules domain-contradictions` still reports contradictions in legacy or batch-loaded KB states.
- [ ] Add tests proving markdown sync round-trips the new fact fields without silently dropping them.
- [ ] Add tests for the upgraded rule registry/help text if new validation rules are introduced.

**Suggested commands:**
```bash
bun test packages/mcp/tests/tools/upsert-contradictions.test.ts
bun test packages/mcp/tests/tools/check.test.ts packages/mcp/tests/tools/check-aggregated.test.ts
bun test packages/cli/tests/commands/check.test.ts packages/cli/tests/utils/rule-registry.test.ts
bun test packages/cli/tests/schemas.test.ts
bun test packages/core/tests/schema.plt
```

---

## Task 3: Extend Public Entity Schema, Markdown Extraction, and Sync Persistence for Typed Facts

**Files:**
- Modify: `packages/cli/src/public/schemas/entity.ts`
- Modify: `packages/cli/src/schemas/entity.schema.json`
- Modify: `packages/cli/src/extractors/markdown.ts`
- Modify: `packages/cli/src/commands/sync/persistence.ts`
- Modify: `packages/core/schema/entities.pl`
- Modify: `packages/cli/schema/entities.pl`
- Modify: `packages/core/schema/validation.pl`
- Modify: `packages/cli/schema/validation.pl`
- Test: `packages/mcp/tests/tools/upsert-contradictions.test.ts`
- Test: `packages/cli/tests/schemas.test.ts`
- Test: `packages/core/tests/schema.plt`

- [ ] Add optional fact-only properties for the normalized model:
  - `fact_kind`
  - `subject_key`
  - `property_key`
  - `operator`
  - `value_type`
  - `value_string`
  - `value_int`
  - `value_number`
  - `value_bool`
  - `unit`
  - `scope`
  - `polarity`
  - `closed_world`
  - `valid_from`
  - `valid_to`
  - `canonical_key`
- [ ] Keep the base `fact` entity type unchanged so existing KBs still load.
- [ ] Extend `extractFromMarkdown` in `packages/cli/src/extractors/markdown.ts` so the new fact fields are preserved from frontmatter during sync.
- [ ] Extend `persistEntities` in `packages/cli/src/commands/sync/persistence.ts` so the new fields are written into the KB instead of being silently discarded.
- [ ] Enforce that these fields are optional globally, but validate their combinations more strictly in the write path for strict facts.
- [ ] Keep backward compatibility for legacy prose facts by allowing facts with no `fact_kind` during migration.
- [ ] Extend Prolog validation kinds beyond `atom|string|datetime|list|uri` to cover the chosen v1 scalar fields safely.
- [ ] Lock v1 scalar representation explicitly:
  - store normalized scalar values in dedicated fields (`value_string`, `value_int`, `value_number`, `value_bool`)
  - preserve those fields through markdown sync and MCP writes
  - coerce them explicitly in Prolog reasoning and keep `kb_query` / CLI output stable rather than silently flattening them to prose strings
- [ ] Mirror schema changes in both `packages/core/schema/entities.pl` and `packages/cli/schema/entities.pl`.

**Implementation note:** avoid a breaking schema change that would invalidate existing KB content in `align` and `bizzwords` immediately.

---

## Task 4: Add Prolog Semantics for Effective Requirements and Property Compatibility

**Files:**
- Modify: `packages/core/src/kb.pl`
- Modify: `packages/core/schema/relationships.pl` only if new helper relationships are introduced
- Modify: `packages/cli/schema/relationships.pl` only if mirrored relationship changes are needed
- Modify: `docs/inference-rules.md`
- Test: `packages/mcp/tests/tools/upsert-contradictions.test.ts`
- Test: `packages/mcp/tests/tools/check-aggregated.test.ts`

- [ ] Keep `current_req/1` as the gate for active requirements, including existing `supersedes` behavior in `packages/core/src/kb.pl:665`.
- [ ] Replace the current contradiction rule in `packages/core/src/kb.pl:676` with semantic comparison over normalized fact fields rather than `PropA \= PropB`.
- [ ] Add helper predicates along these lines:
  - `fact_subject_key(FactId, SubjectKey)`
  - `fact_property_tuple(FactId, SubjectKey, PropertyKey, Operator, ValueType, Value, Unit, Scope, Polarity)`
  - `effective_req_property(ReqId, SubjectKey, PropertyKey, Operator, ValueType, Value, Unit, Scope, Polarity)`
  - `property_conflict(...)`
  - `req_conflict(ReqA, ReqB, Reason)`
- [ ] Cover conflict classes:
  - numeric/cardinality conflicts like `lte 2` vs `gte 3`
  - exact-value conflicts like `eq pending` vs `eq granted`
  - polarity conflicts like `require` vs `forbid`
  - scope/time overlap conflicts only when scopes intersect
- [ ] Exclude `observation` and `meta` facts from contradiction predicates.
- [ ] Keep `contradicting_reqs/3` as the public internal inference name for compatibility, but back it with the richer semantics.

**Deliberate non-goals:**
- do not add a general-purpose theorem prover
- do not add broad negation-as-failure semantics in this pass
- do not ship list/set operator semantics in v1 unless the storage/coercion layer is expanded first

---

## Task 5: Intercept Contradictions on `kb_upsert`

**Files:**
- Modify: `packages/mcp/src/tools/upsert.ts`
- Modify: `packages/mcp/src/tools-config.ts`
- Modify: `packages/cli/src/public/schemas/relationship.ts` only if relationship contract needs clearer metadata
- Test: `packages/mcp/tests/tools/upsert-contradictions.test.ts`

- [ ] Change `handleKbUpsert` so contradiction detection happens before the success result is returned and fails the mutation instead of only reporting a count.
- [ ] Preserve atomicity: if a contradiction is found, do not leave partial entities/relationships committed.
- [ ] Evaluate contradictions against the incoming entity plus relationship set in the same transaction shape.
- [ ] Accept the write when conflicting current requirements are explicitly superseded in the same request.
- [ ] Define how the write gate treats strict-vs-legacy mixed payloads:
  - strict req + strict facts => hard contradiction enforcement
  - strict req + legacy prose facts only => migration warning path, not silent acceptance as strict semantics
  - observation/meta fact writes => no hard contradiction rejection
- [ ] Decide whether `_skipContradictionCheck` remains an internal bulk-import escape hatch or is removed/replaced for safety.
- [ ] Return actionable error text naming:
  - conflicting requirement IDs
  - shared subject fact
  - incompatible property facts / normalized property tuple
  - suggestion to add `supersedes` or deprecate the old requirement
- [ ] Update tool docs in `packages/mcp/src/tools-config.ts` to make reject-on-write behavior explicit.

**Implementation note:** the current `detectContradictionPairs` in `packages/mcp/src/tools/upsert.ts:229` is post-write and advisory; this task moves contradiction handling into the write gate.

---

## Task 6: Add Dedicated Validation Rules and Complete Rule/Config Wiring

**Files:**
- Modify: `packages/cli/src/utils/rule-registry.ts`
- Modify: `packages/cli/src/commands/check.ts`
- Modify: `packages/cli/src/commands/aggregated-checks.ts`
- Modify: `packages/core/src/checks.pl`
- Modify: `packages/mcp/src/tools/check.ts`
- Modify: `packages/mcp/src/tools-config.ts`
- Modify: `packages/cli/schema/config.json`
- Modify: `packages/mcp/src/server/docs.ts`
- Test: `packages/cli/tests/utils/rule-registry.test.ts`
- Test: `packages/cli/tests/commands/check.test.ts`
- Test: `packages/mcp/tests/tools/check.test.ts`

- [ ] Add one or more explicit rules so migration gaps are visible, for example:
  - `strict-fact-shape`
  - `strict-req-fact-pairing`
  - `invalid-supersession`
- [ ] Keep `domain-contradictions` focused on semantic contradictions between effective requirements.
- [ ] Make `kb_check` report legacy gaps clearly without blocking all existing repos at once.
- [ ] Document which rules are safe to enable by default immediately and which should be introduced in warning-only or migration mode first.
- [ ] Ensure CLI and MCP surface list any new rule names consistently.
- [ ] Keep rule/default wiring aligned across:
  - `packages/cli/src/utils/rule-registry.ts`
  - `packages/mcp/src/tools/check.ts`
  - `packages/cli/schema/config.json`
  - `packages/mcp/src/tools-config.ts`
  - `packages/mcp/src/server/docs.ts`

**Recommended rollout:** start the new strict-shape rules disabled by default for legacy repos, then enable them once the bundled KB fixtures and migration docs are updated.

---

## Task 7: Define Relationship Replacement or Append-Only Mutation Semantics

**Files:**
- Modify: `packages/mcp/src/tools/upsert.ts`
- Modify: `packages/core/src/kb.pl`
- Modify: `docs/entity-schema.md`
- Modify: `docs/prompts/llm-rules.md`
- Test: `packages/mcp/tests/tools/upsert-contradictions.test.ts`

- [ ] Decide and document the supported normative-mutation path for v1:
  - preferred: append-only requirement evolution using new req + `supersedes`
  - legacy-compatible: in-place req updates remain allowed, but are not the recommended semantic replacement path
- [ ] If in-place updates must participate safely, add explicit handling for old `constrains` / `requires_property` relationships so stale links do not survive silently.
- [ ] Ensure docs stop implying that a plain upsert fully replaces prior requirement semantics unless that behavior is actually implemented.

**Recommendation:** ship the contradiction model assuming append-only semantic evolution via `supersedes`, then add explicit relationship replacement semantics in a separate change if still needed.

---

## Task 8: Migrate Kibi’s Own Fixture Data to the New Canonical Pattern

**Files:**
- Modify: `documentation/requirements/REQ-018.md`
- Modify: `documentation/requirements/REQ-019.md`
- Modify: `documentation/facts/FACT-USER-ROLE.md`
- Modify: `documentation/facts/FACT-LIMIT-2.md`
- Modify: `documentation/facts/FACT-LIMIT-3.md`
- Modify: `documentation/tests/TEST-*.md` only if requirement traceability needs updates
- Test: `packages/mcp/tests/tools/upsert-contradictions.test.ts`
- Test: `packages/cli/tests/commands/check.test.ts`

- [ ] Convert the user-role contradiction example into the exact canonical shape Kibi wants downstream repos to follow.
- [ ] Add normalized fact fields to the sample facts.
- [ ] Ensure `REQ-018` is either:
  - current and conflicting for a deliberate contradiction fixture, or
  - deprecated/superseded with a separate fixture requirement pair for active conflict tests
- [ ] Add a positive supersession example showing the accepted write path.
- [ ] Keep the docs aligned with the actual fixture content so `kibi` becomes the golden reference repo.

**Prerequisite:** do not change the synced fixture markdown until Tasks 2-7 are complete and the sync pipeline preserves the new fields.

**Why this matters:** `bizzwords` and `align` both currently expose modeling drift; `kibi` should demonstrate the target state cleanly.

---

## Task 9: Document Cross-Repo Adoption Guidance

**Files:**
- Modify: `docs/entity-schema.md`
- Modify: `docs/inference-rules.md`
- Modify: `docs/prompts/llm-rules.md`
- Modify: `docs/prompts/retroactive-init.md`
- Modify: `AGENTS.md`
- Optional create: `docs/migration/strict-fact-model.md`

- [ ] Document the two-lane model with concrete examples from:
  - product/business constraint repos like `bizzwords`
  - mixed governance/history repos like `align`
  - Kibi’s own self-hosted KB
- [ ] Teach agents the authoring heuristic:
  - if it is normative and should block contradictions, model it with `subject` + `property_value`
  - if it is runtime evidence, historical note, bug record, or governance note, use `observation` or `meta`
- [ ] Document reject-on-write semantics and the `supersedes` escape hatch clearly.
- [ ] Clarify that strictness is the default for new requirements, while legacy repos may still carry prose facts during migration.
- [ ] Remove or rewrite examples that still suggest `relates_to` for contradiction-safe requirement/fact modeling.

---

## Task 10: Plan Safe Adoption for `bizzwords` and `align`

**Files:**
- Modify: `docs/proposals/2026-03-22-kb-contradiction-model-plan.md`
- Optional create: `docs/migration/bizzwords-strict-fact-adoption.md`
- Optional create: `docs/migration/align-strict-fact-adoption.md`

- [ ] Define migration sequencing for `bizzwords`:
  - convert a narrow vertical slice first, such as auth/consent or game-mode configuration
  - introduce strict facts for those areas
  - leave the rest as prose facts until migrated
- [ ] Define migration sequencing for `align`:
  - first fix schema/data mismatches
  - classify existing facts into `observation` vs `meta`
  - only then elevate a small set of true business constraints into strict facts
- [ ] Call out that `align` should not enable hard strict-shape enforcement until its `fact` entity type and relationship directions are repaired.
- [ ] Preserve existing repo usefulness during migration by allowing mixed-mode KBs.

**Key principle:** generalized model, staggered enforcement.

### Proposed migration sequencing

#### `bizzwords`

1. Convert one narrow vertical slice first (for example auth, consent, or one game-mode configuration family).
2. Introduce strict `subject` + `property_value` facts only for that slice.
3. Keep the rest of the repo on prose or mixed-mode facts until each area is normalized.
4. Enable stricter migration checks incrementally after each slice demonstrates stable contradiction-safe modeling.

#### `align`

1. Fix schema and relationship-direction mismatches before enabling hard strict checks.
2. Classify existing facts into `observation` vs `meta` where they are not normative business constraints.
3. Elevate only a narrow set of real business constraints into strict facts after the data model is clean.
4. Do not enable hard strict-shape enforcement repo-wide until `fact` usage and relationship directions are repaired.
5. Preserve mixed-mode KB usefulness during migration so the repo remains queryable while normalization is in flight.

---

## Task 11: Release Metadata and Verification

**Files:**
- Create: `.changeset/<descriptive-name>.md`

- [ ] Add a changeset for `kibi-core`, `kibi-cli`, and `kibi-mcp` because this feature crosses inference, validation, and tool behavior.
- [ ] Add `kibi-opencode` too if prompts or package docs change there.
- [ ] Run focused tests for schema, Prolog contradiction logic, upsert behavior, and CLI/MCP check output.
- [ ] Run a full build after package/version/doc wiring changes.

**Suggested commands:**
```bash
bun test packages/mcp/tests/tools/upsert-contradictions.test.ts
bun test packages/mcp/tests/tools/check.test.ts packages/mcp/tests/tools/check-aggregated.test.ts
bun test packages/cli/tests/commands/check.test.ts packages/cli/tests/utils/rule-registry.test.ts
bun test packages/cli/tests/schemas.test.ts
bun test packages/core/tests/schema.plt
bun run build
```

---

## Deferred on purpose

- No brand-new entity type; keep using `fact` with explicit sub-kinds.
- No broad runtime event/assertion engine in this pass.
- No immediate hard migration of all legacy repos.
- No attempt to make every prose fact machine-checkable.
- No general contradiction solving for arbitrary natural-language statements.

## Recommended commit slices

1. `docs: define strict fact model and supersession write policy`
2. `feat(cli): preserve typed fact fields through markdown sync`
3. `feat(core): add semantic requirement contradiction predicates`
4. `feat(mcp): reject contradictory requirement writes unless superseded`
5. `feat(cli): add strict fact-shape validation rules`
6. `docs: migrate canonical contradiction examples and adoption guidance`

---

*Plan written: 2026-03-22*
*Scope: Introduce a strict fact model, semantic contradiction detection, and reject-on-write enforcement with `supersedes` as the escape hatch across Kibi and downstream KBs*
