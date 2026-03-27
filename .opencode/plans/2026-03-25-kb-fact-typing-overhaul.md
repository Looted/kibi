# KB Fact-Typing Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `fact_kind` (and where applicable, typed fields like `subject_key`, `property_key`, `operator`, `value_type`, `value_int`) to all 246 fact markdown files so that the Prolog `strict-fact-shape` and `domain-contradictions` validation rules are exercised against real data instead of passing trivially.

**Architecture:** This is a pure data migration — the typed-fact pipeline (schema, extractor, persistence, Prolog validation, codec round-trip) was implemented in the prior plan (`2026-03-23-typed-fact-schema-sync.md`). This plan edits only `documentation/facts/*.md` frontmatter, fixes 2 requirement files with wrong edge types, syncs the KB, and verifies Prolog constraints fire. A scripted approach per batch keeps edits mechanical and reviewable.

**Tech Stack:** Markdown/YAML frontmatter, `kibi sync`, `kibi check`, SWI-Prolog validation.

---

## File map

- Modify: `documentation/facts/*.md` — 243 files need `fact_kind` added (3 already typed: FACT-USER-ROLE, FACT-LIMIT-2, FACT-LIMIT-3)
- Modify: `documentation/requirements/REQ-014.md` — change 3 `relates_to` → `constrains` edges
- Modify: `documentation/requirements/REQ-016.md` — change 3 `relates_to` → `constrains` edges
- Verify: `.kb/` state after sync

## Traceability note

This plan modifies only markdown data files. No TypeScript/JavaScript code is modified, so no `// implements REQ-xxx` directives are needed. The KB entities created/updated here are themselves the traceability artifacts.

### Deliberate non-goals for this slice

- Do **not** add `subject_key`/`property_key`/`operator`/`value_type`/`value_int` to `meta` or `observation` facts — they only need `fact_kind`.
- Do **not** create new `constrains`/`requires_property` edges for requirements beyond REQ-014 and REQ-016 — the other 10 requirements already have correct typed edges.
- Do **not** regenerate `.kb/relationships/` shards — those are auto-managed by `kibi sync` when relationship data changes in markdown source files.

---

## Categorization reference

The 246 facts break down as follows (from the completed audit):

### `meta` — 202 facts (architecture, design, policy, standards, tech, capabilities, constraints)

| Prefix | Count | IDs |
|--------|------:|-----|
| FACT-ARC-* | 95 | 001–016, 018, 020, 022, 024, 026–100 |
| FACT-DES-* | 39 | 001–039 |
| FACT-POL-* | 27 | 001–027 |
| FACT-TECH-* | 15 | 001–015 |
| FACT-CON-* | 10 | 001–010 |
| FACT-CAP-* | 7 | 001–007 |
| FACT-STD-* | 6 | 001–006 |
| FACT-034 | 1 | — |
| FACT-CLI-COMMAND-SET-CORE | 1 | — |
| FACT-KB-PER-BRANCH | 1 | — |

### `observation` — 16 facts (empirical findings, status snapshots)

| IDs |
|-----|
| FACT-ACT-001 through FACT-ACT-012 (12) |
| FACT-007, FACT-008, FACT-009, FACT-010 (4) |

### `subject` — 19 facts (domain concepts that other facts/requirements constrain)

| ID | Planned `subject_key` |
|----|----------------------|
| FACT-USER-ROLE *(already typed)* | user.role_assignment |
| FACT-CLI-SURFACE | kibi.cli.surface |
| FACT-MCP-SERVER-INTERFACE | kibi.mcp.server_interface |
| FACT-SCHEMA-ENTITY-MODEL | kibi.schema.entity_model |
| FACT-SCHEMA-RELATIONSHIP-MODEL | kibi.schema.relationship_model |
| FACT-KB-SCOPE | kibi.kb.scope |
| FACT-CONSISTENCY-CHECKING | kibi.consistency.checking |
| FACT-WRITE-GOVERNANCE | kibi.write.governance |
| FACT-BRANCH-INITIALIZATION | kibi.branch.initialization |
| FACT-COPY-FROM-MAIN | kibi.branch.copy_from_main |
| FACT-INFERENCE-SURFACE | kibi.inference.surface |
| FACT-INFERENCE-DETERMINISTIC | kibi.inference.deterministic |
| FACT-CHECK-ENFORCEMENT | kibi.check.enforcement |
| FACT-CI-GATING | kibi.ci.gating |
| FACT-UPSERT-VALIDATION | kibi.upsert.validation |
| FACT-AUDIT-APPEND-ONLY | kibi.audit.append_only |
| FACT-ADR-SUPERSESSION | kibi.adr.supersession |
| FACT-ADR-TEMPORAL-INFERENCE | kibi.adr.temporal_inference |
| FACT-RELATIONSHIP-AUDIT-METADATA | kibi.relationship.audit_metadata |

### `property_value` — 9 facts (measurable properties with typed values)

Already typed (no work needed):
- FACT-LIMIT-2 (subject_key: user.role_assignment, property_key: max_roles, operator: lte, value_type: int, value_int: 2)
- FACT-LIMIT-3 (subject_key: user.role_assignment, property_key: max_roles, operator: lte, value_type: int, value_int: 3)

Need typing:

| ID | subject_key | property_key | operator | value_type | value field | value |
|----|-------------|-------------|----------|-----------|-------------|-------|
| FACT-ENTITY-TYPES-CORE-7 | kibi.schema.entity_model | entity_type_count | eq | int | value_int | 8 |
| FACT-CHECK-RULESET-CORE-3 | kibi.consistency.checking | check_rule_count | eq | int | value_int | 3 |
| FACT-TRANSPORT-STDIO | kibi.mcp.server_interface | transport_protocol | eq | string | value_string | stdio |
| FACT-INFERENCE-TOOLS-CORE-3 | kibi.inference.surface | inference_tool_count | eq | int | value_int | 3 |
| FACT-MCP-TOOLSET-CORE-6 | kibi.mcp.server_interface | mcp_tool_count | eq | int | value_int | 6 |
| FACT-KB-REPO-LOCAL | kibi.kb.scope | storage_location | eq | string | value_string | repo_local |
| FACT-011 | kibi.kb.scope | scope_model | eq | string | value_string | per_branch |

---

## Task 1: Add `fact_kind: meta` to all 202 meta facts

**Files:**
- Modify: 202 files in `documentation/facts/` (see Categorization Reference → meta)

This is the largest batch but the simplest edit — each file gets exactly one line added to its frontmatter.

- [ ] **Step 1: Add `fact_kind: meta` to all FACT-ARC-* files (95 files)**

For each file matching `FACT-ARC-*.md`, insert `fact_kind: meta` as the last frontmatter field before the closing `---`. Example transform for `FACT-ARC-001.md`:

Before:
```yaml
---
id: FACT-ARC-001
title: Frontend implemented using Angular 21+ with Standalone Components and Signals
status: active
tags: [architecture, frontend, angular, signals, standalone]
source: memory-bank/systemPatterns.md
created_at: 2026-02-20T12:00:00Z
updated_at: 2026-02-20T12:00:00Z
---
```

After:
```yaml
---
id: FACT-ARC-001
title: Frontend implemented using Angular 21+ with Standalone Components and Signals
status: active
tags: [architecture, frontend, angular, signals, standalone]
source: memory-bank/systemPatterns.md
created_at: 2026-02-20T12:00:00Z
updated_at: 2026-02-20T12:00:00Z
fact_kind: meta
---
```

Apply this same pattern to all 95 FACT-ARC-* files. The `fact_kind: meta` line goes after all existing fields and before the closing `---`.

- [ ] **Step 2: Add `fact_kind: meta` to FACT-DES-* files (39 files)**

Same pattern as Step 1. Apply to FACT-DES-001.md through FACT-DES-039.md.

- [ ] **Step 3: Add `fact_kind: meta` to FACT-POL-* files (27 files)**

Same pattern. Apply to FACT-POL-001.md through FACT-POL-027.md.

- [ ] **Step 4: Add `fact_kind: meta` to FACT-TECH-* files (15 files)**

Same pattern. Apply to FACT-TECH-001.md through FACT-TECH-015.md.

- [ ] **Step 5: Add `fact_kind: meta` to FACT-CON-* files (10 files)**

Same pattern. Apply to FACT-CON-001.md through FACT-CON-010.md.

- [ ] **Step 6: Add `fact_kind: meta` to FACT-CAP-* files (7 files)**

Same pattern. Apply to FACT-CAP-001.md through FACT-CAP-007.md.

- [ ] **Step 7: Add `fact_kind: meta` to FACT-STD-* files (6 files)**

Same pattern. Apply to FACT-STD-001.md through FACT-STD-006.md.

- [ ] **Step 8: Add `fact_kind: meta` to remaining meta singletons (3 files)**

Apply to:
- `FACT-034.md`
- `FACT-CLI-COMMAND-SET-CORE.md`
- `FACT-KB-PER-BRANCH.md`

- [ ] **Step 9: Verify meta count**

Run: `grep -rl "fact_kind: meta" documentation/facts/ | wc -l`

Expected: `202`

- [ ] **Step 10: Commit the meta batch**

```bash
git add documentation/facts/
git commit -m "docs(facts): add fact_kind meta to 202 architecture/design/policy facts"
```

---

## Task 2: Add `fact_kind: observation` to all 16 observation facts

**Files:**
- Modify: 16 files in `documentation/facts/`

- [ ] **Step 1: Add `fact_kind: observation` to FACT-ACT-* files (12 files)**

Same frontmatter insertion pattern as Task 1. Apply to FACT-ACT-001.md through FACT-ACT-012.md.

- [ ] **Step 2: Add `fact_kind: observation` to numeric observation facts (4 files)**

Apply to:
- `FACT-007.md`
- `FACT-008.md`
- `FACT-009.md`
- `FACT-010.md`

- [ ] **Step 3: Verify observation count**

Run: `grep -rl "fact_kind: observation" documentation/facts/ | wc -l`

Expected: `16`

- [ ] **Step 4: Commit the observation batch**

```bash
git add documentation/facts/
git commit -m "docs(facts): add fact_kind observation to 16 empirical finding facts"
```

---

## Task 3: Add `fact_kind: subject` with `subject_key` to 18 subject facts

**Files:**
- Modify: 18 files in `documentation/facts/` (FACT-USER-ROLE already typed — skip it)

Subject facts need both `fact_kind: subject` and a `subject_key` field. The Prolog `validate_fact_shape(subject, Props)` requires `subject_key` to be present.

- [ ] **Step 1: Add typed fields to the 18 subject facts**

For each file, insert `fact_kind: subject` and `subject_key: <value>` into frontmatter. Use the `subject_key` values from the Categorization Reference table above.

Example for `FACT-CLI-SURFACE.md`:

Before:
```yaml
---
id: FACT-CLI-SURFACE
title: CLI Command Surface
status: active
created_at: 2026-02-20T14:25:00Z
updated_at: 2026-02-20T14:25:00Z
source: documentation/facts/FACT-CLI-SURFACE.md
tags: [cli, commands]
---
```

After:
```yaml
---
id: FACT-CLI-SURFACE
title: CLI Command Surface
status: active
created_at: 2026-02-20T14:25:00Z
updated_at: 2026-02-20T14:25:00Z
source: documentation/facts/FACT-CLI-SURFACE.md
tags: [cli, commands]
fact_kind: subject
subject_key: kibi.cli.surface
---
```

Apply to all 18 files listed in the Categorization Reference → subject table, excluding FACT-USER-ROLE (already typed).

The complete list (18 files):
1. FACT-CLI-SURFACE → `kibi.cli.surface`
2. FACT-MCP-SERVER-INTERFACE → `kibi.mcp.server_interface`
3. FACT-SCHEMA-ENTITY-MODEL → `kibi.schema.entity_model`
4. FACT-SCHEMA-RELATIONSHIP-MODEL → `kibi.schema.relationship_model`
5. FACT-KB-SCOPE → `kibi.kb.scope`
6. FACT-CONSISTENCY-CHECKING → `kibi.consistency.checking`
7. FACT-WRITE-GOVERNANCE → `kibi.write.governance`
8. FACT-BRANCH-INITIALIZATION → `kibi.branch.initialization`
9. FACT-COPY-FROM-MAIN → `kibi.branch.copy_from_main`
10. FACT-INFERENCE-SURFACE → `kibi.inference.surface`
11. FACT-INFERENCE-DETERMINISTIC → `kibi.inference.deterministic`
12. FACT-CHECK-ENFORCEMENT → `kibi.check.enforcement`
13. FACT-CI-GATING → `kibi.ci.gating`
14. FACT-UPSERT-VALIDATION → `kibi.upsert.validation`
15. FACT-AUDIT-APPEND-ONLY → `kibi.audit.append_only`
16. FACT-ADR-SUPERSESSION → `kibi.adr.supersession`
17. FACT-ADR-TEMPORAL-INFERENCE → `kibi.adr.temporal_inference`
18. FACT-RELATIONSHIP-AUDIT-METADATA → `kibi.relationship.audit_metadata`

- [ ] **Step 2: Verify subject count**

Run: `grep -rl "fact_kind: subject" documentation/facts/ | wc -l`

Expected: `19` (18 new + FACT-USER-ROLE already typed = 19)

- [ ] **Step 3: Commit the subject batch**

```bash
git add documentation/facts/
git commit -m "docs(facts): add fact_kind subject with subject_key to 18 domain concept facts"
```

---

## Task 4: Add `fact_kind: property_value` with full typed fields to 7 property_value facts

**Files:**
- Modify: 7 files in `documentation/facts/` (FACT-LIMIT-2 and FACT-LIMIT-3 already typed)

Property_value facts need the full strict tuple: `fact_kind`, `subject_key`, `property_key`, `operator`, `value_type`, and exactly one `value_*` field. The Prolog validator (`validate_fact_shape(property_value, Props)`) checks all of these.

- [ ] **Step 1: Add typed fields to FACT-ENTITY-TYPES-CORE-7**

Transform the frontmatter to:
```yaml
---
id: FACT-ENTITY-TYPES-CORE-7
title: Eight Core Entity Types
status: active
created_at: 2026-02-20T14:40:00Z
updated_at: 2026-02-20T20:30:00Z
source: documentation/facts/FACT-ENTITY-TYPES-CORE-7.md
tags: [schema, entities]
fact_kind: property_value
subject_key: kibi.schema.entity_model
property_key: entity_type_count
operator: eq
value_type: int
value_int: 8
---

The core schema exposes exactly eight entity types:
req, scenario, test, adr, flag, event, symbol, and fact.
```

- [ ] **Step 2: Add typed fields to FACT-CHECK-RULESET-CORE-3**

Add after existing fields:
```yaml
fact_kind: property_value
subject_key: kibi.consistency.checking
property_key: check_rule_count
operator: eq
value_type: int
value_int: 3
```

- [ ] **Step 3: Add typed fields to FACT-TRANSPORT-STDIO**

```yaml
fact_kind: property_value
subject_key: kibi.mcp.server_interface
property_key: transport_protocol
operator: eq
value_type: string
value_string: stdio
```

- [ ] **Step 4: Add typed fields to FACT-INFERENCE-TOOLS-CORE-3**

```yaml
fact_kind: property_value
subject_key: kibi.inference.surface
property_key: inference_tool_count
operator: eq
value_type: int
value_int: 3
```

- [ ] **Step 5: Add typed fields to FACT-MCP-TOOLSET-CORE-6**

```yaml
fact_kind: property_value
subject_key: kibi.mcp.server_interface
property_key: mcp_tool_count
operator: eq
value_type: int
value_int: 6
```

- [ ] **Step 6: Add typed fields to FACT-KB-REPO-LOCAL**

```yaml
fact_kind: property_value
subject_key: kibi.kb.scope
property_key: storage_location
operator: eq
value_type: string
value_string: repo_local
```

- [ ] **Step 7: Add typed fields to FACT-011**

```yaml
fact_kind: property_value
subject_key: kibi.kb.scope
property_key: scope_model
operator: eq
value_type: string
value_string: per_branch
```

- [ ] **Step 8: Verify property_value count**

Run: `grep -rl "fact_kind: property_value" documentation/facts/ | wc -l`

Expected: `9` (7 new + FACT-LIMIT-2 + FACT-LIMIT-3)

- [ ] **Step 9: Commit the property_value batch**

```bash
git add documentation/facts/
git commit -m "docs(facts): add fact_kind property_value with strict typed fields to 7 measurable facts"
```

---

## Task 5: Fix REQ-014 and REQ-016 edge types

**Files:**
- Modify: `documentation/requirements/REQ-014.md`
- Modify: `documentation/requirements/REQ-016.md`

Both requirements have `relates_to` edges pointing at FACT-* entities that should be `constrains` edges (requirement constrains a domain fact).

- [ ] **Step 1: Fix REQ-014 edges**

In `documentation/requirements/REQ-014.md`, change the three `relates_to` → `constrains` for FACT targets:

Before:
```yaml
links:
  - type: relates_to
    target: FACT-CONSISTENCY-CHECKING
  - type: relates_to
    target: FACT-CHECK-ENFORCEMENT
  - type: relates_to
    target: FACT-CI-GATING
  - type: specified_by
    target: SCEN-009
  - type: verified_by
    target: TEST-011
```

After:
```yaml
links:
  - type: constrains
    target: FACT-CONSISTENCY-CHECKING
  - type: constrains
    target: FACT-CHECK-ENFORCEMENT
  - type: constrains
    target: FACT-CI-GATING
  - type: specified_by
    target: SCEN-009
  - type: verified_by
    target: TEST-011
```

- [ ] **Step 2: Fix REQ-016 edges**

In `documentation/requirements/REQ-016.md`, change the three `relates_to` → `constrains` for FACT targets:

Before:
```yaml
links:
  - type: relates_to
    target: FACT-SCHEMA-RELATIONSHIP-MODEL
  - type: relates_to
    target: FACT-ADR-SUPERSESSION
  - type: relates_to
    target: FACT-ADR-TEMPORAL-INFERENCE
```

After:
```yaml
links:
  - type: constrains
    target: FACT-SCHEMA-RELATIONSHIP-MODEL
  - type: constrains
    target: FACT-ADR-SUPERSESSION
  - type: constrains
    target: FACT-ADR-TEMPORAL-INFERENCE
```

- [ ] **Step 3: Commit the requirement edge fixes**

```bash
git add documentation/requirements/REQ-014.md documentation/requirements/REQ-016.md
git commit -m "fix(docs): change REQ-014 and REQ-016 fact edges from relates_to to constrains"
```

---

## Task 6: Sync, validate, and verify

**Files:**
- Verify: All `documentation/facts/*.md` and `documentation/requirements/REQ-014.md`, `REQ-016.md`

- [ ] **Step 1: Verify total fact_kind coverage**

Run: `grep -rl "fact_kind:" documentation/facts/ | wc -l`

Expected: `246` (all facts now have a `fact_kind`)

Breakdown check:
```bash
grep -rl "fact_kind: meta" documentation/facts/ | wc -l        # expect 202
grep -rl "fact_kind: observation" documentation/facts/ | wc -l  # expect 16
grep -rl "fact_kind: subject" documentation/facts/ | wc -l      # expect 19
grep -rl "fact_kind: property_value" documentation/facts/ | wc -l # expect 9
```

Total: 202 + 16 + 19 + 9 = 246

- [ ] **Step 2: Run `kibi sync` to refresh the Prolog store**

Run: `bun packages/cli/bin/kibi.ts sync`

Expected: Clean sync with all 246 facts loaded with their typed fields.

- [ ] **Step 3: Run `kibi check` to validate KB integrity**

Run: `bun packages/cli/bin/kibi.ts check`

Expected: 0 violations across all 9 rules. The `strict-fact-shape` rule should now be validating all 246 facts (not just 3). The `domain-contradictions` rule should be checking the 9 property_value facts for contradicting constraints.

- [ ] **Step 4: Run the full test suite**

Run: `bun test`

Expected: All tests pass (Prolog 67, MCP 102, CLI 158, OpenCode 253).

- [ ] **Step 5: Run the Prolog tests directly**

Run: `swipl -q -s packages/core/tests/schema.plt -g run_tests,halt && swipl -q -s packages/core/tests/kb.plt -g run_tests,halt`

Expected: 35 + 32 = 67 tests pass.

- [ ] **Step 6: Run the build**

Run: `bun run build`

Expected: All packages build successfully.

- [ ] **Step 7: Verify clean working tree**

Run: `git status --short`

Expected: Clean working tree after all commits.

---

## Recommended commit slices

1. `docs(facts): add fact_kind meta to 202 architecture/design/policy facts`
2. `docs(facts): add fact_kind observation to 16 empirical finding facts`
3. `docs(facts): add fact_kind subject with subject_key to 18 domain concept facts`
4. `docs(facts): add fact_kind property_value with strict typed fields to 7 measurable facts`
5. `fix(docs): change REQ-014 and REQ-016 fact edges from relates_to to constrains`

## Hand-off notes

- After this migration, `kb_check --rules strict-fact-shape` validates all 246 facts against their declared `fact_kind` shapes.
- The 9 `property_value` facts are now eligible for `domain-contradictions` checking — any future fact with the same `subject_key` + `property_key` but a contradicting value will be caught.
- The 19 `subject` facts serve as anchoring points for future `constrains` and `requires_property` edges from requirements.
- To add new facts, follow the typed pattern established here — always include `fact_kind` in frontmatter.
