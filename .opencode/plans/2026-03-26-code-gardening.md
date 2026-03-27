# Code Gardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce duplication, improve testability, and clean up code smells across the kibi monorepo without changing external behavior. This is a pure internal quality improvement.

**Architecture:** Work proceeds in dependency order: shared types/utilities first (they unblock everything else), then dead code removal, then higher-level refactors. Each task produces a single conventional commit. No functional behavior changes.

**Tech Stack:** TypeScript, Bun test, Commander.js, SWI-Prolog (read-only for this plan).

---

## File Map

### New files
- Create: `packages/cli/src/utils/prolog-cleanup.ts` — shared safe Prolog teardown helper
- Create: `packages/cli/src/public/check-types.ts` — shared `Violation`, `ChecksConfig`, rule exports for cross-package use
- Create: `packages/cli/tests/utils/prolog-cleanup.test.ts` — tests for the cleanup helper

### Modified files (by task)
- Modify: `packages/cli/src/prolog/codec.ts` — remove duplicate `splitTopLevel`, keep `splitTopLevelGeneral`
- Modify: `packages/cli/src/commands/query.ts` — update import to `splitTopLevelGeneral`
- Modify: `packages/mcp/src/tools/prolog-list.ts` — import `splitTopLevelGeneral` from `kibi-cli/prolog/codec` instead of local copy
- Modify: `packages/mcp/tests/tools/query.test.ts` — update import name
- Modify: `packages/cli/package.json` — add `./public/check-types` sub-path export
- Modify: `packages/mcp/tsconfig.json` — add path mapping for `kibi-cli/public/check-types`
- Modify: `packages/mcp/src/tools/check.ts` — import shared types instead of local redefinition
- Modify: `packages/cli/src/commands/check.ts` — import shared `Violation`, replace `process.exit()` with return values
- Modify: `packages/cli/src/commands/sync.ts` — replace `process.exit()` with return values, remove bizarre try/catch around `console.log`
- Modify: `packages/cli/src/commands/doctor.ts` — replace `process.exit()` with return values
- Modify: `packages/cli/src/commands/init.ts` — replace `process.exit()` with return values
- Modify: `packages/cli/src/commands/query.ts` — replace remaining `process.exit()` with `process.exitCode` pattern
- Modify: `packages/cli/src/cli.ts` — switch to `parseAsync()`, add top-level error handler with exit code management
- Modify: `packages/cli/src/commands/discovery-shared.ts` — use `safeCleanupProlog()`
- Modify: `packages/cli/src/traceability/symbol-extract.ts` — add comments to empty catch blocks, remove no-op ternary
- Modify: `packages/opencode/src/config.ts` — remove unreachable `if (!validated)` branch, fix `as any` cast

### Deleted files
- Delete: `packages/cli/src/kb/target-resolver.ts` — dead code, zero importers

---

## Traceability note

- New utility functions must carry `// implements REQ-XXX` annotations matching the requirement they support.
- `prolog-cleanup.ts` implements the same requirements as the Prolog teardown code it replaces.
- `check-types.ts` implements the same requirements as `rule-registry.ts`.

### Deliberate non-goals for this slice

- Do **not** create a `git-client.ts` abstraction (large scope, separate plan).
- Do **not** refactor `process.cwd()` injection (77 sites, separate plan).
- Do **not** break up `treeProvider.ts` (vscode package, separate plan).
- Do **not** add missing test files for the 25 uncovered files (separate plan).
- Do **not** add JSDoc or README documentation (separate plan).
- Do **not** refactor `PrologProcess` internals (separate plan).

---

### Task 1: Deduplicate `splitTopLevel` in codec.ts

There are **three copies** of the same `splitTopLevel(str, delimiter)` function:
1. `packages/cli/src/prolog/codec.ts:63` — `splitTopLevel`
2. `packages/cli/src/prolog/codec.ts:344` — `splitTopLevelGeneral` (functionally identical, used by codec internals)
3. `packages/mcp/src/tools/prolog-list.ts:105` — local `splitTopLevel` (private copy)

**Files:**
- Modify: `packages/cli/src/prolog/codec.ts:63-119` (delete `splitTopLevel`)
- Modify: `packages/cli/src/prolog/codec.ts:344` (keep `splitTopLevelGeneral`, add `splitTopLevel` as alias)
- Modify: `packages/cli/src/commands/query.ts:28` (update import)
- Modify: `packages/mcp/src/tools/prolog-list.ts:105-168` (delete local copy, import from codec)
- Modify: `packages/mcp/tests/tools/query.test.ts:9,18-41` (update import name)

- [ ] **Step 1: Run existing tests to establish baseline**

Run: `bun test packages/cli/tests/ packages/mcp/tests/ --timeout 30000`
Expected: All tests pass.

- [ ] **Step 2: In codec.ts, delete `splitTopLevel` (lines 63-119) and add a re-export alias next to `splitTopLevelGeneral`**

In `packages/cli/src/prolog/codec.ts`, remove the `splitTopLevel` function (lines 63-119). Then, after the `splitTopLevelGeneral` function definition (around line 344, which will shift after deletion), add:

```ts
/**
 * Alias kept for backward-compatible imports.
 * @see splitTopLevelGeneral
 */
export const splitTopLevel = splitTopLevelGeneral; // implements REQ-009
```

- [ ] **Step 3: Update query.ts import**

In `packages/cli/src/commands/query.ts`, the import at line 28 already imports `splitTopLevel` from `"../prolog/codec.js"`. Since we added the alias, this import still works. No change needed — verify it compiles.

- [ ] **Step 4: Delete local copy in prolog-list.ts and import from kibi-cli**

In `packages/mcp/src/tools/prolog-list.ts`, delete the local `splitTopLevel` function (lines 105-168). Add an import at the top:

```ts
import { splitTopLevel } from "kibi-cli/prolog/codec";
```

Note: The MCP package's tsconfig.json already has a path mapping for `kibi-cli/prolog/codec` → `../cli/dist/prolog/codec`.

- [ ] **Step 5: Update test import**

In `packages/mcp/tests/tools/query.test.ts`, update the import at line 9 to use the canonical source:

```ts
import { splitTopLevel } from "kibi-cli/prolog/codec";
```

If the test file currently imports from a local path, update it to use the sub-path export.

- [ ] **Step 6: Run tests to verify**

Run: `bun test packages/cli/tests/ packages/mcp/tests/ --timeout 30000`
Expected: All tests pass. No behavioral change.

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/prolog/codec.ts packages/cli/src/commands/query.ts packages/mcp/src/tools/prolog-list.ts packages/mcp/tests/tools/query.test.ts
git commit -m "refactor: deduplicate splitTopLevel into single canonical function in codec.ts"
```

---

### Task 2: Delete dead code — `target-resolver.ts`

`packages/cli/src/kb/target-resolver.ts` (431 lines) has **zero importers** anywhere in the codebase. It is a superset of `branch-resolver.ts` + MCP's `workspace.ts`, but nothing references it. It also contains a bug at line 206 (catch block references unbound `error` variable). Safe to delete.

**Files:**
- Delete: `packages/cli/src/kb/target-resolver.ts`

- [ ] **Step 1: Verify zero importers (safety check)**

Run: `grep -r "target-resolver" packages/ --include="*.ts" -l`
Expected: Only `packages/cli/src/kb/target-resolver.ts` itself appears (the file being deleted). No other file imports from it.

- [ ] **Step 2: Delete the file**

Delete `packages/cli/src/kb/target-resolver.ts`.

- [ ] **Step 3: Run tests to confirm nothing breaks**

Run: `bun test packages/cli/tests/ --timeout 30000`
Expected: All tests pass. No test imported this file.

- [ ] **Step 4: Commit**

```bash
git add packages/cli/src/kb/target-resolver.ts
git commit -m "chore: remove dead code target-resolver.ts (zero importers)"
```

---

### Task 3: Extract shared Prolog cleanup helper

Six identical empty catch blocks exist for the Prolog teardown pattern `try { await prolog.query("kb_detach"); } catch {} try { await prolog.terminate(); } catch {}` in:
- `packages/cli/src/commands/check.ts:353-357`
- `packages/cli/src/commands/query.ts:220-224`
- `packages/cli/src/commands/discovery-shared.ts:50-54, 74`

**Files:**
- Create: `packages/cli/src/utils/prolog-cleanup.ts`
- Create: `packages/cli/tests/utils/prolog-cleanup.test.ts`
- Modify: `packages/cli/src/commands/check.ts` (use helper in finally block)
- Modify: `packages/cli/src/commands/query.ts` (use helper in finally block)
- Modify: `packages/cli/src/commands/discovery-shared.ts` (use helper in both finally blocks)

- [ ] **Step 1: Write the failing test**

Create `packages/cli/tests/utils/prolog-cleanup.test.ts`:

```ts
import { describe, expect, it, mock } from "bun:test";
import { safeCleanupProlog } from "../../src/utils/prolog-cleanup.js";

describe("safeCleanupProlog", () => {
  it("detaches and terminates prolog without throwing", async () => {
    const queryFn = mock(() => Promise.resolve(""));
    const terminateFn = mock(() => Promise.resolve());
    const prolog = { query: queryFn, terminate: terminateFn } as any;

    await safeCleanupProlog(prolog);

    expect(queryFn).toHaveBeenCalledWith("kb_detach");
    expect(terminateFn).toHaveBeenCalledTimes(1);
  });

  it("still terminates if detach throws", async () => {
    const queryFn = mock(() => Promise.reject(new Error("detach failed")));
    const terminateFn = mock(() => Promise.resolve());
    const prolog = { query: queryFn, terminate: terminateFn } as any;

    await safeCleanupProlog(prolog);

    expect(terminateFn).toHaveBeenCalledTimes(1);
  });

  it("does not throw if terminate throws", async () => {
    const queryFn = mock(() => Promise.resolve(""));
    const terminateFn = mock(() => Promise.reject(new Error("terminate failed")));
    const prolog = { query: queryFn, terminate: terminateFn } as any;

    await expect(safeCleanupProlog(prolog)).resolves.toBeUndefined();
  });

  it("handles null/undefined prolog gracefully", async () => {
    await expect(safeCleanupProlog(null as any)).resolves.toBeUndefined();
    await expect(safeCleanupProlog(undefined as any)).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/cli/tests/utils/prolog-cleanup.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `packages/cli/src/utils/prolog-cleanup.ts`:

```ts
/**
 * Best-effort Prolog process cleanup.
 * Detaches the KB and terminates the process, swallowing any errors.
 * Safe to call in finally blocks where the process may already be dead.
 */
export async function safeCleanupProlog(
  prolog: { query: (q: string) => Promise<unknown>; terminate: () => Promise<void> } | null | undefined,
): Promise<void> { // implements REQ-003
  if (!prolog) return;
  try {
    await prolog.query("kb_detach");
  } catch {
    // best-effort: process may already be dead
  }
  try {
    await prolog.terminate();
  } catch {
    // best-effort: process may already be dead
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test packages/cli/tests/utils/prolog-cleanup.test.ts`
Expected: All 4 tests pass.

- [ ] **Step 5: Replace inline teardown in check.ts, query.ts, discovery-shared.ts**

In each file, replace the `finally` block containing the duplicated `try/catch` pairs with:

```ts
import { safeCleanupProlog } from "../utils/prolog-cleanup.js";
// ...
} finally {
  await safeCleanupProlog(prolog);
}
```

Files and approximate locations:
- `packages/cli/src/commands/check.ts`: lines 349-359 (the finally block)
- `packages/cli/src/commands/query.ts`: lines 215-226 (the finally block)
- `packages/cli/src/commands/discovery-shared.ts`: lines 47-56 (first finally) and lines 71-76 (second finally, inside `withPrologProcess`)

- [ ] **Step 6: Run tests to verify**

Run: `bun test packages/cli/tests/ --timeout 30000`
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/utils/prolog-cleanup.ts packages/cli/tests/utils/prolog-cleanup.test.ts packages/cli/src/commands/check.ts packages/cli/src/commands/query.ts packages/cli/src/commands/discovery-shared.ts
git commit -m "refactor: extract safeCleanupProlog helper to eliminate 6 duplicated teardown patterns"
```

---

### Task 4: Export shared check types from CLI for MCP consumption

`Violation`, `ChecksConfig`, `RULE_NAMES`, and `DEFAULT_CHECKS_CONFIG` are duplicated between `packages/cli/src/commands/check.ts` + `packages/cli/src/utils/rule-registry.ts` and `packages/mcp/src/tools/check.ts`. The CLI versions are canonical.

**Files:**
- Create: `packages/cli/src/public/check-types.ts` (re-export barrel)
- Modify: `packages/cli/package.json` (add sub-path export)
- Modify: `packages/mcp/tsconfig.json` (add path mapping)
- Modify: `packages/cli/src/commands/check.ts` (move `Violation` to rule-registry)
- Modify: `packages/cli/src/utils/rule-registry.ts` (add `Violation` interface)
- Modify: `packages/mcp/src/tools/check.ts` (import from CLI instead of local definitions)

- [ ] **Step 1: Move `Violation` into `rule-registry.ts`**

In `packages/cli/src/utils/rule-registry.ts`, add the `Violation` interface (currently at `check.ts:62-68`):

```ts
/** A single KB check violation. */
export interface Violation {
  rule: string;
  entityId: string;
  description: string;
  suggestion?: string;
  source?: string;
}
```

- [ ] **Step 2: Update check.ts to import `Violation` from rule-registry**

In `packages/cli/src/commands/check.ts`, remove the local `Violation` interface definition (lines 62-68) and add:

```ts
import type { Violation } from "../utils/rule-registry.js";
```

Also update the existing import from rule-registry to include `Violation`.

- [ ] **Step 3: Create the public re-export barrel**

Create `packages/cli/src/public/check-types.ts`:

```ts
export type {
  ChecksConfig,
  RuleDefinition,
  SymbolTraceabilityOptions,
  Violation,
} from "../utils/rule-registry.js";

export {
  DEFAULT_CHECKS_CONFIG,
  RULE_NAMES,
  RULES,
  getEffectiveRules,
  mergeChecksConfig,
  validateRuleName,
} from "../utils/rule-registry.js";
```

- [ ] **Step 4: Add sub-path export to CLI package.json**

In `packages/cli/package.json`, add to the `exports` field:

```json
"./public/check-types": {
  "types": "./dist/public/check-types.d.ts",
  "default": "./dist/public/check-types.js"
}
```

- [ ] **Step 5: Add path mapping to MCP tsconfig.json**

In `packages/mcp/tsconfig.json`, add to the `paths` field:

```json
"kibi-cli/public/check-types": ["../cli/dist/public/check-types"]
```

- [ ] **Step 6: Update MCP check.ts to use shared types**

In `packages/mcp/src/tools/check.ts`, replace the local definitions (lines 51-87) with imports:

```ts
import {
  DEFAULT_CHECKS_CONFIG,
  RULE_NAMES,
  type ChecksConfig,
  type Violation,
} from "kibi-cli/public/check-types";
```

Remove the locally-defined `ALL_RULES`, `RULE_NAMES`, `ChecksConfig`, `DEFAULT_CHECKS_CONFIG`, and `Violation`.

- [ ] **Step 7: Build and run tests**

Run: `bun run build && bun test packages/cli/tests/ packages/mcp/tests/ --timeout 30000`
Expected: Build succeeds. All tests pass.

- [ ] **Step 8: Commit**

```bash
git add packages/cli/src/utils/rule-registry.ts packages/cli/src/commands/check.ts packages/cli/src/public/check-types.ts packages/cli/package.json packages/mcp/tsconfig.json packages/mcp/src/tools/check.ts
git commit -m "refactor: deduplicate Violation, ChecksConfig, and rule definitions between CLI and MCP"
```

---

### Task 5: Replace `process.exit()` with return values in CLI commands

Currently, 5 command files call `process.exit()` directly from business logic (24 total calls). This prevents unit testing and bypasses `finally` cleanup. The fix is:
1. Commands return a result with an exit code
2. `cli.ts` handles exit codes at the boundary
3. Switch `cli.ts` from `program.parse()` to `program.parseAsync()`

This task is the largest and is broken into sub-steps per file.

**Files:**
- Modify: `packages/cli/src/cli.ts`
- Modify: `packages/cli/src/commands/check.ts`
- Modify: `packages/cli/src/commands/sync.ts`
- Modify: `packages/cli/src/commands/doctor.ts`
- Modify: `packages/cli/src/commands/init.ts`
- Modify: `packages/cli/src/commands/query.ts`

#### Step group A: Define the result type convention and update cli.ts

- [ ] **Step A1: Add a `CommandResult` type to cli.ts and switch to `parseAsync()`**

In `packages/cli/src/cli.ts`, add near the top:

```ts
/** All command handlers should return this instead of calling process.exit(). */
export interface CommandResult {
  exitCode: number;
}
```

At the bottom, replace `program.parse(process.argv)` with:

```ts
program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
```

This ensures unhandled async errors are caught and the process exits cleanly.

- [ ] **Step A2: Add an exit-code wrapper helper in cli.ts**

Add a helper that wraps command handlers to handle the result:

```ts
function withExitCode(fn: (...args: any[]) => Promise<CommandResult | void>): (...args: any[]) => Promise<void> {
  return async (...args: any[]) => {
    const result = await fn(...args);
    if (result && typeof result.exitCode === "number") {
      process.exitCode = result.exitCode;
    }
  };
}
```

Then update each `.action()` registration to use it. For example:

```ts
.action(withExitCode(async (options) => checkCommand(options)))
```

This allows a gradual migration: commands that still return `void` (and call `process.exit`) keep working, while migrated commands return `CommandResult`.

#### Step group B: Migrate `doctor.ts` (simplest, 2 exits)

- [ ] **Step B1: Refactor `doctorCommand` to return `CommandResult`**

In `packages/cli/src/commands/doctor.ts`:
- Change return type from `Promise<void>` to `Promise<CommandResult>`
- Replace `process.exit(0)` at line 81 with `return { exitCode: 0 }`
- Replace `process.exit(1)` at line 84 with `return { exitCode: 1 }`

- [ ] **Step B2: Update cli.ts registration for doctor**

In `cli.ts`, wrap the doctor action with `withExitCode`.

- [ ] **Step B3: Run tests**

Run: `bun test packages/cli/tests/ --timeout 30000`
Expected: All tests pass.

#### Step group C: Migrate `init.ts` (3 exits)

- [ ] **Step C1: Refactor `initCommand` to return `CommandResult`**

In `packages/cli/src/commands/init.ts`:
- Change return type to `Promise<CommandResult>`
- Replace `process.exit(1)` at line 61 with `return { exitCode: 1 }`
- Replace `process.exit(0)` at line 94 with `return { exitCode: 0 }`
- Replace `process.exit(1)` at line 97 with `return { exitCode: 1 }`

- [ ] **Step C2: Update cli.ts registration for init**

Wrap with `withExitCode`.

- [ ] **Step C3: Run tests**

Run: `bun test packages/cli/tests/ --timeout 30000`
Expected: All tests pass.

#### Step group D: Migrate `query.ts` (2 exits + 3 exitCode)

- [ ] **Step D1: Refactor `queryCommand` to return `CommandResult`**

In `packages/cli/src/commands/query.ts`:
- Change return type to `Promise<CommandResult>`
- Replace `process.exit(1)` at lines 87 and 101 with `return { exitCode: 1 }`
- Replace `process.exitCode = 1; return;` at lines 140, 188 with `return { exitCode: 1 }`
- Replace `process.exitCode = 1` at line 214 (catch block) with storing the exit code and returning it
- Add `return { exitCode: 0 }` at the end of the success path

- [ ] **Step D2: Update cli.ts registration for query**

Wrap with `withExitCode`.

- [ ] **Step D3: Run tests**

Run: `bun test packages/cli/tests/ --timeout 30000`
Expected: All tests pass.

#### Step group E: Migrate `sync.ts` (4 exits)

- [ ] **Step E1: Refactor `syncCommand` to return `CommandResult` on validate-only paths**

In `packages/cli/src/commands/sync.ts`:
- Change return type from `Promise<SyncSummary>` to `Promise<SyncSummary & { exitCode?: number }>`
- Replace `process.exit(1)` at line 239 with `return { ...emptySummary, exitCode: 1 }`
- Replace `process.exit(0)` at line 261 with adding `exitCode: 0` to the returned summary
- Replace `process.exit(1)` at line 338 with `return { ...summary, exitCode: 1 }`
- Replace `process.exit(0)` at line 342 with `return { ...summary, exitCode: 0 }`

Note: `syncCommand` is only imported by `cli.ts`. The return type can safely change to `Promise<SyncSummary & CommandResult>` (or `SyncSummary & { exitCode: number }`) since the only consumer is the CLI wrapper.

- [ ] **Step E2: Remove the bizarre try/catch around `console.log`**

At lines 120 and 135, remove the `try { console.log(...) } catch {}` wrappers, leaving just the `console.log` calls (still inside the `if (process.env.KIBI_DEBUG)` guard).

- [ ] **Step E3: Update cli.ts registration for sync**

Wrap with `withExitCode` and extract exitCode from the result.

- [ ] **Step E4: Run tests**

Run: `bun test packages/cli/tests/ --timeout 30000`
Expected: All tests pass.

#### Step group F: Migrate `check.ts` (13 exits — the big one)

- [ ] **Step F1: Refactor `checkCommand` to return `CommandResult`**

In `packages/cli/src/commands/check.ts`:
- Change return type to `Promise<CommandResult>`
- Replace every `process.exit(0)` with `return { exitCode: 0 }`
- Replace every `process.exit(1)` with `return { exitCode: 1 }`

This is a mechanical replacement. The 13 call sites are at lines: 139, 162, 164, 184, 189, 210, 212, 217, 227, 240, 327, 343, 347.

The function's structure stays the same for now (staged vs. full mode in one function). Splitting into `checkStaged()` + `checkFull()` is a possible follow-up but not required for this plan.

- [ ] **Step F2: Update cli.ts registration for check**

Wrap with `withExitCode`.

- [ ] **Step F3: Run all tests**

Run: `bun test packages/cli/tests/ packages/mcp/tests/ --timeout 30000`
Expected: All tests pass.

- [ ] **Step F4: Commit all process.exit migrations**

```bash
git add packages/cli/src/cli.ts packages/cli/src/commands/check.ts packages/cli/src/commands/sync.ts packages/cli/src/commands/doctor.ts packages/cli/src/commands/init.ts packages/cli/src/commands/query.ts
git commit -m "refactor: replace process.exit() with CommandResult returns in all CLI commands"
```

---

### Task 6: Annotate empty catch blocks and fix minor dead code

Addresses the 18 truly empty catch blocks that need comments, the no-op ternary in symbol-extract.ts, and unreachable code in config.ts.

**Files:**
- Modify: `packages/cli/src/traceability/symbol-extract.ts` (4 empty catches + no-op ternary)
- Modify: `packages/opencode/src/config.ts` (unreachable branch + `as any` cast)
- Modify: `packages/cli/src/prolog.ts` (1 empty catch)
- Modify: `packages/mcp/src/tools/core-module.ts` (1 empty catch)
- Modify: `packages/mcp/src/tools/check.ts` (1 empty catch)
- Modify: `packages/mcp/src/tools/symbols.ts` (1 empty catch)

- [ ] **Step 1: Add comments to empty catch blocks in symbol-extract.ts**

In `packages/cli/src/traceability/symbol-extract.ts`, at lines 166, 207, 243, 280, add a comment inside each empty catch:

```ts
} catch {
  // skip: individual declaration extraction may fail on malformed AST nodes
}
```

- [ ] **Step 2: Fix the no-op ternary in symbol-extract.ts**

At lines 316-318, replace:
```ts
const normalizedSource = filePath.startsWith("/")
  ? filePath
  : `${filePath}`;
```
with:
```ts
const normalizedSource = filePath;
```

- [ ] **Step 3: Remove unreachable branch in config.ts**

In `packages/opencode/src/config.ts`, at lines 187-190, remove the unreachable `if (!validated)` block:
```ts
// REMOVE:
if (!validated) {
  logger.warn("Configuration invalid, falling back to defaults");
  return DEFAULTS;
}
```

`validateAndMerge()` always returns a valid `KibiConfig`; it never returns falsy.

- [ ] **Step 4: Fix `as any` cast in config.ts**

At line 75, replace `(err as any).message` with `(err as { message: string }).message` since the preceding check already validates the shape.

- [ ] **Step 5: Add comments to require.resolve catch blocks**

In these files, add a comment to the empty catch block:

- `packages/cli/src/prolog.ts:38`: `// require.resolve not available or package not installed`
- `packages/mcp/src/tools/core-module.ts:30`: `// require.resolve not available or package not installed`
- `packages/mcp/src/tools/check.ts:37`: `// require.resolve not available or package not installed`
- `packages/mcp/src/tools/symbols.ts:253`: `// config file missing or malformed; fall through to defaults`
- `packages/cli/src/commands/check.ts:225`: `// best-effort: temp directory may already be cleaned up`

- [ ] **Step 6: Run tests**

Run: `bun test packages/cli/tests/ packages/mcp/tests/ packages/opencode/tests/ --timeout 30000`
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/traceability/symbol-extract.ts packages/opencode/src/config.ts packages/cli/src/prolog.ts packages/mcp/src/tools/core-module.ts packages/mcp/src/tools/check.ts packages/mcp/src/tools/symbols.ts
git commit -m "chore: annotate empty catch blocks, remove dead code and no-op ternary"
```

---

### Task 7: Create changeset for release metadata

Since Tasks 1-6 modify published packages (`kibi-cli`, `kibi-mcp`, `kibi-opencode`), a changeset is required per project rules.

**Files:**
- Create: `.changeset/code-gardening-2026-03-26.md`

- [ ] **Step 1: Create the changeset**

```md
---
"kibi-cli": patch
"kibi-mcp": patch
"kibi-opencode": patch
---

Internal code quality improvements: deduplicate splitTopLevel and check types across packages, extract shared Prolog cleanup helper, replace process.exit() with return values in CLI commands, remove dead code (target-resolver.ts), annotate empty catch blocks, and remove unreachable code paths.
```

- [ ] **Step 2: Commit**

```bash
git add .changeset/code-gardening-2026-03-26.md
git commit -m "chore: add changeset for code gardening improvements"
```

---

## Execution order and dependencies

```
Task 1 (splitTopLevel dedup) ─── independent
Task 2 (delete dead code)    ─── independent
Task 3 (prolog cleanup)      ─── independent
Task 4 (shared check types)  ─── independent
Task 5 (process.exit refactor) ── depends on Task 3 (uses safeCleanupProlog in check.ts)
                                   depends on Task 4 (check.ts imports Violation from shared types)
Task 6 (catch blocks + dead code) ── depends on Task 5 (sync.ts console.log fix is in Task 5)
Task 7 (changeset)            ─── must be last
```

Tasks 1-4 can be executed **in parallel**. Task 5 depends on Tasks 3 and 4. Task 6 depends on Task 5. Task 7 is last.
