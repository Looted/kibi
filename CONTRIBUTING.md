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
bun test tests/integration/        # All integration tests
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
