# Change-to-Proof Compiler Implementation Plan

> **Status:** In execution — discovery/compiler/verification execution slices delivered
> **Delivery horizon:** Two 12-week quarters
> **Primary outcome:** An agent can start from intent or changed code, find the owning requirements, compile complete typed semantics, review exact contradictions and traceability proposals, apply the approved plan safely, run the relevant E2E cases, and obtain fresh proof for the current code snapshot.

### Execution status

The first implementation milestones are delivered: `kb_search` retains legacy behavior and supports deterministic `intent-v1` ranking with host-agent facets, source-location evidence, bounded traceability evidence, confidence analysis, and abstention; `kb_compile_intent` emits proposition-accounted, snapshot-bound plans; `kb_apply_plan` revalidates approved hashes/snapshots before sequential upserts; and `kb_ingest_verification` derives snapshot-bound verification-receipt v2 evidence from contracted reporter artifacts. Stable Playwright case IDs/extraction, a dependency-free reporter, CLI-only `kibi verify`, a deterministic change-to-proof evaluator, verification contracts, v2 case results, shared CLI/MCP parity, focused tests, package builds, and typechecks are now in place. The full transactional source publishing/recovery boundary, dogfood package adoption, and measured shadow rollout remain pending in the dependency order below.

## Goal

Turn Kibi's existing search, semantic advisor, strict facts, predicate ontology, traceability, coverage, and verification-receipt primitives into one dependable change-to-proof workflow:

```text
intent or code location
  -> requirement discovery
  -> proposition-complete compile plan
  -> contradiction and traceability review
  -> atomic source + KB application
  -> exact E2E case execution
  -> snapshot-bound proof
```

This plan implements all four requested product areas:

1. Finding requirements through code.
2. Tracking E2E tests to the requirements, scenarios, and symbols they actually cover.
3. Zero-shot functionality search using host-agent semantic interpretation and deterministic Kibi ranking.
4. Translating prose into typed logic that Prolog can check, including exact contradiction witnesses.

## Why this is the next product increment

The 2026-08-13 dogfood baseline shows that the primitives exist but are not yet a reliable workflow:

| Signal | Dogfood project B / dogfood project A evidence | Product consequence |
|---|---:|---|
| Usage volume | 11,392 diagnostic events and 3,236 upserts | Kibi is used enough for workflow friction to be material. |
| Validation discipline | 244 validations total; dogfood project A's latest sample had 0 exact validations before 53 upserts | Preflight must become part of plan application, not optional agent memory. |
| Exact lookup misses | Dogfood project B 264/1,486; dogfood project A 372/2,760 | Literal lookup does not reliably recover intent from unfamiliar vocabulary or code. |
| Semantic-tool adoption | 12 semantic-advisor and 24 model-requirement calls combined | The low-level semantic sequence is too fragmented. |
| Proof | Dogfood project A has 59 passing E2E tests but 0/102 proven requirements | Authored tests and durable status are not connected to current execution evidence. |
| Semantic completeness | 84 dogfood project A requirements lack complete semantic inventories; 94 lack qualifying E2E proof | Contradiction checks cannot be trusted until proposition grounding and proof are joined. |
| Attribution quality | Dogfood project B `TEST-170` is linked to 51 symbols | Broad links create graph coverage without credible behavioral attribution. |
| Runtime parity | Dogfood project B pins `kibi-cli` 0.14.0; dogfood project A pins 0.16.1 while this checkout is newer | Dogfood conclusions are confounded by runtime drift. |

The key product decision is to join these capabilities rather than add another isolated report.

## Decisions and boundaries

These decisions are fixed for this implementation unless an ADR explicitly supersedes them.

- **Host-agent semantics.** Kibi does not call a hosted model. The host agent may provide semantic facets and typed interpretations. Kibi decomposes, validates, canonicalizes, ranks, checks, and abstains deterministically.
- **No embeddings in the first release.** Intent search uses fielded BM25-style scoring, host-supplied aliases/facets, source coordinates, symbol ownership, and bounded graph expansion.
- **Typed logic only.** Callers never submit raw Prolog. Prose compiles to existing strict facts, predicate facts, or `kibi.logic.v1`; unresolved ambiguity remains an observation.
- **Review before mutation.** `kb_compile_intent` is read-only. `kb_apply_plan` accepts only the exact reviewed plan hash and revalidates it against the live snapshot.
- **Eight entity types remain canonical.** No `feature` or `test_case` entity type is added. A feature is represented by requirements and scenarios; an executable case is a `symbol` tagged `test-case` and linked with `executable_for`.
- **Coverage is never inferred from a green suite.** Search/compile may propose relationships, but only explicitly accepted proposals become `specified_by`, `verified_by`/`validates`, `implements`, `covered_by`, or `executable_for` edges.
- **Playwright first.** The verification adapter contract is runner-neutral, but only Playwright is implemented in this horizon.
- **MCP never executes project commands.** `kb_ingest_verification` validates a runner artifact. The CLI-only `kibi verify --test-id ... -- <argv>` command performs explicit local execution with `shell: false`.
- **Tracked artifacts are authoritative.** Plan application updates configured requirement/scenario/test/fact Markdown and the symbol manifest, then publishes the matching branch-local KB state. It does not stage, commit, push, or edit arbitrary source files.
- **Receipt v1 remains readable.** Tests without a verification contract can continue to prove with valid v1 receipts. Once a verification contract is present, only a matching v2 receipt can satisfy proof.
- **Local proof has an explicit trust boundary.** Reporter artifacts are schema-, snapshot-, contract-, and digest-checked, but are not cryptographically attested. Signed CI provenance is a future extension, not a claim of this release.
- **No hard dogfood enforcement before shadow evidence.** New diagnostics run in shadow mode for at least two weeks and must meet the rollout gates below before blocking completion.

## Public contract changes

The shared operation catalog grows from 18 to 21 operations:

- Extend `kb_search` / `kibi search --input`.
- Add `kb_compile_intent` / `kibi compile-intent --input`.
- Add `kb_apply_plan` / `kibi apply-plan --input`.
- Add `kb_ingest_verification` / `kibi ingest-verification --input`.

`kibi verify` is intentionally not a peer operation because it executes an arbitrary operator-supplied process. It is a CLI orchestration command that delegates artifact validation and receipt persistence to `kb_ingest_verification`.

| Operation | Prolog | Declared effects |
|---|---:|---|
| Extended `kb_search` | required | `kb-read`, `workspace-read` |
| `kb_compile_intent` | required | `kb-read`, `workspace-read` |
| `kb_apply_plan` | required | `kb-read`, `workspace-read`, `kb-write`, `workspace-write` |
| `kb_ingest_verification` | required | `kb-read`, `workspace-read`, `kb-write`, `workspace-write` |

### Extended `kb_search`

Existing `{ query, type, limit, offset }` calls retain current ranking and output. Intent mode activates only when `rankingMode: "intent-v1"`, `semanticFacets`, or `sourceLocations` is present.

```ts
type IntentSearchInput = {
  query: string;
  type?: EntityType;
  limit?: number;
  offset?: number;
  rankingMode?: "legacy" | "intent-v1";
  semanticFacets?: {
    actors?: string[];
    actions?: string[];
    objects?: string[];
    constraints?: string[];
    aliases?: string[];
  };
  sourceLocations?: Array<{
    path: string;       // workspace-relative only
    line?: number;      // 1-based
    column?: number;    // 1-based
    symbol?: string;    // exact or extracted symbol name
  }>;
  minScore?: number;    // intent-v1 only, default 0.18
};
```

Each result preserves `entity`, `score`, `reasons`, and `snippet`, and adds:

```ts
type IntentSearchEvidence = {
  normalizedScore: number;       // 0..1
  matchedFacets: string[];
  sourceMatches: Array<{ path: string; symbolId?: string; distance?: number }>;
  graphPaths: Array<{ from: string; relationships: string[]; to: string }>;
  abstentionEligible: boolean;
};
```

The payload adds `queryAnalysis` with ranking mode, candidate count, accepted count, top score, top-two margin, and `abstained`. An intent search abstains when no result meets `minScore`; it does not return low-confidence rows as if they were answers.

Ranking is deterministic:

1. Exact ID/title match.
2. Source coordinate containing symbol, exact `sourceFile`, and named symbol match.
3. Weighted BM25-style score over title, tags, source metadata, semantic prose, and body.
4. Facet/alias matches with lower weight than exact terms.
5. At most two curated graph hops from source symbols through `implements`, `covered_by`, `executable_for`, `specified_by`, `verified_by`, `validates`, and semantic fact relationships.
6. Stable tie-break by entity type and ID.

The candidate pool is the union of index hits for the literal query and each facet plus source/symbol seeds. It is capped at 10,000 before graph expansion. No pagination is applied until ranking is complete.

### `kibi.compile-plan.v1`

`kb_compile_intent` accepts the complete post-change intent, optional host interpretations, and optional decisions about discovered traceability candidates.

```ts
type CompileIntentInput = {
  intent: string;                         // complete normative text, not a patch
  mode: "create" | "update";
  requirementId?: string;                // required for forced update
  title?: string;
  sourceLocations?: IntentSearchInput["sourceLocations"];
  semanticFacets?: IntentSearchInput["semanticFacets"];
  clauses?: string[];                    // override automatic decomposition
  interpretations?: SemanticAdvisorInterpretation[];
  scenarioDrafts?: Array<{
    id?: string;
    title: string;
    body: string;
  }>;
  testDrafts?: Array<{
    id?: string;
    title: string;
    body: string;
    verificationScope?: "unit" | "integration" | "end_to_end";
    verificationPerspective?: "internal" | "consumer";
  }>;
  proposalDecisions?: Array<{
    proposalId: string;
    decision: "accept" | "reject";
  }>;
};
```

The result is a canonical plan:

```ts
type CompilePlanV1 = {
  version: "kibi.compile-plan.v1";
  planHash: string;                       // SHA-256 canonical plan body, excluding this field
  status: "ready" | "needs_resolution" | "blocked";
  expected: {
    branch: string;
    kbSnapshotId: string;
    workspaceSnapshot: string;
    sourceHashes: Record<string, string | null>;
  };
  target: {
    mode: "create" | "update";
    requirementId: string;
    selectionReason: string;
  };
  discovery: {
    candidates: SearchMatch[];
    abstained: boolean;
  };
  propositions: Array<{
    claimKey: string;
    text: string;
    span: { start: number; end: number };
    disposition: "strict_property" | "predicate" | "rule" | "observation" | "nonlogical";
    status: "modeled" | "ambiguous" | "ontology_gap" | "nonlogical";
    origin: "host" | "deterministic";
  }>;
  contradictionAnalysis: {
    outcome: "no_conflict" | "conflict" | "unresolved";
    witnesses: ContradictionWitness[];
  };
  proposals: TraceabilityProposal[];
  steps: PlanStep[];                      // dependency ordered
  sourceWrites: SourceWrite[];            // exact before/after hashes
  diagnostics: PlanDiagnostic[];
};
```

Compiler rules:

- Every assertive proposition has exactly one disposition and one matching semantic inventory entry.
- An unbound predicate argument, unsupported rule, ambiguous quantity, or source drift makes the plan `needs_resolution`.
- A conflicting current requirement makes the plan `blocked` unless the plan includes an explicit valid `supersedes` relationship.
- Updating an existing requirement is automatic only when the top candidate score is at least 0.85 and exceeds the runner-up by at least 0.15. Otherwise the caller must supply `requirementId`.
- Creating without an ID uses `REQ-<slug>-<8-char-content-hash>` and fails closed on collision with different content.
- Traceability proposals contain evidence and confidence but are excluded from `steps` until the caller resubmits their accept decision.
- Accepted relationship steps use only canonical directions: requirement -> scenario `specified_by`, scenario -> test `verified_by`, test-case symbol -> test `executable_for`, production symbol -> requirement `implements`, and production symbol -> test `covered_by`. Direct requirement-to-test links never satisfy proof.
- Existing low-level advisor, modeler, predicate, validation, and upsert tools remain available.

### `kb_apply_plan`

```ts
type ApplyPlanInput = {
  plan: CompilePlanV1;
  approvedPlanHash: string;
};
```

Application requirements:

- Reject anything except `status: "ready"`.
- Recompute the canonical hash and require equality with `approvedPlanHash`.
- Require the same branch, KB snapshot, workspace snapshot, and every source before-hash.
- Re-run all entity, relationship, proposition-completeness, granularity, contradiction, and full-plan referential checks inside the server.
- Acquire one workspace/branch plan lock.
- Write a recovery record under Kibi's internal branch storage before publishing tracked files.
- Apply all entity/relationship mutations in one bounded Prolog transaction and save once.
- Publish only configured entity roots and the configured symbol manifest; reject path traversal, symlinks leaving the workspace, and arbitrary code-file writes.
- Roll tracked files back byte-for-byte if the Prolog commit fails.
- Recover an interrupted `prepared` or `source_published` transaction on the next branch attach or plan application.
- Return the prior result without rewriting when the same plan hash is replayed after success.
- Never stage or commit Git changes.

The result uses `kibi.plan-apply-result.v1` with `applied | replayed`, the plan hash, changed entity/relationship counts, changed paths, final snapshot IDs, validation summary, and recovery-journal ID.

### Verification contract and receipt v2

A test may declare:

```yaml
verification_contract:
  version: kibi.verification-contract.v1
  runner: playwright
  command_argv:
    - pnpm
    - exec
    - playwright
    - test
    - --project=traditional-tests
  required_case_symbols:
    - SYM-PW-0123ABCDEF456789
  required_projects:
    - chromium
  success_policy: all_required_cases_first_attempt
```

Case symbols are normal `symbol` entities with `symbol_role: behavioral`, `tags: [test-case, playwright]`, exact source coordinates, and an `executable_for` relationship to the test entity. Their stable ID is derived from repository-relative file path plus the fully qualified static test title. Dynamic cases that cannot be statically identified produce a diagnostic and cannot enter a proof contract.

`kibi.verification-receipt.v2` keeps every v1 field and adds:

```ts
type VerificationReceiptV2 = Omit<VerificationReceiptV1, "version"> & {
  version: "kibi.verification-receipt.v2";
  command_argv: string[];
  contract_hash: string;
  case_results: Array<{
    symbol_id: string;
    project: string;
    outcome: "passed" | "failed" | "timed_out" | "skipped" | "interrupted";
    retries: number;
    duration_ms: number;
  }>;
};
```

A v2 receipt proves a contracted test only when:

- Its contract hash equals the current canonical contract hash.
- Its code snapshot equals the live verification snapshot and is within the existing freshness window.
- The process exited successfully.
- Every required case/project pair appears exactly once, passed, and has `retries: 0`.
- No required case was skipped, partial, filtered out, timed out, or interrupted.
- The receipt and result histories remain append-only.

New proof gap codes are `missing_verification_contract`, `verification_contract_drift`, `missing_required_case`, `duplicate_case_result`, `flaky_verification_receipt`, and `partial_verification_receipt`.

### `kb_ingest_verification`

The shared operation accepts a `kibi.playwright-run.v1` reporter artifact, a test ID, the snapshot captured immediately before execution, and environment metadata. It does not accept a caller-authored receipt or trusted outcome.

The operation:

1. Loads the test and current contract.
2. Recomputes the contract hash.
3. Re-reads the live workspace snapshot and rejects changed-snapshot artifacts without mutation.
4. Maps reporter case identities to contracted symbols.
5. Derives outcome, hashes, case results, and receipt ID from the artifact.
6. Validates append-only history.
7. Appends the receipt to the tracked test Markdown and matching KB entity using the plan-transaction primitive.
8. Returns the receipt and current proof state.

## Quarter 1: Discovery and the intent compiler

### Task 0: Establish requirements, ADRs, and reproducible evaluation corpora

**Create:**

- `documentation/adr/ADR-host-agent-intent-compiler.md`
- `documentation/requirements/REQ-kibi-intent-source-discovery.md`
- `documentation/requirements/REQ-kibi-compile-intent-plan.md`
- `documentation/requirements/REQ-kibi-atomic-plan-application.md`
- Matching `SCEN-*` and `TEST-*` documents.
- `documentation/evaluations/change-to-proof/search-gold.jsonl`
- `documentation/evaluations/change-to-proof/compile-gold.jsonl`
- `documentation/evaluations/change-to-proof/README.md`
- `scripts/change-to-proof-eval.ts`
- `scripts/tests/change-to-proof-eval.test.ts`

**Steps:**

- [ ] Encode the decisions in this plan as an accepted ADR.
- [ ] Add proposition-complete requirements and scenario/test traceability before production code.
- [ ] Build at least 60 search cases: 20 direct prose, 20 synonym/facet, 20 source-location/symbol cases, split evenly across Kibi, dogfood project A, and dogfood project B concepts.
- [ ] Build at least 40 compiler cases covering scalar constraints, predicates, safe rules, ambiguity, ontology gaps, supersession, and compound clauses.
- [ ] Store only normalized query text, source paths, and expected public entity IDs; do not copy private usage-log payloads into fixtures.
- [ ] Add metrics for Recall@5, source-location Recall@5, MRR, abstention precision, proposition accounting, grounding precision, and contradiction witness correctness.
- [ ] Record the current legacy-search and fragmented-modeling baselines before implementation.
- [ ] Sync through Kibi's public CLI and run targeted plus full `kb_check`; never edit `.kb/` directly.

**Exit gate:** The evaluator is deterministic and fails on threshold regression. It reports legacy baseline separately from intent-v1 results.

### Task 1: Remove runtime drift and make dogfood telemetry comparable

**Kibi files:**

- Modify `documentation/tests/e2e/packed/distribution-parity-matrix.test.ts`.
- Modify `packages/cli/src/public/distribution-parity.ts`.
- Modify `packages/cli/src/public/diagnostic-usage.ts`.
- Modify `packages/cli/src/public/telemetry-acceptance.ts`.
- Add focused tests under `packages/cli/tests/public/`.

**Dogfood adoption:**

- Dogfood project B: update `package.json`, `pnpm-lock.yaml`, and `.cursor/mcp.json` from `kibi-cli` 0.14.0 / `kibi-mcp` 0.19.0 to the same freshly packed release tested from this checkout.
- Dogfood project A: update `package.json`, `pnpm-lock.yaml`, `.opencode/bin/`, and the existing local update script to the same release.
- Preserve all unrelated dirty changes in both repositories.

**Steps:**

- [ ] Extend parity evidence with the 21-operation catalog and versioned search/plan/verification capabilities.
- [ ] Generate one stable diagnostic session ID per MCP/CLI process and carry it through all operations.
- [ ] Add new telemetry fields for search mode/candidates/abstention, plan status/hash/steps/replay, verification contract/cases, and ingest outcome.
- [ ] Ensure cancelled engine calls release their queue slot and branch lock; add a repeated attach/cancel/terminate stress test.
- [ ] Make exact validation-before-plan-apply server-enforced and separately measured from legacy direct upserts.
- [ ] Run the same fixture suite through source, packed CLI, packed MCP, and each dogfood-resolved runtime.

**Exit gate:** Both dogfoods resolve the same capability set; diagnostic completeness is at least 95%; operation error rate is below 2%; no target has three consecutive failed mutations.

### Task 2: Implement deterministic intent and code-aware search

**Create:**

- `packages/cli/src/public/intent-search.ts`
- `packages/cli/tests/intent-search-ranking.test.ts`
- `documentation/tests/e2e/packed/intent-source-search.test.ts`

**Modify:**

- `packages/cli/src/search-ranking.ts`
- `packages/cli/src/public/operations/discovery-executors.ts`
- `packages/cli/src/public/operations/specs/discovery.ts`
- `packages/cli/src/public/operations/runtime-types.ts`
- `packages/cli/src/public/diagnostic-usage.ts`
- MCP/CLI contract fixtures and reference docs.

**Steps:**

- [ ] Preserve the current ranker as the `legacy` implementation and freeze its existing tests.
- [ ] Add normalized intent facets and source-location validation with workspace-relative path enforcement.
- [ ] Resolve source locations to the narrowest coordinate-bearing symbols; fall back to source-file symbols only when no containing symbol exists.
- [ ] Add a Prolog-port batch method for union candidate lookup so facets do not require N independent engine calls.
- [ ] Implement weighted field statistics and BM25-style term scoring without an external search service.
- [ ] Add bounded graph expansion with explicit relationship allowlist and evidence paths.
- [ ] Normalize scores, apply the abstention threshold, and expose top-two margin.
- [ ] Cache loaded Markdown and corpus statistics for one operation only; invalidate naturally on the next call.
- [ ] Add deterministic ordering and pagination-after-ranking tests.
- [ ] Run the gold evaluator against direct prose, synonym, unfamiliar-vocabulary, path-only, line-only, and symbol-only cases.

**Exit gate:** Recall@5 >= 90%, source-location Recall@5 >= 95%, MRR >= 0.75, and abstention precision >= 90%, with no legacy-mode snapshot changes.

### Task 3: Build the read-only proposition-complete compiler

**Create:**

- `packages/cli/src/operations/planning/types.ts`
- `packages/cli/src/operations/planning/compile-intent.ts`
- `packages/cli/src/operations/planning/target-selection.ts`
- `packages/cli/src/operations/planning/proposition-plan.ts`
- `packages/cli/src/operations/planning/traceability-proposals.ts`
- `packages/cli/src/operations/planning/plan-hash.ts`
- `packages/cli/src/public/operations/specs/planning.ts`
- Unit tests under `packages/cli/tests/operations/planning/`.
- `documentation/tests/e2e/packed/compile-intent.test.ts`.

**Modify:**

- Reuse, and refactor only where necessary, `semantic-advisor`, `model-requirement`, `suggest-predicates`, legacy migration preview, repair-plan, and impact-analysis modules.
- Add `kb_compile_intent` to `OperationName`, the catalog, CLI metadata, parity fixtures, docs, and skills.

**Steps:**

- [ ] Canonicalize plans with sorted object keys and stable arrays; exclude `planHash` and generated timestamps from the hash.
- [ ] Use intent-v1 search to select or propose the target requirement.
- [ ] Run complete semantic decomposition and require one disposition per assertive proposition.
- [ ] Reuse existing claim-key, semantic-inventory, strict-fact, predicate-schema, and typed-logic validators rather than define parallel formats.
- [ ] Accept host interpretations only in the existing typed advisor shape; verify their clause span and source hash.
- [ ] Convert deterministic high-confidence scalar and predicate suggestions into ordered endpoint/entity/relationship steps.
- [ ] Keep ambiguous or unbound propositions explicit and set `needs_resolution`.
- [ ] Generate exact source writes for configured entity roots using a minimal frontmatter patch representation rather than whole-file reformatting.
- [ ] Discover scenario, test, and symbol candidates; attach evidence/confidence and require explicit accept/reject decisions before turning them into steps.
- [ ] Include exact existing contradiction witnesses and unresolved rule-overlap evidence.
- [ ] Add create, explicit-update, confident-auto-update, ambiguous-target, collision, compound-clause, and source-drift tests.

**Exit gate:** 100% proposition accounting on the compiler corpus, reviewed grounding precision >= 90%, and no applicable plan with an unbound predicate/rule or unresolved ambiguity.

### Task 4: Add full-plan validation and recovery-safe application

**Create:**

- `packages/cli/src/operations/planning/apply-plan.ts`
- `packages/cli/src/operations/planning/validate-plan.ts`
- `packages/cli/src/operations/planning/source-renderer.ts`
- `packages/cli/src/operations/planning/workspace-transaction.ts`
- `packages/cli/src/operations/planning/recovery-journal.ts`
- `packages/core/src/plan_mutation.pl`
- Focused CLI, engine, and PLUnit tests.
- `documentation/tests/e2e/packed/apply-intent-plan.test.ts`.

**Modify:**

- `packages/cli/src/public/operations/runtime-types.ts` with an injectable `WorkspaceTransactionPort`.
- `packages/cli/src/public/operations/node-ports.ts` with safe temp, rename, fsync, and rollback operations.
- Engine branch attach/startup to recover incomplete plan transactions.
- Catalog, CLI metadata, MCP fixtures, docs, and skills for `kb_apply_plan`.

**Steps:**

- [ ] Add a single Prolog entrypoint that validates and commits every plan entity/relationship under one branch write lock and saves once.
- [ ] Reuse the current upsert validation functions for each step, then add cross-step endpoint and contradiction validation.
- [ ] Implement exact before/after source hashes and configured-root allowlisting.
- [ ] Add a line-preserving frontmatter patcher; it may alter only keys named in a `SourceWrite` and must preserve body bytes unless the plan explicitly replaces the requirement body.
- [ ] Write and fsync a recovery journal before source publication.
- [ ] Publish staged files using same-filesystem atomic renames, then execute the single Prolog commit.
- [ ] Roll back source bytes on a normal Prolog failure.
- [ ] On process interruption, recover based on journal phase and current before/after hashes before accepting new writes.
- [ ] Persist the successful apply result in the journal and return it on same-hash replay.
- [ ] Reject stale, edited, rehashed, non-ready, wrong-branch, and out-of-root plans before any publication.
- [ ] Add injected failures at every phase and assert either complete before-state or complete after-state after recovery.

**Exit gate:** 100% server-enforced preflight for plan application, no partial durable plan in the fault-injection matrix, and byte-identical idempotent replay.

### Task 5: Quarter-1 dogfood shadow rollout

**Steps:**

- [ ] Release the search/compiler/application slice with human-first changesets for `kibi-core`, `kibi-cli`, and `kibi-mcp` plus synchronized agent integrations.
- [ ] Run intent-v1 search in shadow beside legacy search in both dogfoods for two weeks.
- [ ] Compile but do not apply plans for 15 representative changes in each dogfood; review target selection, proposition accounting, contradiction evidence, and link proposals.
- [ ] Apply five low-risk, non-conflicting plans in each dogfood and verify source/KB idempotency.
- [ ] Audit every abstention and every false-positive link proposal; add gold cases before changing weights.
- [ ] Do not enable a hard completion gate until search and application exit metrics hold for seven consecutive days.

**Quarter-1 milestone:** An agent can find requirements from intent or code and safely apply a complete typed semantic plan. E2E proof remains the main incomplete stage.

## Quarter 2: Exact E2E attribution, execution, and contradiction migration

### Task 6: Extract stable Playwright case symbols

**Create:**

- `packages/cli/src/extractors/playwright-cases.ts`
- `packages/cli/src/public/playwright-case-id.ts`
- `packages/cli/tests/extractors/playwright-cases.test.ts`
- Packed fixture projects for plain Playwright and `playwright-bdd` generated tests.

**Modify:**

- Symbol extraction/coordinator and coordinate refresh.
- Manifest/coordinate tests and symbol-quality diagnostics.
- Entity docs to define test-case symbol conventions.

**Steps:**

- [ ] Parse statically named `test`, `test.only`, `test.skip`, and nested `test.describe` calls with ts-morph.
- [ ] Identify Playwright imports/fixtures so unrelated functions named `test` are ignored.
- [ ] Build the fully qualified title from static describe/title literals and derive the stable case ID from path + title.
- [ ] Emit exact source ranges, `symbol_role: behavioral`, and `test-case`/`playwright` tags.
- [ ] Support generated BDD files when they are present and stable; map back to feature provenance when source metadata is available.
- [ ] Emit `dynamic_test_case_unresolved` for loops, computed titles, or runtime-generated cases that cannot be statically named.
- [ ] Never create a contract entry for an unresolved dynamic case.
- [ ] Detect renamed/deleted cases as contract drift during sync/check.

**Exit gate:** All statically named dogfood Playwright cases have stable IDs and coordinates across two clean syncs; unresolved cases are explicit and never silently collapsed to a file symbol.

### Task 7: Add verification contracts and receipt-v2 proof semantics

**Create:**

- `packages/cli/src/public/verification-contract.ts`
- Extend `packages/cli/src/public/verification-receipt.ts` with a v1/v2 union.
- New PLUnit and TypeScript proof fixtures.

**Modify:**

- Entity TypeScript/JSON/MCP schemas and Markdown extraction.
- Mutation serialization/validation, temp KB, sync persistence, and distribution parity.
- `packages/core/src/requirement_proof.pl` and repair-plan gap mapping.
- Reference docs, skills, requirements, scenarios, tests, symbol manifests, and changesets.

**Steps:**

- [ ] Add strict JSON schemas and canonical hashing for `kibi.verification-contract.v1` and receipt v2.
- [ ] Require contract test IDs and all required case symbols to exist; require each case symbol to link `executable_for` the same test.
- [ ] Preserve v1 history and append-only comparison byte-for-byte.
- [ ] Extend proof parsing to accept v1 or v2, but require v2 whenever a contract exists.
- [ ] Add exact gap codes for missing/drifted/partial/flaky case evidence.
- [ ] Update snapshot hashing to continue excluding receipt-history changes while including contracts and case mappings.
- [ ] Prove that changing contract, case mapping, code, or required project invalidates old proof.
- [ ] Prove that pass-after-retry remains visible but cannot satisfy the first-attempt policy.

**Exit gate:** A contracted test proves only with a current matching v2 receipt containing every required case/project on the first attempt; all partial and stale variants fail closed.

### Task 8: Implement the Playwright reporter and verification ingestion

**Create:**

- `packages/cli/src/verification/playwright-reporter.ts`
- `packages/cli/src/operations/verification/types.ts`
- `packages/cli/src/operations/verification/ingest-verification.ts`
- `packages/cli/src/operations/verification/artifact-validation.ts`
- `packages/cli/src/public/operations/specs/verification.ts`
- Tests under `packages/cli/tests/operations/verification/`.
- `documentation/tests/e2e/packed/verification-ingestion.test.ts`.

**Modify:**

- Export `kibi-cli/playwright-reporter`.
- Catalog, CLI metadata, MCP fixtures, docs, and skills for `kb_ingest_verification`.
- Reuse the recovery-safe source/KB transaction to append receipts.

**Steps:**

- [ ] Implement a reporter with no runtime dependency on `@playwright/test`; rely only on the reporter callback shape.
- [ ] Write `kibi.playwright-run.v1` to the path supplied by `KIBI_VERIFICATION_OUTPUT`.
- [ ] Record suite/project/title/file/line, final outcome, retries, duration, process errors, and run timestamps.
- [ ] Treat a missing reporter artifact as ingestion failure, never as a failed test receipt fabricated from exit code alone.
- [ ] Validate artifact size, version, timestamps, unique case identities, and all numeric bounds.
- [ ] Derive receipt ID and artifact digest from canonical artifact bytes.
- [ ] Reject live-snapshot drift before mutation and leave the artifact available for diagnosis.
- [ ] Append both passing and valid non-passing executions so the latest current-snapshot evidence explains proof state.
- [ ] Add MCP tests proving the operation cannot execute commands and cannot accept a self-authored receipt.

**Exit gate:** Inline artifact ingestion is semantically identical through CLI and MCP, produces append-only v2 receipts, and rejects forged/partial/stale artifacts.

### Task 9: Add the CLI-only `kibi verify` orchestration

**Create:**

- `packages/cli/src/commands/verify.ts`
- `packages/cli/src/cli-register-verification.ts`
- `packages/cli/tests/commands/verify.test.ts`

**Modify:**

- `packages/cli/src/cli.ts` and CLI docs.
- Dogfood Playwright configs to add the Kibi reporter alongside existing reporters.

**Command:**

```bash
kibi verify --test-id TEST-example -- pnpm exec playwright test --project=chromium
```

**Steps:**

- [ ] Require an explicit argv after `--`; do not execute `command_argv` read from the KB by default.
- [ ] Compare the supplied argv exactly with the current contract before execution.
- [ ] Spawn with `shell: false`, inherited stdio, an abort signal, and only documented Kibi reporter environment variables.
- [ ] Capture the live verification snapshot immediately before execution.
- [ ] Compute the privacy-safe environment hash from platform, architecture, Node version, runner version, lockfile digest, and project names—never arbitrary environment variables.
- [ ] After exit, require the reporter artifact and call the same in-process `kb_ingest_verification` executor.
- [ ] Return the runner's nonzero exit code after ingestion while still printing the stored receipt/proof state.
- [ ] On cancellation, terminate the child process group, ingest an interrupted artifact only when the reporter produced a valid one, and release all engine resources.

**Exit gate:** A tagged dogfood case can be run from one command and immediately appears as fresh proof; mismatched argv, missing reporter, snapshot drift, skip, retry, failure, and cancellation all fail closed.

### Task 10: Migrate semantic inventories and repair attribution in dogfoods

This is data/model adoption using public Kibi operations, not a one-off hidden migration.

**Selection:**

- Dogfood project A: 25 high-priority requirements spanning the 59 existing passing E2E tests.
- Dogfood project B: 10 high-priority requirements including the area currently represented by broad `TEST-170` links.

**Steps per requirement:**

- [ ] Query the exact current requirement, scenarios, tests, symbols, facts, and source.
- [ ] Generate the existing legacy migration preview and a compile plan from the complete authored prose.
- [ ] Review every proposition and supply host interpretations for ambiguous or domain-specific clauses.
- [ ] Reuse a built-in or project-local predicate schema only when every ordered argument is exact.
- [ ] Promote a new project-local schema only after at least three independent corpus claims need the same signature, or a domain owner identifies a stable concept; otherwise retain `review:ontology-gap`.
- [ ] Apply the reviewed semantic plan and run targeted logic/contradiction checks followed by full `kb_check`.
- [ ] Replace suite/file-level E2E anchors with exact case symbols.
- [ ] Remove implausible `covered_by` fan-out and accept only mappings supported by assertion behavior and scenario intent.
- [ ] Add verification contracts, run through `kibi verify`, and re-run complete requirement coverage.

**Attribution quality diagnostic:**

- Add a non-blocking `coverage_attribution_outlier` when one test has more than 20 incoming production-symbol `covered_by` links or is the sole proof test for more than 10 requirements.
- The diagnostic must show exact relationships and ask for case-level review; it must not delete links or assume the threshold proves an error.

**Exit gate:** At least 25 dogfood project A and 10 dogfood project B selected requirements are `proofProven`; every one has complete proposition grounding and exact case evidence; no selected requirement relies on a broad inferred coverage link.

### Task 11: Agent integration and hard-gate rollout

**Modify:**

- Shared `kibi-usage` and `kibi-traceability` source skills, then synchronize Codex/Cursor/OpenCode copies.
- MCP server instructions and CLI help.
- Telemetry acceptance/remediation diagnostics.
- Distribution parity capability matrix.

**Steps:**

- [ ] Teach agents the preferred sequence: search -> compile -> resolve/review -> apply -> verify -> coverage/check.
- [ ] Teach agents to supply semantic facets/interpretations, not raw Prolog or invented unbound values.
- [ ] Prefer `kb_compile_intent` over manually coordinating advisor/modeler/predicate/upsert for new work, while documenting low-level recovery paths.
- [ ] Add completion diagnostics for skipped plan preflight, unreviewed accepted proposals, missing contracts, and stale proof.
- [ ] Keep diagnostics advisory during the two-week shadow window.
- [ ] Enable hard enforcement only for plan application and contracted proof after seven consecutive days meeting telemetry, error, and retrieval gates.
- [ ] Never make raw graph coverage a substitute for semantic sample audits.

**Quarter-2 milestone:** The complete change-to-proof loop is available and proven in both dogfoods.

### Task 12: Release, documentation, and cleanup

**Steps:**

- [ ] Update `docs/mcp-reference.md`, `docs/cli-reference.md`, `docs/entity-schema.md`, `docs/inference-rules.md`, modeling cheatsheet, error reference, and public README examples.
- [ ] Regenerate MCP contracts and ensure all 21 shared operations have CLI/MCP parity fixtures.
- [ ] Add human-first changesets for every publishable package touched.
- [ ] Run `bun run sync:agent-skills`, `bun run build`, and Cursor dogfood sync when integration packages change.
- [ ] Run source-to-packed and dogfood-resolved distribution parity.
- [ ] Remove temporary compatibility/shadow logging only after the final acceptance report is checked in.
- [ ] Publish through the normal changeset workflow; never run `npm publish` manually.

## Test matrix

Every release slice must run focused tests first, then the relevant full gates.

| Layer | Required coverage |
|---|---|
| Pure TypeScript | Canonical hashes, rank math, spans, IDs, schemas, source patches, artifact validation, append-only history. |
| Engine/transaction | Locking, cancellation, one-save commit, idempotent replay, every recovery phase, stale snapshots, source rollback. |
| Prolog | Strict/predicate/rule contradiction witnesses, v1/v2 proof state, contract drift, partial/flaky case gaps. |
| CLI/MCP parity | Same schema, structured output, errors, effects, and telemetry for all 21 shared operations. |
| Packed consumer | Search, compile, apply, ingest, receipt proof, and recovery from freshly packed packages. |
| Dogfood | Exact search gold cases, reviewed plan applications, targeted Playwright cases, complete coverage and telemetry acceptance. |

Minimum Kibi verification commands:

```bash
bun test --timeout 15000 ./packages/cli/tests
bun test --timeout 15000 ./packages/mcp/tests
swipl -q -g run_tests -t halt -s packages/core/tests/kb.plt
bun run typecheck
bun run test:e2e:local
bun run check
```

For Prolog changes also run `bun run test:coverage:prolog`. For package/wiring changes run `bun run build` and the distribution-parity packed test. Use isolated temp workspaces and restore all mocks/global state after each test.

## Rollout gates and success measures

The feature is not complete when the operations merely exist. All of these gates must hold:

### Retrieval

- Intent Recall@5 >= 90%.
- Source-location Recall@5 >= 95%.
- MRR >= 0.75.
- Abstention precision >= 90%.
- Dogfood exact-query zero-result rate trends down for two consecutive weekly windows.

### Semantic compilation

- 100% of assertive propositions receive exactly one disposition.
- Reviewed logical-grounding precision >= 90%.
- No plan is applicable with ambiguity, ontology gaps presented as proof, unbound arguments, stale source spans, or unresolved contradiction overlap.
- Every contradiction result includes exact source-bound witnesses or remains explicitly unresolved.

### Application reliability

- 100% of plan applies revalidate on the server.
- Zero partial durable states across the fault-injection suite.
- Same-hash replay is byte-identical and reports `replayed`.
- Diagnostic telemetry completeness >= 95%, error rate < 2%, and no three-failure target streak.

### Verification and attribution

- Every contracted required Playwright case/project is present exactly once and passed on first attempt.
- Partial, skipped, retried, failed, stale, cancelled, or contract-drifted runs never prove a requirement.
- At least 25 dogfood project A and 10 dogfood project B high-priority requirements become `proofProven`.
- Selected requirements have no suite-level or implausibly broad inferred coverage dependency.

## Dependency order and release slices

```text
Task 0 evaluation/requirements
  -> Task 1 comparable runtimes
  -> Task 2 intent search
  -> Task 3 compile plan
  -> Task 4 apply transaction
  -> Task 5 Q1 shadow rollout
  -> Task 6 case extraction
  -> Task 7 contracts/proof v2
  -> Task 8 reporter/ingestion
  -> Task 9 verify CLI
  -> Task 10 dogfood migration
  -> Task 11 hard rollout
  -> Task 12 release closeout
```

Recommended releasable increments:

1. **Discovery release:** intent-v1 search, source-location evidence, evaluation runner.
2. **Compiler release:** compile plan and traceability proposals, read-only only.
3. **Application release:** recovery-safe apply and agent guidance.
4. **Verification-model release:** Playwright case symbols, contracts, and proof v2.
5. **Execution release:** reporter, ingestion, and `kibi verify`.
6. **Adoption release:** migrated dogfood corpus, hard gates, and final docs.

Each increment must be independently shippable and must not leave a public schema advertised before source-to-packed parity exists.

## Delivery schedule

This schedule assumes one primary engineer, with short reviews from the dogfood project A and dogfood project B owners during corpus construction and migration. Additional engineers can parallelize fixtures, docs, and dogfood adoption, but not the search -> compile -> apply or contract -> ingest -> verify critical paths.

| Window | Planned work | Demonstrable result |
|---|---|---|
| Quarter 1, weeks 1-2 | Tasks 0-1 | Reproducible baselines, current runtimes, complete telemetry. |
| Quarter 1, weeks 3-5 | Task 2 | Intent/source search meets offline retrieval gates. |
| Quarter 1, weeks 6-8 | Task 3 | Read-only proposition-complete plans with exact witnesses and reviewed proposals. |
| Quarter 1, weeks 9-11 | Task 4 | Recovery-safe, idempotent source + KB application. |
| Quarter 1, week 12 | Task 5 | Ten safe dogfood applications and shadow report. |
| Quarter 2, weeks 1-3 | Tasks 6-7 | Stable Playwright cases, contracts, and v2 proof semantics. |
| Quarter 2, weeks 4-6 | Tasks 8-9 | Reporter ingestion and one-command local verification. |
| Quarter 2, weeks 7-10 | Task 10 | 35 high-priority dogfood requirements semantically migrated and proven. |
| Quarter 2, week 11 | Task 11 | Agent workflows and measured hard gates enabled. |
| Quarter 2, week 12 | Task 12 | Packed parity, final acceptance report, release documentation. |

## Main risks and controls

| Risk | Control |
|---|---|
| Semantic facets make bad search look confident | Versioned gold corpus, explicit evidence, normalized threshold, top-margin reporting, and abstention. |
| Plan application corrupts source or KB | Exact before-hashes, configured-root allowlist, one Prolog transaction, write-ahead recovery, fault injection, idempotent replay. |
| Host interpretations omit a clause | Source-bound proposition ledger and 100% accounting before `ready`. |
| Broad E2E links inflate proof | Exact test-case symbols, reviewed proposals, contracts, outlier diagnostics, and no proof from suite status. |
| Reporter says pass without complete execution | Ingest derives receipt from raw case results and requires all case/project pairs with zero retries. |
| Dogfoods test different Kibi versions | Runtime provenance and packed/resolved distribution parity before product conclusions. |
| New workflow becomes another optional path | Agent guidance, server-enforced apply validation, shadow telemetry, then measured completion gates. |

## Definition of done

The work is done only when an agent can demonstrate this sequence in both dogfoods without manual `.kb/` editing:

1. Start from an unfamiliar functionality prompt or a changed code line.
2. Retrieve the correct owning requirement with evidence or receive an honest abstention.
3. Compile the complete prose into a reviewed, proposition-complete typed plan.
4. See exact contradiction witnesses or explicit unresolved semantics.
5. Apply the plan once, replay it safely, and keep tracked source plus branch KB consistent.
6. Map an exact Playwright case to the scenario/test/production symbols it covers.
7. Run the explicit contract through `kibi verify`.
8. Obtain a current v2 receipt and `proofProven` coverage only when every required case truly passed.
9. Pass full Kibi checks, telemetry acceptance, distribution parity, package builds, and dogfood smoke tests.
