---
id: ADR-005
title: TypeScript for E2E Testing
status: accepted
created_at: 2026-03-03T20:00:00Z
updated_at: 2026-03-03T20:00:00Z
tags:
  - testing
  - typescript
  - e2e
  - architecture
---

# ADR-005: TypeScript for E2E Testing

## Context

Our E2E tests were initially written in JavaScript (`.mjs`) to avoid compilation complexity. However, this leads to:

1. **Runtime errors** that could be caught at compile time
2. **No IDE support** for refactoring and autocomplete
3. **Poor documentation** - types serve as documentation
4. **Difficulty maintaining** the test harness as it grows

As we migrate more integration tests to Docker-based E2E testing, we need a type-safe approach.

## Decision

**All E2E and integration tests will be written in TypeScript and compiled before execution.**

### Key Decisions

1. **Compile-first approach**: Use `tsc` to compile TypeScript to JavaScript before running tests
2. **ESM output**: Target ESM (not CommonJS) for consistency with Node.js native test runner
3. **Separate tsconfig**: E2E tests have their own `tsconfig.e2e.json` with strict settings
4. **Node.js test runner**: Continue using built-in `node:test` (not Jest/Vitest)
5. **Source maps enabled**: `NODE_OPTIONS=--enable-source-maps` for debugging

### Rationale

| Approach | Pros | Cons |
|----------|------|------|
| **Compile-first (chosen)** | Maximum type safety, catches errors early, IDE support, debuggable with source maps | Requires build step |
| ts-node/tsx | No build step, faster development | Slower execution, less stable in Docker, type errors at runtime |
| Keep JavaScript | Simple, no build | No type safety, harder maintenance |

## Implementation

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "types": ["node"],
    "strict": true,
    "noEmitOnError": true,
    "sourceMap": true,
    "declaration": false,
    "outDir": "./dist",
    "rootDir": ".",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["*.ts"],
  "exclude": ["dist"]
}
```

Key settings:
- `module: "NodeNext"` and `moduleResolution: "NodeNext"` for proper ESM support
- `strict: true` for maximum type safety
- `noEmitOnError: true` to prevent running tests with type errors
- `sourceMap: true` for debugging stack traces

### Directory Structure

```
documentation/tests/e2e/packed/
├── tsconfig.e2e.json      # E2E-specific TypeScript config
├── helpers.ts             # Test harness (typed)
├── cli-workflows.test.ts  # E2E tests (typed)
├── hooks.test.ts
├── mcp.test.ts
└── dist/                  # Compiled JavaScript (gitignored)
    ├── helpers.js
    ├── cli-workflows.test.js
    └── ...
```

### Docker Integration

Tests are compiled during the Docker image build stage:

```dockerfile
# Compile TypeScript tests
COPY documentation/tests/e2e/packed/*.ts ./tests/
COPY documentation/tests/e2e/packed/tsconfig.e2e.json ./tests/
RUN npx tsc -p ./tests/tsconfig.e2e.json --outDir ./tests/dist
```

Then run compiled tests:

```bash
node --test dist/*.test.js
```

### Type Safety Benefits

1. **TestSandbox interface**: All sandbox properties are typed
2. **Spawn results**: Return types for `run()`, `kibi()`, `kibiMcp()` functions
3. **Environment variables**: Typed `ProcessEnv` for test isolation
4. **Catch errors at compile time**: Missing properties, wrong types, etc.

## Consequences

### Positive

- Type safety catches errors before runtime
- IDE autocomplete and refactoring support
- Self-documenting test code via types
- Easier to maintain and extend test harness
- Source maps enable proper debugging

### Negative

- Build step required before running tests
- Slightly more complex Docker setup
- Must manage `.js` imports in TypeScript files (ESM requirement)

## Migration Path

1. Create `tsconfig.e2e.json` with strict settings
2. Convert `helpers.mjs` → `helpers.ts` with proper interfaces
3. Convert existing `.test.mjs` files to `.test.ts`
4. Update Docker entrypoint to run compiled tests
5. Update npm scripts for TypeScript workflow
6. Migrate integration tests from `documentation/tests/integration/` to TypeScript Docker tests

## Related

- ADR-004: E2E Testing Architecture
- All E2E tests in `documentation/tests/e2e/packed/`
- Integration tests being migrated from `documentation/tests/integration/`

## References

- [Oracle consultation on TS E2E patterns](../.sisyphus/oracle-consultations/ts-e2e-patterns.md)
- Node.js TypeScript ESM best practices (2024-2025)
