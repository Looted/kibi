# CONTRIBUTING.md

> **Note:** We are not accepting contributions at this moment. Feel free to [post an issue](https://github.com/Looted/kibi/issues) if you have feedback or suggestions.

## Development Setup

**Prerequisites**
- SWI-Prolog >= 9.0
- Bun (latest)
- Git

**Installation**
```bash
bun install
```

## Project Structure

```
packages/
  core/       # Prolog KB core (kb.pl, schema/*.pl)
  cli/        # Node.js CLI (commands, extractors, Prolog wrapper)
  mcp/        # MCP server (stdio, JSON-RPC)
  vscode/     # VS Code extension (TreeView)
tests/
  integration/  # End-to-end tests
  benchmarks/   # Performance benchmarks
```

## Maintainer docs

These are internal working documents, not user-facing product docs:

- [Brand guide](docs/brand-guide.md) — visual identity for the logo, HTML report, and badge
- [Proof readiness plan](docs/plans/2026-08-16-proof-readiness-plan.md) — bringing this repository's own proof from 0% to 100%

## Testing

**Unit Tests (TypeScript/CLI)**
```bash
bun run test                       # Project test pipeline (unit + packed local e2e)
bun run test:unit                  # All unit tests (packages/*)
bun test packages/cli/             # CLI tests only
bun test packages/mcp/             # MCP tests only
```

**Integration Tests**
```bash
bash ./scripts/run-integration-tests.sh
```

**Prolog Tests (plunit)**
```bash
swipl -g "load_test_files([]),run_tests" -t halt packages/core/tests/kb.plt
swipl -g "load_test_files([]),run_tests" -t halt packages/core/tests/schema.plt
```

## Benchmarks

Run performance benchmarks:
```bash
bun run tests/benchmarks/sync.bench.ts
bun run tests/benchmarks/query.bench.ts
bun run tests/benchmarks/mcp-latency.bench.ts
```

## Code Style

- Formatting and linting use Biome.
- Run lint: `bun run check`
- Run format: `bun run format`

## Running CI Locally

To simulate CI steps:
1. Install SWI-Prolog (via apt-get or package manager)
2. Install Bun
3. Run `bun install`
4. Run `bun run test`
5. Run integration tests and benchmarks as above

## Commit Message Conventions

Use the following prefixes:
- `feat(scope): description` — New feature
- `fix(scope): description` — Bug fix
- `docs(scope): description` — Documentation changes
- `test(scope): description` — Test changes
- `chore(scope): description` — Build/config changes

## Pull Request Guidelines

- [ ] All tests pass (`bun run test`)
- [ ] Code passes linting (`bun run check`)
- [ ] Integration tests pass (`bash ./scripts/run-integration-tests.sh`)
- [ ] Documentation updated if needed
- [ ] Tests added for new features
- [ ] Commit messages follow conventions

### KB Modeling Note

When documenting issues or workarounds in the KB:

- Use `fact` with `fact_kind: observation` or `meta` for bug records and workaround notes (**non-blocking lane**)
- Use `flag` only for actual runtime/config gates (not for bug records)
- **Strict facts** (subject, property_value) drive contradiction checks. `domain-contradictions` applies only to strict lane. `strict-fact-shape` is a default-off migration check.
- Use `flag` only for actual runtime/config gates (not for bug records)
- See [Entity Schema](docs/entity-schema.md) and [AGENTS.md](AGENTS.md) for the canonical entity-choice guidance
---

Clear, practical, and ready for contributors.

## Staged Symbol Traceability: Contributor Guidelines

To help maintain traceability between code and requirements, all new or modified code symbols (functions, classes, modules) must be linked to at least one documented requirement before commit.

### How to add requirement links to new code

When you add or change a function, class, or module, include a comment with the requirement ID(s) it implements. Example:

```typescript
export function myFunc() { } // implements REQ-001
```

For multiple requirements:

```typescript
export class MyClass { } // implements REQ-001, REQ-002
```

This applies to TypeScript (`.ts`, `.tsx`) and JavaScript (`.js`, `.jsx`) files by default.

### How the pre-commit hook works

If you ran `kibi init`, a pre-commit hook will automatically check your staged changes. The hook enforces two hard gates:

1. **Symbol traceability**: New or modified symbols must be linked to a requirement via `// implements REQ-xxx` directives. If any staged symbol lacks a requirement link, the commit is blocked.

2. **Kibi impact evidence for behavior changes**: Behavior-changing source edits must include staged Kibi impact evidence — either updated KB entity markdown (requirements, scenarios, tests, facts, ADRs, flags, events) or a refreshed `documentation/symbols.yaml` when symbol coordinates change. Test-only edits (`tests/`, `*.test.*`, `*.spec.*`) and docs-only edits (`.md`) are exempt.

If `kibi check --staged` reports `kibi_impact_evidence_missing` or `symbols_manifest_stale`, resolve by:
- Querying Kibi via MCP before behavior changes
- Staging relevant KB entity docs or symbol manifest changes
- Running `kibi check --staged` to verify

The hook also blocks commits when `documentation/symbols.yaml` has unstaged changes. Stage and commit the refreshed manifest with the code or documentation change that caused it.

You can test your staged changes manually with:

```bash
npx kibi check --staged
```

For more details, see the "Staged Symbol Traceability" section in the README.

If you ran `kibi init`, a pre-commit hook will automatically check your staged changes for missing requirement links. If any new or modified symbols are not linked to a requirement, your commit will be blocked with an error message. To proceed, add the appropriate `implements REQ-xxx` directive to your code.

The hook also blocks commits when `documentation/symbols.yaml` has unstaged changes. Stage and commit the refreshed manifest with the code or documentation change that caused it.

You can test your staged changes manually with:

```bash
npx kibi check --staged
```

For more details, see the "Staged Symbol Traceability" section in the README.
