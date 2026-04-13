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
