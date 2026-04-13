# Learnings

## Conventions
- Prolog schema files are authoritative for relationship/entity validity.
- JSON schemas in `packages/cli/src/schemas/` must stay synchronized with Prolog definitions.
- TDD-first approach: write failing tests before schema/implementation changes.
- Inline `// implements REQ-xxx` comments are production-code-only backward compatibility.
- Tags are search metadata only; they must not be used as authoritative traceability truth.

## Decisions
- `executable_for` is the new dedicated `symbol -> test` relation for executable test code.
- `implements` stays `symbol -> req` only.
- `covered_by` stays production `symbol -> test` coverage evidence only.
- Scenario↔test becomes first-class via `verified_by(scenario, test)` / `validates(test, scenario)`.
- Direct `req -> test` is fallback-only when no active scenario exists for a requirement.
- `symbol-traceability` = dead-code / ownership rule (direct `implements`).
- `symbol-coverage` = production test-coverage rule (qualifying `covered_by`).
- Requirement facts + typed test fields are the authoritative semantics layer.
- Mixed-role symbols (both `executable_for` and production ownership/coverage) are invalid.

## Patterns
- `transitively_implements/2` currently conflates ownership and coverage; it must be split.
- `packages/core/src/checks.pl` drives the violation text that users and MCP surfaces see.
- `packages/cli/src/utils/rule-registry.ts` holds the human-readable rule descriptions.
- Staged temp-KB overlay facts (`changed_symbol_req/2`) are requirement-link only.

## Gotchas
- Changing relationship schemas will break tests that assert exact relationship enum counts.
- VS Code `treeProvider.ts` has hardcoded relationship type lists that must be updated.
- OpenCode prompt text is budget-constrained; updates must preserve `MAX_BULLETS`/`MAX_WORDS`.
- Full-suite pollution is a real risk when mocking `vscode` or `node:fs` without cleanup.
- MCP upsert relationship JSON schema still rejects new relationship types until its allowed-values layer is updated separately; use direct Prolog relationship insertion in tests when you need to exercise newly added schema edges before that contract is widened.
- The canonical split now behaves as: `implements` = ownership (`symbol-traceability`), `covered_by` + canonical req/scenario path = coverage (`symbol-coverage`), and `executable_for` marks test code only.
- Scenario-aware fallback matters: direct `req -> test` coverage is accepted only when the requirement has no `specified_by` scenario; once a scenario exists, coverage must flow through scenario↔test edges.
- Downstream consumers must be updated in lockstep for new relationship types: CLI JSON schema enums, docs relationship tables/examples, and VS Code hardcoded label/parser lists.
- VS Code relationship rendering uses `REL_LABELS` for human-readable child nodes and a separate `relTypes` allowlist for RDF extraction, so new edges need both updates plus focused tests.
- Optional typed test fields require lockstep updates across Prolog entity properties, Prolog shape validation, CLI JSON schema conditionals, and markdown extraction guards.
- `tags` must stay metadata-only in docs and extraction logic; typed verification semantics come only from explicit `verification_scope` / `verification_perspective` fields.

- Task 4 note: MCP check tests share a long-lived Prolog process, so per-test kb_attach/kb_detach isolation plus explicit 15s timeouts prevents cross-test state leakage from masking symbol-coverage semantics.
- Task 4 note: verification test semantics stay compatibility-first: direct req->test fallback must pass when no scenario exists and no verification facts are present, while executable_for symbols are excluded from production untested/orphaned reports.

- Task 7 note: OpenCode prompt guidance now teaches split traceability semantics: `implements` for ownership, `executable_for` for test code identity, `covered_by` for coverage evidence only. Old `covered_by + validates/verified_by` combo pattern fully removed from all prompt surfaces (GUIDANCE_BY_RISK, BASE_GUIDANCE, legacy fallback, comment suggestion guidance).
- Task 7 note: risk-classifier.test.ts and aaa-index.coverage.test.ts needed no changes — they test classification/routing logic, not prompt wording.
- Task 7 note: `safe_test_only` stays null and single-block budget (MAX_BULLETS=5, MAX_WORDS=117) preserved. All 118 tests pass.

- Task 6 note: MCP graph.test.ts already had scenario↔test traversal tests (verified_by/validates) from task 4. Task 6 added canonical chain traversal (req→scenario→test at depth 2), req→test fallback when no scenario exists, and executable_for graph traversal.
- Task 6 note: MCP check.test.ts already had extensive split semantics tests. Task 6 added three new tests: scenario verified_by chain coverage, executable_for + implements traceability pass, and test validates scenario specified_by requirement coverage.
- Task 6 note: treeProvider.ts was already complete — executable_for was in both REL_LABELS and relTypes from task 2. No production code changes needed.
- Task 6 note: treeProvider.test.ts added scenario↔test verification edge rendering test showing verified_by outgoing and validates incoming labels on scenario entities.
- Task 6 note: traceability.test.ts added two new describe blocks testing inline RDF parsing of executable_for/verified_by/validates edges and the full canonical req→scenario→test chain from RDF.
- Task 6 note: When using prepend to insert tests before a describe block, ensure they end up inside the parent describe scope (where prolog is defined), not between describe blocks where they become orphans.
## Artifacts and Documentation Migration (Task 8)
- Canonical Chain (REQ → SCEN → TEST): Successfully migrated all internal Kibi documentation artifacts in `documentation/requirements/`, `documentation/scenarios/`, and `documentation/tests/`. All direct `REQ` → `TEST` links were replaced with `REQ` → `SCEN` and `SCEN` → `TEST` links where scenarios exist.
- Relation Semantics (Ownership vs Coverage vs Identity): Human-facing documentation (`docs/entity-schema.md`, `AGENTS.md`) and agent guidance (OpenCode prompts, Copilot instructions) now consistently teach:
  - `implements`: Production symbol ownership of a requirement.
  - `covered_by`: Production symbol coverage by a test.
  - `executable_for`: Test symbol identity (link to a `TEST-*` entity).
  - `verified_by` / `validates`: Link between scenario and test (or fallback to req if no scenario).
- Symbols Manifest: Updated `documentation/symbols.yaml` with role-distinguished examples for both production and test symbols.
- Audit: Performed a comprehensive `grep` audit of the `documentation/` directory to ensure no leftover direct `verified_by` links remain in requirements that have associated scenarios, and no tests directly `validate` requirements that have scenarios.
