# OpenCode Kibi Enforcement Plan

- Status: Proposed
- Date: 2026-03-17
- Scope: `packages/opencode`
- Package: `kibi-opencode`

## Locked Decisions

- Roll out conservatively: guide first, avoid hard blocking in the editor loop.
- Treat manual edits under `.kb/**` as loud warnings.
- Prefer `FACT` over `REQ` when domain prose expresses invariants, properties, limits, or cardinalities.
- Keep the plugin thin: reuse existing `kibi sync`, `kibi check`, and public MCP tools rather than reimplementing Kibi logic.

## Why This Work Matters

The current plugin already injects general Kibi guidance and schedules background `kibi sync`, but it does not yet provide strong, context-aware steering. The next step is to move from static reminders to targeted Kibi-first guidance that appears when the agent is most likely to make mistakes:

- Before explaining intent in long comments
- When editing requirements without scenarios/tests
- When editing code without traceability
- When trying to treat domain facts as ad hoc prose
- When touching `.kb/**` directly

## Current Baseline

The plugin currently provides:

- Prompt guidance injection via `experimental.chat.system.transform`
- Sentinel-based dedupe for injected guidance
- `file.edited` handling for debounced background `kibi sync`
- Non-blocking logging

The plugin does **not** currently provide:

- Per-file open/read context injection
- Actual prompt injection on save beyond the global system prompt
- Tool usage observation for enforcing query-first behavior
- Real toast/notification UX
- Interception of generated comments before they land in files

## Product Goals

1. Increase Kibi-first behavior before implementation and explanation work.
2. Reduce long explanatory comments by rerouting durable knowledge into KB artifacts.
3. Improve `req -> scenario -> test` completeness.
4. Improve code traceability to requirements.
5. Catch `.kb/**` manual edits early and loudly.
6. Route domain knowledge to `FACT` when it represents stable truths rather than product intent.

## Non-Goals

- No automatic KB entity creation from comments in Phase 1.
- No hard blocking in the editor loop, except for loud `.kb/**` warnings.
- No reimplementation of Kibi logic inside the plugin.
- No dependence on host APIs that do not yet exist.

## Phase 1: Conservative, High-Impact Improvements

### 1. Dynamic Prompt Guidance

Replace the current single static guidance block with small, contextual guidance blocks assembled from recent edit context and workspace state.

Prompt variants:

- Code-edit guidance
- Requirement-edit guidance
- ADR-edit guidance
- KB-doc guidance
- Bootstrap-needed guidance
- `.kb` warning guidance

Rules:

- Keep at most one or two active blocks at a time
- Prefer short, situational instructions over long universal prompts
- Retain sentinel dedupe behavior

### 2. Code Traceability Guidance

When recent edits include code files (`.ts`, `.tsx`, `.js`, `.jsx`), inject focused guidance to:

- Query Kibi first by `sourceFile`
- Preserve durable knowledge in Kibi instead of comments
- Add `// implements REQ-xxx` to changed symbols

This stays advisory in Phase 1 and complements existing pre-commit enforcement.

### 3. Requirement Completeness Guidance

When edits touch requirement docs, inject focused guidance to:

- Create or update linked `SCEN` and `TEST` entities
- Avoid embedding scenarios or tests inside requirement files
- Expect `must-priority-coverage` checks for `priority: must`

This should steer agents toward the canonical Kibi authoring model without forcing automatic KB writes.

### 4. FACT-First Domain Routing

Add conservative heuristics for routing durable prose into the right artifact type.

Routing preference:

- `FACT`: Invariants, defaults, property values, limits, uniqueness, cardinality, state truths
- `REQ`: Product behavior, capabilities, obligations, permissions
- `ADR`: Technical decisions, tradeoffs, rationale, constraints
- `SCEN`: Behavior examples, flows, Given/When/Then-style acceptance narratives
- `TEST`: Verification language, assertions, expected outputs

This logic should influence guidance only, not auto-create entities.

### 5. Loud `.kb/**` Edit Warnings

If the plugin sees an edit under `.kb/**`, it should emit high-visibility warnings.

Behavior:

- Log a loud warning immediately
- Inject prompt guidance that `.kb/**` must not be edited manually
- Direct agent toward MCP/CLI flows instead

Phase 1 remains non-blocking, but this warning path should be intentionally prominent.

### 6. Invalid Authoring Pattern Detection

Add lightweight, conservative checks for common Kibi anti-patterns.

Detect and warn on:

- Requirement files that appear to embed scenarios/tests
- Long technical comments that look like ADR material
- Long domain comments that look like FACT material
- Prose-heavy verification notes that should likely become `TEST` or `SCEN`

Warnings should be guidance-only unless they are `.kb/**` edits.

### 7. Background Targeted Validation

Extend the current background sync behavior so relevant KB-document edits can trigger targeted checks after `kibi sync`.

Recommended check matrix:

- Requirement/scenario/test/ADR/fact edits:
  - `kibi check --rules required-fields,no-dangling-refs`
- Must-priority requirement edits:
  - `kibi check --rules must-priority-coverage`

Guidelines:

- Preserve debounce
- Preserve single-flight behavior
- Remain non-blocking
- Avoid running targeted checks for every source-code edit in Phase 1

### 8. Bootstrap and Workspace Health Nudges

Detect likely uninitialized or weakly bootstrapped repos and inject guidance to use:

- `/init-kibi` for retroactive bootstrap
- `kibi init`
- `kibi doctor`

Suggested triggers:

- Missing `.kb/config.json`
- Missing conventional Kibi documentation directories
- Lack of evidence of prior bootstrap

## Phase 2: Better UX, Same Plugin Surface

If Phase 1 works well, add:

- Richer warning categories in logs
- Session-level summaries when repeated anti-patterns occur
- Stronger requirement-doc shape linting
- Optional user-tunable thresholds for long-comment heuristics
- Improved prompt copy based on observed false positives

This phase should still avoid hard enforcement.

## Phase 3: Host-Level Capability Requests

These features likely require new OpenCode hooks or APIs.

### 1. File Read/Open Context Injection

Goal:

- When a file is opened or read, automatically surface linked reqs/tests/ADRs/symbols by `sourceFile`

Impact:

- This is the best way to make Kibi contextual without relying on agent memory

### 2. Tool and Action Observation

Goal:

- Detect whether the agent actually used `kb_query` before implementation or KB mutations

Impact:

- Enables real query-first enforcement rather than prompt-only guidance

### 3. Pre-Apply Output Interception

Goal:

- Inspect large generated comments or prose before they are written into files

Impact:

- Allows plugin to intercept comment-heavy outputs and redirect them toward ADR/REQ/FACT/SCEN/TEST workflows

### 4. Notification/Toast API

Goal:

- Replace log-only warnings with visible UX

Impact:

- Makes `.kb/**` warnings and Kibi guidance much harder to miss

## Implementation Plan

### Workstream A: Prompt Refactor

Update prompt generation so it accepts context rather than returning one fixed string.

Likely changes:

- Refactor `buildPrompt()` into a context-aware builder
- Add helper functions for prompt block generation
- Keep output concise and deduped

### Workstream B: Edit Context Tracking

Track recent relevant edits in plugin runtime and derive context buckets such as:

- Code
- Requirement
- Scenario
- Test
- ADR
- Fact
- `.kb`
- Bootstrap-needed

### Workstream C: Path Classification

Add a path classification layer rather than overloading the current sync file filter.

Suggested new module:

- `packages/opencode/src/path-kind.ts`

Responsibilities:

- Identify artifact type from path
- Identify whether path is under `.kb/**`
- Identify whether path is Kibi-doc-relevant vs ordinary source

### Workstream D: Durable Knowledge Classification

Add a simple heuristic classifier for long comments and prose.

Suggested new module:

- `packages/opencode/src/knowledge-classifier.ts`

Example cues:

- `FACT`: "must be unique", "at most", "exactly one", "default is", "expires after", "cannot exceed"
- `REQ`: "system must", "user can", "should allow", "shall"
- `ADR`: "decision", "tradeoff", "because", "we chose", "constraint"
- `SCEN`: "given", "when", "then", "flow"
- `TEST`: "verify", "assert", "expected", "test case"

### Workstream E: Scheduler Extension

Extend the scheduler so it can optionally run post-sync targeted checks.

Suggested behavior:

- Sync remains the first step
- Targeted check runs only when recent edit types justify it
- Preserve current non-blocking and single-flight guarantees

### Workstream F: Workspace Health Detection

Add a small helper for bootstrap and workspace health signals.

Suggested new module:

- `packages/opencode/src/workspace-health.ts`

Responsibilities:

- Detect likely missing Kibi bootstrap
- Detect missing `.kb/config.json`
- Detect absence of canonical Kibi doc directories

### Workstream G: Documentation and Release Artifacts

Because `kibi-opencode` is a publishable package, implementation should also include:

- Updated `packages/opencode/README.md`
- Updated `packages/opencode/CHANGELOG.md`
- A new changeset entry
- Kibi documentation updates if new durable behavior or policy is introduced

## Suggested Config Additions

```json
{
  "guidance": {
    "dynamic": true,
    "warnOnKbEdits": true,
    "factFirstDomainRouting": true,
    "commentDetection": {
      "enabled": true,
      "minLines": 6
    },
    "targetedChecks": {
      "enabled": true
    }
  }
}
```

Guidance for defaults:

- All new features should default to conservative values
- Every behavior should remain opt-out
- `.kb/**` warnings should be enabled by default

## Check Matrix

### Code edit
- Prompt: Query-first, Kibi-over-comments, `implements REQ-xxx`
- Background: `kibi sync`

### Requirement edit
- Prompt: Separate `REQ` / `SCEN` / `TEST`, no embedding
- Background:
  - `kibi sync`
  - `kibi check --rules required-fields,no-dangling-refs`

### Must-priority requirement edit
- Prompt: Include req/scenario/test completeness reminder
- Background:
  - `kibi sync`
  - `kibi check --rules must-priority-coverage`

### Scenario/test/ADR/fact edit
- Prompt: Typed guidance for the changed artifact
- Background:
  - `kibi sync`
  - `kibi check --rules required-fields,no-dangling-refs`

### `.kb/**` edit
- Prompt: Loud warning, do not edit `.kb/**` manually
- Background:
  - No special KB mutation behavior
  - Warning only

## Testing Plan

### Prompt tests
Add tests for:

- Code-edit prompt variant
- Requirement-edit prompt variant
- ADR-edit prompt variant
- `.kb` warning prompt variant
- Bootstrap-needed prompt variant
- FACT-first routing language

### Classification tests
Add tests for:

- `FACT` vs `REQ` routing
- ADR-like technical comments
- Scenario/test-like prose
- Conservative threshold behavior

### Scheduler tests
Add tests for:

- Post-sync targeted checks
- No duplicate checks during rapid edits
- No regressions to debounce or single-flight behavior

### Non-blocking tests
Verify:

- Warnings do not block chat setup
- Warnings do not block sync scheduling
- Targeted checks run in background

### Regression tests
Preserve:

- Hook registration behavior
- Sentinel dedupe
- Compatibility mode behavior
- Current prompt injection semantics

## KB and Documentation Follow-Up

Implementation should not live only as code and README changes.

Before or during implementation:

- Confirm whether `REQ-opencode-kibi-plugin-v1` should be extended or whether a new requirement/test pair should be introduced for enforcement features.
- Add or update KB artifacts so the new plugin behavior is itself traceable.
- Ensure tests and docs reference the governing requirement(s).

## Acceptance Criteria

1. After a code edit, injected guidance mentions:
   - Querying Kibi first
   - Preferring Kibi over comments for durable knowledge
   - Adding `// implements REQ-xxx`

2. After a requirement edit, injected guidance mentions:
   - Separate `SCEN` and `TEST`
   - Avoiding embedded scenarios/tests

3. After a `.kb/**` edit, the plugin emits a loud warning and clearly discourages manual `.kb/**` authoring.

4. When durable prose looks domain-invariant-like, the guidance prefers `FACT` before `REQ`.

5. Background validation remains debounced and non-blocking.

6. Existing prompt injection, sync scheduling, and hook compatibility tests still pass.

## Risks

- Prompt bloat may reduce compliance if too many blocks are injected at once.
- Comment heuristics may misclassify prose if thresholds are too low.
- Too many background checks may create noisy logs.
- Without host support, query-first remains guided behavior rather than enforced behavior.

## Recommended Execution Order

1. Prompt refactor for dynamic guidance
2. Path classification and `.kb/**` warning path
3. FACT-first knowledge classifier
4. Requirement completeness guidance
5. Background targeted checks
6. Tests
7. README / changelog / changeset / KB artifact updates
