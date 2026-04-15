2026-04-15
- `packages/cli/tests/commands/sync` still has unrelated type diagnostics in `staging.test.ts` (copyFileSync PathLike mismatch) outside this task's scope.
2026-04-15: `fast-glob` mocks may need a cast to `typeof fg` when passed through `Partial<...>` deps, because Bun's `mock()` return type does not satisfy the callable-object shape.

- Verification gotcha: a temporary probe line beginning with `// @ts-nocheck ...` still activates TypeScript nocheck semantics, so it is invalid for proving non-zero typecheck behavior.
## 2026-04-15
- Temporary type error injection is useful for proving CI fail-fast behavior, but must be removed before commit to avoid polluting the repo.
