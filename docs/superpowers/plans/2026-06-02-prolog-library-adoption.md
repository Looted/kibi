# Prolog Library Adoption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adopt three well-supported SWI-Prolog capabilities in Kibi: `library(aggregate)` for clearer counting/reporting, `library(chr)` for an internal derived-violation pilot, and `library(semweb/sparql_client)` for an explicitly optional SPARQL client query surface.

**Architecture:** Implement in three phases, ordered by risk. Phase 1 is a behavior-preserving Prolog refactor using `aggregate_all/3,4`. Phase 2 adds a CHR-backed internal pilot module without replacing existing `kb_check` logic. Phase 3 exposes remote SPARQL client support as an opt-in MCP/CLI surface, not as a replacement for Kibi's local RDF store.

**Tech Stack:** SWI-Prolog 10.x, `library(aggregate)`, `library(chr)`, `library(semweb/sparql_client)`, Bun, TypeScript, MCP tools, PLUnit.

---

## File Structure

- Modify: `packages/core/src/discovery.pl`
  - Add `library(aggregate)`.
  - Replace repeated `findall` + `sort` + `length` count patterns with `aggregate_all/3` or `aggregate_all/4` where behavior remains identical.
- Modify: `packages/core/src/checks.pl`
  - Add `library(aggregate)` if count refactors are made here.
  - Keep violation list generation with `findall` where the actual list is needed.
- Create: `packages/core/src/derived_chr.pl`
  - Internal CHR pilot module that computes a small, bounded set of derived validation facts from a snapshot of `kb_entity/3` and `kb_relationship/3`.
  - Do not replace existing checks yet.
- Modify: `packages/core/tests/kb.plt`
  - Add PLUnit tests proving aggregate refactors preserve counts.
  - Add PLUnit tests proving CHR pilot facts match current predicate behavior for the covered cases.
- Create: `packages/core/src/sparql_client.pl`
  - Thin wrapper around `library(semweb/sparql_client)` with safe, explicit remote endpoint querying.
  - This is for remote SPARQL endpoints only; do not pretend it queries Kibi's local RDF store directly.
- Create: `packages/mcp/src/tools/sparql.ts`
  - MCP tool handler for opt-in remote SPARQL queries.
- Modify: `packages/mcp/src/tools-config.ts`
  - Add the tool schema for remote SPARQL querying.
- Modify: `packages/mcp/src/server/tools.ts`
  - Wire the handler into the MCP server.
- Create: `packages/mcp/tests/tools/sparql.test.ts`
  - Unit tests for schema validation, error handling, and Prolog query construction.
- Modify: `docs/mcp-reference.md`
  - Document the new SPARQL tool, limitations, and safety model.
- Create: `.changeset/<generated-name>.md`
  - Required because publishable packages (`kibi-core`, `kibi-mcp`) change.

---

## Task 1: Add `library(aggregate)` and Refactor Safe Counts

**Files:**
- Modify: `packages/core/src/discovery.pl`
- Modify if needed: `packages/core/src/checks.pl`
- Test: `packages/core/tests/kb.plt`

- [ ] **Step 1: Write characterization tests for current count behavior**

Add PLUnit tests that create a temp KB and assert existing output for:

```prolog
test(relationship_count_counts_both_directions, [setup(setup_kb), cleanup(cleanup_kb)]) :-
    kb_assert_entity_no_audit(req, [id='REQ-A', title="A", status=open, created_at="2026-01-01T00:00:00Z", updated_at="2026-01-01T00:00:00Z", source="test"]),
    kb_assert_entity_no_audit(test, [id='TEST-A', title="T", status=passing, created_at="2026-01-01T00:00:00Z", updated_at="2026-01-01T00:00:00Z", source="test"]),
    kb_assert_relationship_no_audit(verified_by, 'REQ-A', 'TEST-A', []),
    discovery:relationship_count('REQ-A', verified_by, Count),
    assertion(Count == 1).
```

If `relationship_count/3` is not exported, test via `find_gaps_json/8` or `coverage_report_json/7` instead of exporting a private predicate.

- [ ] **Step 2: Run the failing/safety tests before implementation**

Run:

```bash
swipl -q -s packages/core/tests/kb.plt -g run_tests -t halt
```

Expected: PASS before refactor. These are characterization tests, not red tests.

- [ ] **Step 3: Add aggregate import**

In `packages/core/src/discovery.pl`, add:

```prolog
:- use_module(library(aggregate)).
```

Do the same in `checks.pl` only if refactoring count-only patterns there.

- [ ] **Step 4: Replace count-only `findall` patterns**

Target examples:

```prolog
relationship_count(Id, Relationship, Count) :-
    aggregate_all(count,
        (kb_relationship(Relationship, Id, _); kb_relationship(Relationship, _, Id)),
        Count).
```

For distinct counts, preserve existing `sort/2` semantics using `aggregate_all/4` with a discriminator or keep the old code if uniqueness semantics are ambiguous.

- [ ] **Step 5: Do not refactor list-producing predicates**

Keep `findall/3`, `setof/3`, and `sort/2` wherever the list itself is returned or order/deduplication is part of the public result.

- [ ] **Step 6: Run Prolog tests**

Run:

```bash
swipl -q -s packages/core/tests/kb.plt -g run_tests -t halt
bun run test:coverage:prolog
```

Expected: PASS; prolog coverage still meets the existing `--fail-under 100` threshold.

- [ ] **Step 7: Commit checkpoint**

Suggested commit:

```bash
git add packages/core/src/discovery.pl packages/core/src/checks.pl packages/core/tests/kb.plt
git commit -m "refactor(core): use aggregate for prolog counts"
```

---

## Task 2: Add a CHR Pilot Module for Derived Validation Facts

**Files:**
- Create: `packages/core/src/derived_chr.pl`
- Modify: `packages/core/tests/kb.plt`
- Optional later integration: `packages/core/src/checks.pl`

- [ ] **Step 1: Write tests comparing CHR pilot output to existing predicates**

Add tests for a small, bounded pilot set:

1. must-priority requirement lacking scenario/test ⇒ `derived_coverage_gap(Req, missing_scenario_and_test)`
2. production symbol without qualifying coverage ⇒ `derived_symbol_gap(Symbol, no_qualifying_production_coverage)`

The assertion shape should compare CHR-derived facts with existing `coverage_gap/2` and `symbol_no_req_coverage/2` for the same fixture data.

- [ ] **Step 2: Run tests to verify the new module is missing**

Run:

```bash
swipl -q -s packages/core/tests/kb.plt -g run_tests -t halt
```

Expected: FAIL with module/predicate missing.

- [ ] **Step 3: Create `derived_chr.pl`**

Implement as a non-invasive pilot:

```prolog
:- module(derived_chr, [
    derive_chr_facts/0,
    clear_chr_facts/0,
    derived_coverage_gap/2,
    derived_symbol_gap/2
]).

:- use_module(library(chr)).
:- use_module('kb.pl').

:- chr_constraint seen_must_req/1, seen_scenario/1, seen_test/1, seen_production_symbol/1, seen_symbol_req_coverage/1.
:- dynamic derived_coverage_gap/2.
:- dynamic derived_symbol_gap/2.

clear_chr_facts :-
    retractall(derived_coverage_gap(_, _)),
    retractall(derived_symbol_gap(_, _)).

derive_chr_facts :-
    clear_chr_facts,
    forall(kb:must_requirement(Req), seen_must_req(Req)),
    forall(kb:has_scenario(Req), seen_scenario(Req)),
    forall(kb:has_test(Req), seen_test(Req)),
    forall(kb:production_symbol(Symbol), seen_production_symbol(Symbol)),
    forall(kb:production_symbol_covered_for_requirement(Symbol, _), seen_symbol_req_coverage(Symbol)).
```

Then add CHR rules only for the pilot cases. If negation inside CHR rules becomes awkward, use CHR only for positive fact propagation and compute negative gaps after the snapshot pass; do not force a brittle CHR-only design.

- [ ] **Step 4: Keep CHR isolated**

Do not wire CHR into `check_all/1` yet. This module is a compatibility/performance pilot, not a behavior replacement.

- [ ] **Step 5: Run Prolog tests and coverage**

Run:

```bash
swipl -q -s packages/core/tests/kb.plt -g run_tests -t halt
bun run test:coverage:prolog
```

Expected: PASS.

- [ ] **Step 6: Commit checkpoint**

Suggested commit:

```bash
git add packages/core/src/derived_chr.pl packages/core/tests/kb.plt
git commit -m "feat(core): add chr derived fact pilot"
```

---

## Task 3: Add a Remote SPARQL Client Prolog Wrapper

**Files:**
- Create: `packages/core/src/sparql_client.pl`
- Modify: `packages/core/tests/kb.plt` or create a dedicated PLUnit test section

- [ ] **Step 1: Write wrapper tests with mocked/invalid endpoint behavior**

Do not require internet in the test suite. Test:

- empty endpoint fails cleanly
- empty query fails cleanly
- option validation rejects unsupported result formats

- [ ] **Step 2: Create `sparql_client.pl`**

Implement a thin wrapper:

```prolog
:- module(kibi_sparql_client, [
    remote_sparql_select_json/4
]).

:- use_module(library(semweb/sparql_client)).
:- use_module(library(http/json)).

remote_sparql_select_json(Endpoint, Query, Options, JsonString) :-
    must_be(atom, Endpoint),
    must_be(atom, Query),
    sparql_query(Query, Rows, [endpoint(Endpoint)|Options]),
    with_output_to(string(JsonString), json_write_dict(current_output, _{rows: Rows}, [])).
```

Adjust return conversion based on actual `sparql_query/3` result terms. Keep this module deliberately small.

- [ ] **Step 3: Run Prolog tests**

Run:

```bash
swipl -q -s packages/core/tests/kb.plt -g run_tests -t halt
```

Expected: PASS without network dependency.

- [ ] **Step 4: Commit checkpoint**

Suggested commit:

```bash
git add packages/core/src/sparql_client.pl packages/core/tests/kb.plt
git commit -m "feat(core): add remote sparql client wrapper"
```

---

## Task 4: Expose SPARQL Through MCP as an Explicit Remote Tool

**Files:**
- Create: `packages/mcp/src/tools/sparql.ts`
- Modify: `packages/mcp/src/tools-config.ts`
- Modify: `packages/mcp/src/server/tools.ts`
- Create: `packages/mcp/tests/tools/sparql.test.ts`

- [ ] **Step 1: Write MCP tool tests first**

Test these cases:

- handler rejects missing `endpoint`
- handler rejects missing `query`
- handler calls `runJsonModuleQuery` with `sparql_client.pl`
- handler surfaces Prolog failures as user-readable errors
- handler does not allow local file paths as endpoints

- [ ] **Step 2: Implement `packages/mcp/src/tools/sparql.ts`**

Follow existing tool handler style from `find-gaps.ts`, `coverage.ts`, and `graph.ts`:

```ts
import type { PrologProcess } from "kibi-cli/prolog";
import { runJsonModuleQuery, toPrologAtom } from "./core-module.js";

export interface SparqlArgs {
  endpoint: string;
  query: string;
  timeoutMs?: number;
}

export async function handleSparql(
  prolog: PrologProcess,
  args: SparqlArgs,
) {
  // validate endpoint starts with http:// or https://
  // escape query safely; if multiline atom escaping is awkward, add a codec helper instead of string concatenation hacks
}
```

Do not use `as any` or suppress types.

- [ ] **Step 3: Add tool schema in `tools-config.ts`**

Name suggestion: `kb_sparql_remote` to make remote behavior obvious.

Schema fields:

- `endpoint`: required string, HTTP(S) URL
- `query`: required string
- `timeoutMs`: optional number

- [ ] **Step 4: Wire server dispatch in `server/tools.ts`**

Follow the dispatch pattern used by existing tools.

- [ ] **Step 5: Run MCP tests and typecheck**

Run:

```bash
bun test --timeout 15000 --isolate --max-concurrency=1 ./packages/mcp/tests/tools/sparql.test.ts
bun run typecheck:mcp
bun run typecheck:mcp:tests
```

Expected: PASS.

- [ ] **Step 6: Commit checkpoint**

Suggested commit:

```bash
git add packages/mcp/src/tools/sparql.ts packages/mcp/src/tools-config.ts packages/mcp/src/server/tools.ts packages/mcp/tests/tools/sparql.test.ts
git commit -m "feat(mcp): expose remote sparql query tool"
```

---

## Task 5: Documentation and Changeset

**Files:**
- Modify: `docs/mcp-reference.md`
- Create: `.changeset/<generated-name>.md`

- [ ] **Step 1: Document aggregate and CHR as internal implementation changes**

In the relevant docs section, mention that aggregate/CHR are internal Prolog implementation details and do not change public KB semantics.

- [ ] **Step 2: Document the SPARQL MCP tool**

Add:

- tool name
- input schema
- remote-only endpoint behavior
- no credentials stored by Kibi
- network dependency warning
- sample query

- [ ] **Step 3: Add changeset**

Because this touches publishable packages, add a changeset. Use human-readable prose first:

```markdown
---
"kibi-core": patch
"kibi-mcp": patch
---

Kibi now uses more of SWI-Prolog's maintained standard library to make graph reporting clearer and to pilot derived validation facts internally. MCP users also get an opt-in remote SPARQL query tool for querying external RDF endpoints without changing Kibi's local RDF storage model.

- Refactored Prolog count/reporting code to use `library(aggregate)`.
- Added an internal CHR-derived facts pilot module.
- Added a remote SPARQL client wrapper and MCP tool.
```

- [ ] **Step 4: Run full relevant verification**

Run:

```bash
bun run test:coverage:prolog
bun run typecheck:mcp
bun run typecheck:mcp:tests
bun test --timeout 15000 --isolate --max-concurrency=1 ./packages/mcp/tests/tools/sparql.test.ts
bun run build:mcp
```

Expected: all commands exit 0.

- [ ] **Step 5: Final codebase checks**

Run:

```bash
bun run check
```

Expected: Biome reports no errors.

---

## Risk Controls

- `aggregate`: behavior-preserving only. Do not change public JSON shapes or sorting.
- CHR: pilot only. Do not replace `check_all/1` until benchmarked and proven equivalent.
- SPARQL: remote-only and explicit. Do not introduce a misleading local SPARQL API unless a local SPARQL server/endpoint is actually implemented.
- Network tests: avoid real external endpoints in unit tests.
- Package release hygiene: include a changeset for `kibi-core` and `kibi-mcp`.

## Acceptance Criteria

- Existing Prolog checks and discovery outputs remain byte-for-byte equivalent for covered tests after aggregate refactor.
- CHR pilot module produces the same pilot derived facts as the existing predicates for test fixtures.
- SPARQL tool validates inputs, delegates to `sparql_client.pl`, and handles Prolog errors cleanly.
- `bun run test:coverage:prolog`, MCP typechecks, focused MCP tests, `bun run build:mcp`, and `bun run check` all pass.
