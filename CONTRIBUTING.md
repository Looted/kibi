# CONTRIBUTING.md

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

## Testing

**Unit Tests (TypeScript/CLI)**
```bash
bun test                           # All tests
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
4. Run `bun test`
5. Run integration tests and benchmarks as above

## Commit Message Conventions

Use the following prefixes:
- `feat(scope): description` — New feature
- `fix(scope): description` — Bug fix
- `docs(scope): description` — Documentation changes
- `test(scope): description` — Test changes
- `chore(scope): description` — Build/config changes

## Pull Request Guidelines

- [ ] All tests pass (`bun test`)
- [ ] Code passes linting (`bun run check`)
- [ ] Integration tests pass (34/34)
- [ ] Documentation updated if needed
- [ ] Tests added for new features
- [ ] Commit messages follow conventions

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

If you ran `kibi init --hooks`, a pre-commit hook will automatically check your staged changes for missing requirement links. If any new or modified symbols are not linked to a requirement, your commit will be blocked with an error message. To proceed, add the appropriate `implements REQ-xxx` directive to your code.

You can test your staged changes manually with:

```bash
kibi check --staged
```

For more details, see the "Staged Symbol Traceability" section in the README.
