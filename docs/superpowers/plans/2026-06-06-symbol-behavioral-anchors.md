# Symbol Behavioral Anchors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Kibi symbol granularity enforcement language-agnostic by validating against behavioral traceability targets instead of treating every exported type/interface/enum as a blocker for coarse file/module links.

**Architecture:** Add a public symbol-role policy layer that classifies extracted syntax kinds into traceability roles, then reuse that policy in both MCP `kb_upsert` and CLI staged checks. Preserve strict traceability quality by rejecting coarse links when narrower behavioral symbols exist, while allowing explicit manual behavioral anchors and audited coarse links when the extractor misses expression/factory-composed behavior.

**Tech Stack:** Bun, TypeScript, ts-morph, Ajv JSON Schema, Kibi CLI, Kibi MCP, existing manifest-based symbol system.

---

## Scope

This plan intentionally avoids framework-specific extractors such as NgRx `signalStore()` or `withMethods()` parsing. It fixes the abstraction Kibi validates: traceability relationships should target behavior, not merely the narrowest syntactic declaration of any kind.

In scope:

- Add `symbol_role` as public metadata for symbol entities.
- Add a shared role policy for syntax kind → traceability role.
- Update MCP and CLI granularity validation to consider narrower **behavioral** symbols only.
- Keep `granularity_reason` as an audited escape hatch.
- Improve diagnostics so agents know whether blockers are behavioral or only structural/type symbols.
- Add tests, docs, requirement/scenario/test traceability docs, symbol manifest entries, and changesets.

Out of scope for the first implementation:

- Framework-specific parsing for NgRx, Redux, Vue, Nest, etc.
- Full cross-language AST extraction.
- Making `granularity_reason` a free-form field.
- Allowing unconditional file-level traceability.

## File Structure

### Create

- `packages/cli/src/public/symbol-granularity.ts`
  - Shared public constants/types/helpers for symbol roles, traceability relationship types, granularity reasons, and role-aware blocker filtering.
- `.changeset/<generated-name>.md`
  - Required release metadata for `kibi-cli` and `kibi-mcp` because this changes public package behavior/schema.
- `documentation/requirements/REQ-symbol-behavioral-anchors.md`
  - Requirement for role-aware symbol granularity validation.
- `documentation/scenarios/SCEN-symbol-behavioral-anchors.md`
  - BDD scenario covering type/interface-only files and behavioral blockers.
- `documentation/tests/TEST-mcp-upsert-symbol-behavioral-anchors.md`
  - Test documentation for MCP behavior.
- `documentation/tests/TEST-cli-symbol-behavioral-anchors.md`
  - Test documentation for CLI staged behavior.

### Modify

- `packages/cli/package.json`
  - Export the new public helper as `kibi-cli/public/symbol-granularity`.
- `packages/cli/src/public/schemas/entity.ts`
  - Add `symbol_role` schema enum.
- `packages/cli/src/schemas/entity.schema.json`
  - Add `symbol_role` schema enum.
- `packages/mcp/src/tools-config.ts`
  - Expose `symbol_role` in `kb_upsert.properties` input schema.
- `packages/mcp/src/tools/upsert.ts`
  - Replace local granularity constants and raw narrow-name validation with shared role-aware policy.
- `packages/cli/src/commands/check.ts`
  - Replace local granularity constants and raw granular-name validation with shared role-aware policy.
- `packages/cli/src/traceability/symbol-extract.ts`
  - Add `role` to `ExtractedSymbol`, inferred from syntax kind.
- `packages/cli/src/extractors/symbols-coordinator.ts`
  - If needed, export the same role metadata for source analysis results.
- `packages/cli/src/extractors/symbols-ts.ts`
  - If needed, populate role metadata for source extraction/coordinated analysis.
- `packages/cli/src/extractors/manifest.ts`
  - Ensure `symbol_role` is preserved from `documentation/symbols.yaml` records. This may already work via freeform fields; add tests if no code change is needed.
- `packages/mcp/tests/tools/upsert.test.ts`
  - Add role-aware MCP upsert tests.
- `packages/cli/tests/commands/check-staged-enforcement.test.ts`
  - Add role-aware CLI staged-check tests.
- `packages/cli/tests/traceability/symbol-extract.test.ts`
  - Add extraction role inference tests.
- `docs/entity-schema.md`
  - Document `symbol_role` and its allowed values.
- `docs/symbol-traceability-taxonomy.md`
  - Document behavioral vs structural/type traceability policy.
- `docs/mcp-reference.md`
  - Document `kb_upsert.properties.symbol_role`.
- `documentation/symbols.yaml`
  - Add/adjust symbol entries for newly added helpers and touched validators.
- `documentation/symbol-coordinates.yaml`
  - Refresh if symbol coordinate extraction output changes.

## Public Model

Use this field on symbol entities:

```yaml
symbol_role: behavioral | structural | type-shape | config | module | unknown
```

Recommended semantics:

- `behavioral`: runtime behavior, callable behavior, executable behavior, composed behavior, or behavior-bearing exported value.
- `structural`: declarations that organize code shape but do not themselves represent the behavior being traced.
- `type-shape`: interfaces, type aliases, type-only declarations, and similar shape-only symbols.
- `config`: configuration or build artifact symbols.
- `module`: intentional file/module-level behavior.
- `unknown`: extractor cannot infer role.

Initial inference policy:

```ts
export type SourceSymbolKind =
  | "function"
  | "class"
  | "method"
  | "interface"
  | "type"
  | "enum"
  | "variable"
  | "unknown";

export type SymbolRole =
  | "behavioral"
  | "structural"
  | "type-shape"
  | "config"
  | "module"
  | "unknown";

export function inferSymbolRoleFromKind(kind: SourceSymbolKind): SymbolRole {
  switch (kind) {
    case "function":
    case "class":
    case "method":
      return "behavioral";
    case "interface":
    case "type":
    case "enum":
      return "type-shape";
    case "variable":
    case "unknown":
      return "unknown";
  }
}
```

Rationale: `variable` is intentionally `unknown` in the first version because an exported variable may be a constant, config object, factory result, store, signal, or behavior-bearing object. Agents/users can set `symbol_role: behavioral` in `documentation/symbols.yaml` when the manifest knows more than syntax extraction.

## Task 1: Add shared symbol granularity policy helper

**Files:**

- Create: `packages/cli/src/public/symbol-granularity.ts`
- Modify: `packages/cli/package.json`
- Test: add a focused test file if no suitable existing public-helper test exists; otherwise cover through later CLI/MCP tests.

- [ ] **Step 1: Write the shared helper**

Create `packages/cli/src/public/symbol-granularity.ts` with:

```ts
export const TRACEABILITY_RELATIONSHIP_TYPES = new Set([
  "implements",
  "covered_by",
  "executable_for",
] as const);

export const ALLOWED_GRANULARITY_REASONS = new Set([
  "config-artifact",
  "module-level-behavior",
  "extractor-miss",
  "legacy-link",
] as const);

export const SYMBOL_ROLES = [
  "behavioral",
  "structural",
  "type-shape",
  "config",
  "module",
  "unknown",
] as const;

export type SymbolRole = (typeof SYMBOL_ROLES)[number];

export type SourceSymbolKind =
  | "function"
  | "class"
  | "method"
  | "interface"
  | "type"
  | "enum"
  | "variable"
  | "unknown";

export interface GranularSymbolCandidate {
  name: string;
  kind?: SourceSymbolKind;
  role?: SymbolRole;
}

export function isAllowedGranularityReason(value: unknown): boolean {
  return (
    typeof value === "string" &&
    ALLOWED_GRANULARITY_REASONS.has(
      value as (typeof ALLOWED_GRANULARITY_REASONS extends Set<infer T> ? T : never),
    )
  );
}

export function isTraceabilityRelationshipType(value: unknown): boolean {
  return (
    typeof value === "string" &&
    TRACEABILITY_RELATIONSHIP_TYPES.has(
      value as (typeof TRACEABILITY_RELATIONSHIP_TYPES extends Set<infer T> ? T : never),
    )
  );
}

export function isSymbolRole(value: unknown): value is SymbolRole {
  return typeof value === "string" && SYMBOL_ROLES.includes(value as SymbolRole);
}

export function inferSymbolRoleFromKind(kind: SourceSymbolKind): SymbolRole {
  switch (kind) {
    case "function":
    case "class":
    case "method":
      return "behavioral";
    case "interface":
    case "type":
    case "enum":
      return "type-shape";
    case "variable":
    case "unknown":
      return "unknown";
  }
}

export function getSymbolRole(candidate: GranularSymbolCandidate): SymbolRole {
  if (isSymbolRole(candidate.role)) return candidate.role;
  if (candidate.kind) return inferSymbolRoleFromKind(candidate.kind);
  return "unknown";
}

export function isBehavioralSymbol(candidate: GranularSymbolCandidate): boolean {
  return getSymbolRole(candidate) === "behavioral";
}

export function getBehavioralSymbolNames(
  candidates: GranularSymbolCandidate[],
): string[] {
  return [
    ...new Set(candidates.filter(isBehavioralSymbol).map((candidate) => candidate.name)),
  ].sort();
}

export function getNonBehavioralSymbolNames(
  candidates: GranularSymbolCandidate[],
): string[] {
  return [
    ...new Set(
      candidates.filter((candidate) => !isBehavioralSymbol(candidate)).map((candidate) => candidate.name),
    ),
  ].sort();
}
```

Implementation note: if TypeScript dislikes the conditional `Set<infer T>` casts, replace with small readonly arrays plus `includes()` helpers. Do **not** use `as any`, `@ts-ignore`, or `@ts-expect-error`.

- [ ] **Step 2: Export the helper from `kibi-cli`**

Modify `packages/cli/package.json` exports:

```json
"./public/symbol-granularity": {
  "types": "./dist/public/symbol-granularity.d.ts",
  "default": "./dist/public/symbol-granularity.js"
}
```

Place it near the other `./public/*` exports.

- [ ] **Step 3: Run typecheck for the helper**

Run:

```bash
bun run typecheck:cli
```

Expected: exit code 0. If it fails on helper typing, fix the helper without suppressing types.

## Task 2: Add `symbol_role` to schemas and MCP input

**Files:**

- Modify: `packages/cli/src/public/schemas/entity.ts`
- Modify: `packages/cli/src/schemas/entity.schema.json`
- Modify: `packages/mcp/src/tools-config.ts`
- Modify: `packages/mcp/src/tools/upsert.ts`
- Test: `packages/mcp/tests/tools/upsert.test.ts`

- [ ] **Step 1: Write failing MCP schema tests**

In `packages/mcp/tests/tools/upsert.test.ts`, add tests that:

1. Accept a symbol upsert with `properties.symbol_role: "behavioral"`.
2. Reject a symbol upsert with `properties.symbol_role: "runtime-ish"`.

Use existing upsert test setup helpers in that file. Expected initial result: tests fail because `symbol_role` is undocumented or not schema-restricted.

- [ ] **Step 2: Add schema enum**

Add this property to both schema files:

```ts
symbol_role: {
  type: "string",
  enum: [
    "behavioral",
    "structural",
    "type-shape",
    "config",
    "module",
    "unknown",
  ],
},
```

In `packages/cli/src/public/schemas/entity.ts`, prefer importing/reusing `SYMBOL_ROLES` only if doing so does not create JSON-schema runtime complications. A duplicated literal enum is acceptable if tests cover it.

- [ ] **Step 3: Add MCP tool schema field**

In `packages/mcp/src/tools-config.ts`, add `symbol_role` to `kb_upsert.properties.properties` near `granularity_reason`:

```ts
symbol_role: {
  type: "string",
  enum: ["behavioral", "structural", "type-shape", "config", "module", "unknown"],
  description:
    "Optional symbol traceability role. Use behavioral for runtime behavior and type-shape for interfaces/type aliases.",
},
```

- [ ] **Step 4: Update MCP Ajv override**

In `packages/mcp/src/tools/upsert.ts`, extend the local Ajv schema override so `symbol_role` validates consistently even if the imported schema lags during package builds.

- [ ] **Step 5: Run targeted tests**

Run:

```bash
bun test --timeout 15000 packages/mcp/tests/tools/upsert.test.ts
```

Expected: schema tests pass.

## Task 3: Make staged symbol extraction role-aware

**Files:**

- Modify: `packages/cli/src/traceability/symbol-extract.ts`
- Test: `packages/cli/tests/traceability/symbol-extract.test.ts`

- [ ] **Step 1: Write failing extraction role tests**

Add tests asserting:

- Exported function → `kind: "function"`, `role: "behavioral"`.
- Exported class method → `kind: "method"`, `role: "behavioral"`.
- Exported interface → `kind: "interface"`, `role: "type-shape"`.
- Exported type alias → `kind: "type"`, `role: "type-shape"`.
- Exported enum → `kind: "enum"`, `role: "type-shape"`.
- Exported variable → `kind: "variable"`, `role: "unknown"`.

Expected initial result: tests fail because `ExtractedSymbol` has no `role` field.

- [ ] **Step 2: Import shared inference helper**

In `packages/cli/src/traceability/symbol-extract.ts`:

```ts
import { inferSymbolRoleFromKind, type SymbolRole } from "../public/symbol-granularity.js";
```

Extend `ExtractedSymbol`:

```ts
role: SymbolRole;
```

Update `buildSymbolResult()` to set:

```ts
role: inferSymbolRoleFromKind(kind),
```

- [ ] **Step 3: Run extraction tests**

Run:

```bash
bun test --timeout 15000 packages/cli/tests/traceability/symbol-extract.test.ts
```

Expected: new and existing tests pass.

## Task 4: Update MCP granularity validation

**Files:**

- Modify: `packages/mcp/src/tools/upsert.ts`
- Test: `packages/mcp/tests/tools/upsert.test.ts`

- [ ] **Step 1: Write failing role-aware upsert tests**

Add tests for these cases:

1. Source file exports only interfaces/types/enums plus hidden expression-composed behavior. Upserting a coarse symbol with an `implements` relationship and no `granularity_reason` should pass.
2. Source file exports a function/class/method. Upserting a coarse symbol with an `implements` relationship and no `granularity_reason` should fail.
3. Same behavioral blocker case with `granularity_reason: "extractor-miss"` should pass.
4. Error message should list behavioral blockers separately and mention that type-shape symbols do not force rejection.

Use source content like:

```ts
export interface DraftSceneSnapshot { id: string }
export type VideoPlayerMode = "idle" | "playing";
export enum PlayerKind { Main = "main" }

const hiddenBehavior = createStore(withMethods({
  connectVideoElement() {
    return true;
  },
}));
```

Expected initial result: test 1 fails because existing validation treats interface/type/enum names as blockers.

- [ ] **Step 2: Replace local constants with shared helpers**

In `packages/mcp/src/tools/upsert.ts`, import from `kibi-cli/public/symbol-granularity`:

```ts
import {
  getBehavioralSymbolNames,
  getNonBehavioralSymbolNames,
  inferSymbolRoleFromKind,
  isAllowedGranularityReason,
  isTraceabilityRelationshipType,
  type GranularSymbolCandidate,
} from "kibi-cli/public/symbol-granularity";
```

Then remove local `TRACEABILITY_RELATIONSHIP_TYPES` and `ALLOWED_GRANULARITY_REASONS`.

- [ ] **Step 3: Return candidates instead of raw names**

Replace `collectNarrowExportNames()` with `collectGranularSymbolCandidates()` returning `GranularSymbolCandidate[]`.

Pseudo-implementation:

```ts
function collectGranularSymbolCandidates(
  filePath: string,
  content: string,
): GranularSymbolCandidate[] {
  const project = new Project({ skipAddingFilesFromTsConfig: true });
  const sourceFile = project.createSourceFile(`${filePath}::granularity`, content, {
    overwrite: true,
    scriptKind: chooseScriptKind(filePath),
  });

  const candidates: GranularSymbolCandidate[] = [];
  const methodNameCounts = new Map<string, number>();
  const methodCandidates: GranularSymbolCandidate[] = [];

  const push = (name: string | undefined, kind: GranularSymbolCandidate["kind"]) => {
    if (!name) return;
    candidates.push({ name, kind, role: inferSymbolRoleFromKind(kind ?? "unknown") });
  };

  // Same exported function/class/interface/type/enum traversal as today,
  // but each push includes kind + inferred role.
}
```

Keep the existing ambiguous bare method-name behavior: qualified `ClassName.methodName` is always a behavioral candidate; bare `methodName` is added only when unambiguous.

- [ ] **Step 4: Validate only behavioral blockers**

Update `validateSymbolGranularity()` decision flow:

```ts
const candidates = collectGranularSymbolCandidates(...);
const behavioralNames = getBehavioralSymbolNames(candidates);
if (behavioralNames.length === 0) return;
if (behavioralNames.includes(entity.title)) return;
```

Diagnostic message should include both:

- behavioral blockers that caused rejection
- non-behavioral symbols that were ignored, when present

Example:

```text
Symbol SYM-X links src/store.ts coarsely while behavioral symbols are available: run, Worker.start. Move relationships to a behavioral symbol, add a manifest behavioral anchor, or set granularity_reason to config-artifact, module-level-behavior, extractor-miss, or legacy-link. Non-behavioral symbols in the file were ignored for this decision: DraftSceneSnapshot, VideoPlayerMode.
```

- [ ] **Step 5: Run MCP upsert tests**

Run:

```bash
bun test --timeout 15000 packages/mcp/tests/tools/upsert.test.ts
```

Expected: all existing and new upsert tests pass.

## Task 5: Update CLI staged granularity diagnostics

**Files:**

- Modify: `packages/cli/src/commands/check.ts`
- Test: `packages/cli/tests/commands/check-staged-enforcement.test.ts`

- [ ] **Step 1: Write failing CLI staged tests**

Add tests for:

1. `symbols.yaml` adds a coarse traceability link to a source file containing only exported interface/type/enum symbols. `check --staged` should pass.
2. `symbols.yaml` adds a coarse traceability link to a source file containing an exported function/class/method. `check --staged` should fail with `symbol_granularity_violation`.
3. Existing test “fails coarse links when interface symbols are available” should be updated or replaced because interface-only blockers are no longer valid blockers.

Expected initial result: interface-only pass test fails under current implementation.

- [ ] **Step 2: Replace local constants with shared helpers**

In `packages/cli/src/commands/check.ts`, import:

```ts
import {
  getBehavioralSymbolNames,
  getNonBehavioralSymbolNames,
  isAllowedGranularityReason,
  isTraceabilityRelationshipType,
} from "../public/symbol-granularity.js";
```

Replace local `GRANULARITY_RELATIONSHIP_TYPES`, `ALLOWED_GRANULARITY_REASONS`, `hasTraceabilityRelationship()`, and `hasValidGranularityReason()` internals with shared helpers.

- [ ] **Step 3: Filter granular symbols by role**

Update `createSymbolGranularityDiagnostics()`:

```ts
const granularSymbols = getGranularSymbolsForSourceFile(...);
const behavioralNames = getBehavioralSymbolNames(granularSymbols);
if (behavioralNames.length === 0) continue;
if (behavioralNames.includes(result.entity.title)) continue;
```

Use `getNonBehavioralSymbolNames(granularSymbols)` to improve the diagnostic suggestion.

- [ ] **Step 4: Run CLI staged tests**

Run:

```bash
bun test --timeout 15000 packages/cli/tests/commands/check-staged-enforcement.test.ts
```

Expected: all existing and new staged enforcement tests pass after updating obsolete interface-only expectations.

## Task 6: Document manual behavioral anchors

**Files:**

- Modify: `docs/entity-schema.md`
- Modify: `docs/symbol-traceability-taxonomy.md`
- Modify: `docs/mcp-reference.md`

- [ ] **Step 1: Update entity schema docs**

In `docs/entity-schema.md`, add `symbol_role` near `sourceFile` / `granularity_reason`:

```md
| `symbol_role` | string | Optional role for symbol traceability granularity. Allowed values: `behavioral`, `structural`, `type-shape`, `config`, `module`, `unknown`. Granularity checks reject coarse links only when narrower behavioral symbols are available. |
```

- [ ] **Step 2: Update traceability taxonomy**

In `docs/symbol-traceability-taxonomy.md`, add a section:

```md
### Behavioral anchors

Traceability relationships (`implements`, `covered_by`, `executable_for`) should target behavioral symbols when available. Interfaces, type aliases, and other type-shape symbols describe data shape and should not by themselves block a module/file-level behavioral link.

When behavior is composed through factory expressions, generated code, framework conventions, or language constructs the extractor cannot model, declare a manual symbol in `documentation/symbols.yaml` with `symbol_role: behavioral`. If no precise anchor exists yet, use `granularity_reason: extractor-miss` or `module-level-behavior` on the coarse symbol and treat it as an audited fallback.
```

Include example YAML:

```yaml
symbols:
  - id: SYM-video-player-store-connect
    title: VideoPlayerStore.connectVideoElement
    status: active
    sourceFile: src/video-player.store.ts
    symbol_role: behavioral
    relationships:
      - type: implements
        target: REQ-video-player-connects-element
```

- [ ] **Step 3: Update MCP reference**

In `docs/mcp-reference.md`, add `symbol_role` to `kb_upsert` symbol property examples and explain that agents should prefer manual behavioral anchors over coarse links when they can name the behavior.

## Task 7: Add Kibi documentation entities and symbol traceability

**Files:**

- Create: `documentation/requirements/REQ-symbol-behavioral-anchors.md`
- Create: `documentation/scenarios/SCEN-symbol-behavioral-anchors.md`
- Create: `documentation/tests/TEST-mcp-upsert-symbol-behavioral-anchors.md`
- Create: `documentation/tests/TEST-cli-symbol-behavioral-anchors.md`
- Modify: `documentation/symbols.yaml`
- Modify: `documentation/symbol-coordinates.yaml` if coordinate refresh changes output.

- [ ] **Step 1: Add requirement doc**

Create requirement:

```md
---
id: REQ-symbol-behavioral-anchors
type: req
title: Prefer behavioral symbols for traceability granularity
status: active
source: documentation/requirements/REQ-symbol-behavioral-anchors.md
tags: [traceability, symbols]
---

Symbol traceability granularity checks must reject coarse file/module links only when narrower behavioral symbols are available. Type-shape symbols such as interfaces, type aliases, and enums must not by themselves block a coarse behavioral link.
```

- [ ] **Step 2: Add scenario doc**

Create scenario linking to the requirement:

```md
---
id: SCEN-symbol-behavioral-anchors
type: scenario
title: Coarse behavioral links ignore type-shape-only symbols
status: active
source: documentation/scenarios/SCEN-symbol-behavioral-anchors.md
links: [REQ-symbol-behavioral-anchors]
relationships:
  - type: specified_by
    target: REQ-symbol-behavioral-anchors
---

Given a source file with exported interfaces and type aliases but no extracted behavioral symbols
When a symbol with traceability relationships links to that source file coarsely
Then Kibi accepts the link unless a narrower behavioral symbol is available.
```

- [ ] **Step 3: Add test docs**

Create one MCP test entity and one CLI test entity with `verified_by` / `validates` relationships following existing documentation test patterns.

- [ ] **Step 4: Update symbol manifest**

Add entries for new helper and modified validators, for example:

```yaml
- id: SYM-symbol-granularity-policy
  title: symbol-granularity policy helpers
  status: active
  sourceFile: packages/cli/src/public/symbol-granularity.ts
  symbol_role: behavioral
  relationships:
    - type: implements
      target: REQ-symbol-behavioral-anchors

- id: SYM-mcp-validate-symbol-granularity
  title: validateSymbolGranularity
  status: active
  sourceFile: packages/mcp/src/tools/upsert.ts
  symbol_role: behavioral
  relationships:
    - type: implements
      target: REQ-symbol-behavioral-anchors
    - type: covered_by
      target: TEST-mcp-upsert-symbol-behavioral-anchors

- id: SYM-cli-create-symbol-granularity-diagnostics
  title: createSymbolGranularityDiagnostics
  status: active
  sourceFile: packages/cli/src/commands/check.ts
  symbol_role: behavioral
  relationships:
    - type: implements
      target: REQ-symbol-behavioral-anchors
    - type: covered_by
      target: TEST-cli-symbol-behavioral-anchors
```

Use exact manifest shape already present in `documentation/symbols.yaml`; do not introduce a different YAML structure.

## Task 8: Add changeset

**Files:**

- Create: `.changeset/<generated-name>.md`

- [ ] **Step 1: Create changeset file manually**

Because this changes publishable packages, add a changeset for `kibi-cli` and `kibi-mcp`.

Template:

```md
---
"kibi-cli": patch
"kibi-mcp": patch
---

Kibi now treats symbol granularity as a behavioral traceability decision instead of assuming every exported declaration is an equally precise target. Agents can model behavior hidden inside factory or composition expressions with manual behavioral anchors, while interfaces and type aliases no longer block valid coarse behavioral links by themselves.

Technical summary:

- Added `symbol_role` metadata for symbol entities.
- Added shared role-aware symbol granularity helpers.
- Updated MCP upsert and CLI staged checks to reject coarse links only when narrower behavioral symbols are available.
- Documented manual behavioral anchors for extractor-miss cases.
```

- [ ] **Step 2: Do not run `changeset` interactively**

This plan is for agentic execution. Prefer a manually authored non-interactive changeset file.

## Task 9: Verification

**Files:** all modified files.

- [ ] **Step 1: LSP diagnostics**

Run diagnostics on modified source files:

```text
lsp_diagnostics packages/cli/src/public/symbol-granularity.ts
lsp_diagnostics packages/cli/src/traceability/symbol-extract.ts
lsp_diagnostics packages/cli/src/commands/check.ts
lsp_diagnostics packages/mcp/src/tools/upsert.ts
lsp_diagnostics packages/mcp/src/tools-config.ts
```

Expected: zero errors. Warnings require review; do not ignore type or schema warnings.

- [ ] **Step 2: Targeted tests**

Run:

```bash
bun test --timeout 15000 packages/cli/tests/traceability/symbol-extract.test.ts
bun test --timeout 15000 packages/cli/tests/commands/check-staged-enforcement.test.ts
bun test --timeout 15000 packages/mcp/tests/tools/upsert.test.ts
```

Expected: all pass.

- [ ] **Step 3: Package typechecks**

Run:

```bash
bun run typecheck:cli
bun run typecheck:mcp
bun run typecheck:cli:tests
bun run typecheck:mcp:tests
```

Expected: all exit code 0.

- [ ] **Step 4: Package builds**

Run:

```bash
bun run build:cli
bun run build:mcp
```

Expected: both exit code 0.

- [ ] **Step 5: Lint/check**

Run:

```bash
bun run check
```

Expected: exit code 0. If formatting changes are needed, run `bun run format`, inspect the diff, then rerun `bun run check`.

- [ ] **Step 6: Kibi validation**

Use MCP tools only for KB validation. Run targeted/final `kb_check` after documentation/symbol updates. Do not inspect or edit `.kb/` files manually.

Expected: no new validation violations. If symbol coordinates changed, include `documentation/symbol-coordinates.yaml` with the implementation changes.

## Risks and Guardrails

- **Risk:** Coarse links may become too easy to accept.
  - **Guardrail:** Coarse links are still rejected when narrower behavioral symbols exist; `granularity_reason` remains audited metadata.
- **Risk:** `variable` symbols may hide behavior but default to `unknown`.
  - **Guardrail:** Manual manifest anchors can set `symbol_role: behavioral`; future syntax heuristics can promote behavior-bearing variables without framework-specific parsing.
- **Risk:** MCP and CLI validators drift.
  - **Guardrail:** Both import shared policy from `packages/cli/src/public/symbol-granularity.ts`.
- **Risk:** Public schema accepts `symbol_role` but docs omit it.
  - **Guardrail:** This plan includes schema, MCP reference, entity schema, taxonomy, and changeset updates.
- **Risk:** Tests encode old “interfaces block coarse links” behavior.
  - **Guardrail:** Replace that expectation with “behavioral symbols block coarse links; type-shape-only files do not.”

## Success Criteria

- A source file with only exported interfaces/types/enums no longer causes coarse behavioral traceability rejection.
- A source file with exported functions/classes/methods still rejects unjustified coarse traceability.
- `granularity_reason: extractor-miss` and `module-level-behavior` still permit intentional coarse links.
- `symbol_role: behavioral` is accepted by schema/MCP and documented for manual manifest anchors.
- MCP and CLI diagnostics suggest concrete valid fallbacks instead of generic query/rejection messages.
- Targeted tests, typechecks, builds, lint, and final Kibi validation pass.

## Implementation Notes for Future Generic Extraction

After this plan lands, a second incremental plan can add syntax-generic behavioral discovery for expression-composed code without naming frameworks:

- object literal methods inside exported variables
- function-valued object properties
- returned object members from exported factory functions
- callbacks with stable property names passed to composition/factory calls

That work should reuse `symbol_role: behavioral` and emit first-class symbols only when the syntax exposes stable names. Do not add framework-specific `signalStore` / `withMethods` logic unless a separate framework adapter system is designed.
