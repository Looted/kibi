# kibi-cli

## 0.21.0

### Minor Changes

- Existing Kibi installations now receive an agent-guided migration workflow instead of opaque repair advice. Status, checks, and coverage expose one deterministic, hash-bound action plan; agents can safely apply only explicitly approved automatic repairs while semantic, proof, package, and operator work remains visible for review. This makes damaged or legacy KBs recoverable without direct `.kb` edits and gives every run an auditable post-application readback.

  - Add `kibi.migration-plan.v2` fragments to the 21-operation surfaces and support hash/action authorization in `kb_apply_plan` and `kibi migrate --apply-safe`.
  - Add lazy status/planning and deterministic schema, branch, storage, coordinate, and recovery action execution with workspace-root-safe CLI/MCP parity.
  - Refresh agent skills, traceability fixtures, and SkillOpt coverage for migration safety boundaries and five-axis closeout reporting.

### Patch Changes

- Updated dependencies
  - kibi-core@0.10.3

## 0.20.1

### Patch Changes

- de7b85a: Verification contracts can now evolve without forcing projects to erase valid historical test evidence. Kibi preserves every earlier receipt, accepts a newly appended receipt for the current contract, and only treats evidence matching both the current contract and live code snapshot as proof.

  - Separate immutable receipt-history validation from current-contract binding during verification ingest.
  - Report `verification_contract_mismatch` as an explicit proof gap until current-contract evidence is appended.
  - Teach the usage skill and SkillOpt evaluator to preserve older-contract receipts and forbid history rewrites.

- 584336b: Agents now get consistent guidance when execution proof, structural coverage, and KB freshness disagree. Current-contract E2E evidence is recorded as v2 without rewriting history, and full checks no longer report a contradictory weak-depth warning when the same live receipt already proves the scenario-backed test. Receipt freshness repairs also identify the affected requirements and tests so agents can rerun the exact contract.

  - Share snapshot-bound proof evidence with full quality diagnostics.
  - Add bounded receipt-gap telemetry and v2-native remediation guidance.
  - Document and test the new receipt and proof-aware diagnostic requirements.
  - Refresh the mirrored usage skills and dogfood-derived SkillOpt expectations.
  - Keep the MCP package contract verifier self-contained with an explicit semver development dependency and matching workspace lock ranges.

- Kibi can now explain a missing or damaged branch-local KB without changing it. Agents receive a precise recovery path, preserving the existing store before a deliberate rebuild, and no longer need to guess whether a clean check also means a clean, fresh KB.

  - Add non-mutating branch-store inspection to status and a preview-first `kibi branch recover --apply` workflow.
  - Restrict branch migration to the detected historical `master` -> legacy `main` compatibility attachment; arbitrary branch moves are refused.
  - Refresh CLI/MCP status documentation, mirrored agent skills, and release-gate packed consumer coverage.

- ef75929: Kibi’s release checks now validate compiled package APIs and dependency ranges in isolated npm and pnpm consumers, while the usage skill and private SkillOpt evaluator report task completion, KB freshness, verification, proof, and accepted limitations independently. Consumer repositories keep ownership of their local artifact update scripts and dependency overrides.

  - Remove library-side consumer dogfood installers and retain release-only packed checks.
  - Add deterministic closeout expectations and dogfood-derived held-out cases.

- Updated dependencies [de7b85a]
- Updated dependencies [584336b]
  - kibi-core@0.10.2

## 0.20.0

### Minor Changes

- 9d71304: Kibi can now compile a complete change intent into a reviewable, snapshot-bound plan before anything is written, then apply an explicitly approved plan only after rechecking its hash and live snapshots. The new operations reuse intent-aware discovery and semantic modeling, account for every proposition, surface current contradiction witnesses, and keep traceability proposals separate from executable steps until explicitly accepted.

  - Add the shared `kb_compile_intent` / `compile-intent` operation and deterministic `kibi.compile-plan.v1` result.
  - Add the guarded `kb_apply_plan` / `apply-plan` mutation boundary and `kibi.plan-apply-result.v1` result.
  - Add contracted verification ingestion through `kb_ingest_verification`, including snapshot-bound `kibi.verification-receipt.v2` case results.
  - Register the operation through the CLI and MCP parity surfaces with contract tests and documentation.

- Dogfood projects now get branch-local knowledge bases that follow the exact Git ref, actionable stale-source diagnostics, and a sanctioned relationship cleanup path. Verification receipts and packed package provenance are stricter and reproducible, while agents receive conservative symbol-recovery guidance and explicit interim-state signals. This prevents silent `master`/`main` drift and makes passing E2E evidence distinguishable from complete semantic proof.

  - Remove implicit branch-name normalization and add previewed legacy branch migration.
  - Add exact relationship deletion, v2 receipt/schema parity, status diagnostics, dogfood package manifests, and SkillOpt cases.

- 9d71304: Kibi search can now recover requirements from unfamiliar functionality wording and changed source locations when the host agent supplies semantic facets. Intent searches return deterministic ranking evidence, traceability graph evidence, and an explicit abstention signal for low-confidence results while preserving the existing lexical search behavior.

  - Add the `intent-v1` search ranking mode and source-location validation.
  - Expose semantic facet matches, source matches, graph paths, and query analysis in shared CLI/MCP structured output.

- 9d71304: Kibi can now run an explicitly contracted Playwright command and immediately ingest its raw reporter artifact as snapshot-bound proof. Stable Playwright case IDs and a dependency-free reporter make exact case/project coverage visible, while command mismatches, missing artifacts, retries, and stale snapshots fail closed.

  - Add the CLI-only `kibi verify` orchestration command.
  - Export the Playwright reporter and stable case-ID helpers.
  - Add deterministic case extraction and change-to-proof evaluation utilities.

### Patch Changes

- 7ddbaff: Dogfood projects can now resume proof work without losing their declared test intent. Test entities persist a typed verification contract, workspace snapshots ignore receipt-only churn consistently, and the sync guard no longer mistakes quoted requirement prose for executable escape hatches. Explicit ontology gaps remain unresolved rather than being reported as missing logical proof.

  - Persist and validate `verification_contract.v1` through extraction, mutation, sync, and staged traceability KBs.
  - Version the receipt-stable workspace snapshot as `kibi.workspace-snapshot.v2`.
  - Make logic coverage inventory-aware and support Prolog-encoded semantic inventories.

- MCP startup now fails with the original dependency error instead of silently loading an unpackaged source file, and the CLI/MCP package contract is checked against the packed artifacts. The coordinated release also makes MCP require the CLI release that exports every operation it imports.

  - Preserve compiled-entrypoint import errors in the `kibi-mcp` launcher.
  - Require the compatible `kibi-cli` export surface and verify it in isolated package consumers.

- Updated dependencies
- Updated dependencies [7ddbaff]
  - kibi-core@0.10.1

## 0.19.0

### Minor Changes

- 3ac9a89: Kibi now keeps a shared engine warm for each workspace and branch, so repeated
  CLI and MCP operations no longer pay SWI-Prolog startup or rewrite a complete
  RDF snapshot for every change. Existing branches migrate once to journaled RDF
  storage, while normal sync updates only changed sources and relationships.
  Writes keep their audit record transactionally, and the new storage commands
  make compaction and legacy exports explicit.

  - Add SWI `rdf_persistency` journal attach/save/compact/export and guarded legacy
    migration with generation metadata and old-client fencing.
  - Add the Node 18+ engine daemon, framed local RPC client, lifecycle commands,
    Node-only CLI/MCP runtime boundary, and delta sync batching.
  - Add journaled-engine requirements, scenarios, tests, and ADR-024.

### Patch Changes

- Kibi's CLI now starts substantially faster, and its integration tests reuse the
  journaled engine without leaving background processes behind. Packed end-to-end
  tests share one immutable installation and run with bounded concurrency, making
  the release suite faster while preserving workspace and branch isolation.

  - Lazily load CLI operation implementations while parity-testing lightweight
    registration metadata against the authoritative operation catalog.
  - Gracefully flush and stop engine daemons on process signals, and add
    deterministic per-fixture engine cleanup to unit and packed E2E harnesses.
  - Reuse long-lived Prolog fixtures where lifecycle isolation is not under test,
    parallelize root batches conservatively, and install packed artifacts once.

- Updated dependencies [3ac9a89]
  - kibi-core@0.10.0

## 0.18.1

### Patch Changes

- Upserts now finish as one bounded commit, so an entity, its relationships, audit history, and branch snapshot succeed or fail together. Historical audit journals no longer remain locked after a write, and stale runtimes receive a clear restart instruction instead of hanging indefinitely. Timed-out Prolog work is terminated and reaped, including the process group, so later Kibi operations can continue safely.

  - Add `kb_commit_upsert/5` with branch-lock, snapshot, audit-lock, stage-marker, and single-save handling.
  - Attach persistent audit stores with `sync(close)` and use non-blocking stale-lock probes.
  - Route CLI upserts through the combined commit goal and manage Bun one-shot children asynchronously with TERM/KILL escalation.

- Updated dependencies
  - kibi-core@0.9.1

## 0.18.0

### Minor Changes

- Coverage reports now distinguish structural linkage from a conservative end-to-end requirement proof. Users can see exactly which semantic, contradiction, scenario, E2E, symbol, or source-coordinate stage prevents proof, together with ranked repair guidance; executable test symbols also stop inflating production-coverage counts. Structured proposition ledgers and refreshed symbol coordinates now survive sync as queryable proof evidence.

  Current requirement ingestion now fails closed when assertive prose is missing from its ledger, drifts from its source hash or byte spans, duplicates an identity, or claims a modeled representation without exactly one same-key grounding fact. Markdown projects receive a compatibility baseline before new or semantically edited requirements are held to the contract, and explicit unresolved states remain usable without being misreported as consistency.

  Proof-bearing tests now keep append-only execution receipts tied to the current deterministic workspace snapshot. Coverage and status expose that snapshot through CLI and MCP, and missing, stale, failed, malformed, mismatched, future-dated, or unavailable evidence can no longer inherit authority from a durable `passing` label.

  Requirement coverage now turns proof gaps into a deterministic read-only migration plan. Users can work one validated dependency batch at a time, see when pagination makes a plan incomplete, and avoid applying downstream links or receipts before their semantic and graph prerequisites exist.

  Diagnostic usage evidence now drives a versioned workflow acceptance report. Users can enforce fresh advisor, validation, source-lookup, proof-recovery, receipt, and mutation-retry evidence from the CLI, while unfiltered CLI/MCP checks surface ranked project-local repairs without treating missing or stale telemetry as a pass.

  Distribution audits now compare the same six requirement-compiler behaviors across source, freshly packed CLI/MCP packages, and the binaries actually resolved by dogfood or pinned projects. Unsupported legacy capabilities remain explicit non-matches, executable provenance is inspected directly, and every project divergence needs a named upgrade or compatibility action.

  Diagnostic workflows now produce correlated evidence through both CLI JSON and MCP surfaces. Operators can run a read-only versioned remediation report that points to exact unmatched log events, preserves explicit missing-coverage work, and prevents advisor or preflight evidence from a different identified session or actor from counting as proof.

  Legacy prose can now be inspected one requirement at a time through a deterministic migration preview. The preview preserves existing code evidence, binds every extracted proposition to exact authored source, ranks project-local ontology candidates, and never emits an auto-applicable write.

  - Add the shared `kibi.requirement-proof.v2` Prolog evaluator and expose its rows, fresh receipt evidence, and summary counts through CLI and MCP coverage.
  - Persist generated symbol coordinates and symbol metadata into normal and staged RDF projections.
  - Preserve semantic-inventory JSON through mutation, sync, RDF storage, and query round trips, and refresh coordinates before extracting their manifest overlay.
  - Render proof state and proof gaps in the CLI coverage table, and classify symbol traceability roles explicitly.
  - Document the proof contract and update the bundled traceability skill to use proof outcomes instead of structural counts as its success boundary.
  - Add the versioned `kibi.semantic-inventory.v1` boundary to CLI/MCP preflight, upsert, modeling plans, and Markdown sync, with packed-package E2E coverage.
  - Preserve JSON Schema `const` values through MCP's Zod adapter so source and packed tool contracts enforce and advertise the same inventory version.
  - Add append-only `kibi.verification-receipt.v1` validation, RDF/Markdown persistence, snapshot-bound freshness checks, explicit repair gaps, and CLI/MCP workspace-snapshot parity.
  - Discover project-local predicate schemas from normalized RDF, withhold write plans for unbound ordered arguments, and accept exact `schemaId`, `argumentBindings`, and reviewed `polarityHint` inputs for conservative completion without lexical guessing.
  - Attach source-bound strict, predicate, and rule witnesses to contradiction diagnostics, preserving unresolved rule overlap as incomplete analysis in requirement proof.
  - Add `kibi.repair-plan.v1` to requirement coverage with stable plan IDs, per-requirement dependency batches, pagination fail-closed behavior, validation workflows, and non-auto-applicable sequential mutation policy across CLI and MCP.
  - Add `kibi.telemetry-acceptance.v1`, exact mutation fingerprints, coverage recovery/receipt event fields, the `usage-metrics --require-acceptance` gate, and telemetry-backed full-check quality diagnostics.
  - Add `kibi.distribution-parity.v1`, executable-derived runtime provenance, stable semantic normalization, action-bound project divergences, and packed/project-resolved E2E fixtures for the six requirement-compiler capabilities.
  - Add CLI JSON diagnostic logging, opaque session/actor correlation, and the deterministic read-only `kibi.telemetry-remediation.v1` report and command.
  - Add `kibi.legacy-migration-plan.v1` to CLI and MCP coverage with fail-closed source binding, exact proposition inventories, schema-provenance ranking, deterministic pagination, and packed read-only E2E coverage. Requirement-only `semantic_text` now carries authored prose independently from `text_ref` evidence, and semantic source drift blocks review application.

### Patch Changes

- Updated dependencies
  - kibi-core@0.9.0

## 0.17.0

### Minor Changes

- a52b592: Kibi can now turn a requirement’s assertive prose into reviewable, typed logical models while keeping the original wording for people. Conditional rules, obligations, permissions, prohibitions, exceptions, bounded quantities, and temporal qualifiers are validated before they enter the knowledge base, and contradictions can report structured witnesses instead of relying on executable text. Existing requirements remain compatible and can be migrated or backfilled deliberately.

  - Add versioned `kibi.logic.v1` IR, safe bounded Prolog interpretation, rule schemas, rule facts, provenance, and contradiction checks.
  - Extend the semantic advisor with proposition inventories, typed alternatives, source spans, shadow audits, and logic apply plans.
  - Preserve rule fields and `requires_rule` through CLI, MCP, Markdown, Prolog, and schema validation surfaces.
  - Add rule safety, rule verifiability, and semantic completeness checks plus schema-v4 migration metadata.

### Patch Changes

- 5e4e126: Agents no longer treat Kibi's CLI as an MCP fallback. MCP tools and the trusted project-local CLI are presented as peer surfaces over the same 18 operations, and agent guidance now selects whichever interface is visible and approved in the current environment. The CLI's `--input` JSON routes remain first-class for agent automation, with no preference order implied.

  - Reframe `kibi-usage` Interface Selection and the operation-access preference column to peer surfaces.
  - Update OpenCode prompt injection, enforcement, and init-kibi guidance.
  - Update the MCP init-kibi prompt and the staged-impact evidence resolution text.
  - Re-sync the Cursor and Codex skill bundles.

- 6d66110: Read-only Kibi commands (`kibi query`, `kibi search`, `kibi status`, `kibi gaps`, `kibi coverage`, `kibi graph`) now work in non-git workspaces again, attaching to the `main` branch just like `kibi init` and `kibi migrate` already do. A recent branch-resolution fix for unborn git repos had removed that non-git fallback, which broke the packed-install smoke test and blocked npm publishing.

  - Restore the `main` fallback in the CLI operation runtime only for `NOT_A_GIT_REPO` and `GIT_NOT_AVAILABLE` contexts.
  - Keep propagating genuine git branch-resolution errors (detached HEAD, invalid branch, unknown) so read operations never silently attach to the wrong branch.
  - Add a runtime regression test pinning non-git fallback to `main` and a second test confirming real git failures still propagate.

- 750ff49: `kibi check --staged` now reports the paths Kibi is actually configured to use. Previously the stale-coordinates and missing-evidence diagnostics always printed the default `documentation/symbols.yaml` and `documentation/symbol-coordinates.yaml`, so repos that configure `paths.symbols` (for example `docs/symbols.yaml`) were told to stage files that do not exist. The staged-symbols freshness check also stopped treating coarse-documented symbols as a perpetual failure: source files whose manifest entries are all documented with a canonical granularity reason (for example `module-level-behavior`) no longer require per-symbol coordinate refresh and no longer emit `symbols_manifest_stale` after a coordinate refresh.

  - Thread the config-resolved symbols manifest path from `check --staged` into `collectStagedKibiDiagnostics` and render `files`/`message`/`suggestion` with the effective `symbols-coordinates.yaml` path carried on the impact evidence.
  - Define "coarse" with the canonical no-coordinates granularity set (`COARSE_GRANULARITY_REASONS`: `config-artifact`, `module-level-behavior`, `extractor-miss`, `test-suite`), so unknown or malformed reasons cannot bypass freshness checks. `legacy-link` records stay coordinate-bearing because they track real extractable symbols.
  - Exclude coarse records from per-symbol coordinate comparison; a file with only coarse records is `not_required`, mixed manifests still require complete fresh fine-grained coverage, and record-less files remain `stale`/`missing`.
  - Add unit and CLI-level regression tests covering configured `docs/` diagnostics paths and coarse/mixed/invalid-granularity freshness.

- 2a85fc8: Kibi can now track whether every atomic clause in a normative requirement has a queryable logical representation. Readable prose remains intact, while stable claim keys, linked strict-property or predicate facts, and a requirement manifest expose incomplete modeling before it silently weakens contradiction detection. Exact opposite polarities over the same ground predicate now produce a contradiction.

  - Remove repository-specific release and optimizer-corpus text from `kibi-usage`.
  - Add portable clause-complete prose-to-ground-predicate/property guidance and examples.
  - Preserve logical claim and predicate-schema fields through Markdown sync.
  - Add semantic-advisor clause inventories, merged claim manifests, and the `logic-coverage` check.
  - Enable manifest validation by default and report every current unmanifested requirement as explicit backfill debt.
  - Detect exact `assert`/`deny` conflicts over the same ground predicate.
  - Normalize trailing clause punctuation so formatting variants share one claim identity.
  - Enforce a one-claim/one-ground-fact mapping and reject duplicate logical terms masquerading as separate coverage.
  - Preserve every target when exact query results contain repeated relationship types.
  - Keep semantic-advisor readiness partial until every normative claim has a distinct logical grounding slot.
  - Drain machine-readable CLI output before the explicit process exit so large results are complete without leaving runtime handles alive.
  - Preserve and enforce claim-key patterns, uniqueness, and paired provenance through MCP schema registration.
  - Synchronize the corrected skill into the Codex and Cursor bundles.

- a28d325: SkillOpt verification now reads canonical skill bundles from an explicitly authorized repository snapshot, and the public skill loader is split into focused modules with scoped readers. That stops locked source or isolated target checkouts from silently falling back to a different skill tree during review and adoption planning.

  fix(cli): add scoped canonical skill bundle loaders

- 38f72bf: Refreshing symbol coordinates now leaves the authored symbol manifest stable and keeps generated locations exclusively in `symbol-coordinates.yaml`. Repeated refreshes no longer alternate thousands of generated fields in and out of `symbols.yaml`, making traceability updates reviewable and idempotent.

  - Strip generated coordinate fields from every authored symbol entry after extraction.
  - Clarify the manifest header and cover coordinate-free and legacy entries in the refresh tests.

- 2d93976: `kibi sync --refresh-symbol-coordinates` no longer reports coarse symbol anchors as coordinate-refresh failures. Symbols that intentionally represent a whole test file, module-level behavior, config artifact, or an acknowledged extractor miss legitimately carry no per-symbol coordinates, so they are now counted as unchanged instead of failed. This makes the refresh summary trustworthy: `failed` now means a fine-grained code symbol that should have coordinates but could not be located.

  - Treat `test-suite`, `module-level-behavior`, `config-artifact`, and `extractor-miss` granularity reasons as coordinate-ineligible.
  - Repoint `formatInvalidRelationshipError`/`Tuple` and `formatRelationshipSourceMismatch` to their defining module and merge their interface-parity traceability.
  - Drop duplicate and dead symbol manifest entries (`SkillsLoadPayload`, re-export duplicate `SemanticAdvisorArgs`, `SYM-parity-format-*`, duplicate `process-control` anchor).
  - Fix `kibiOpencodePlugin` to point at its defining file with an acknowledged `extractor-miss`.
  - Add `test-suite`/`config-artifact` granularity to remaining prose-titled test and scope anchors.

- 2f9073c: Kibi now ships optional guidance for recording UI and visual expectations, so agents working on a screen can discover "where things live" and cannot silently drift the layout. A prose requirement anchors the full visual description, checkable positions, alignment, and header ordering decompose into strict facts that reject conflicting writes, and relational alignment uses the built-in `visual_layout_rule` predicate. The lane is per-project: non-UI projects simply never model UI subjects, and no validation rule requires them.

  Also, `kb_status` within a long-lived MCP session now observes same-session file and KB changes instead of returning a stale cached result. Compound Prolog goals (such as the status query) are no longer cached in one-shot mode, so a status check after a source or documentation edit reports the current freshness state.

  - Add `docs/ui-requirements.md` with the three-layer UI modeling guide, payload-shaped examples, and the check workflow.
  - Point the modeling cheatsheet decision tree, agent LLM rules, and the AGENTS quick references at the new UI lane.
  - Add a self-contained `kibi-usage` skill resource (`resources/ui-requirements.md`), declare it in the skill manifest, and add a UI modeling workflow section.
  - Synchronize the updated `kibi-usage` skill into the Codex and Cursor bundles.
  - Keep compound Prolog goals out of the one-shot query cache so `kb_status` reports fresh state after same-session writes.

- Updated dependencies [2a85fc8]
- Updated dependencies [a52b592]
  - kibi-core@0.8.0

## 0.16.1

### Patch Changes

- 7bc935f: Kibi checks no longer flag a manifest symbol as coarse merely because a different sibling function changed. Staged manifest-only changes also continue to supply Kibi impact evidence. This keeps impact diagnostics focused on the code and metadata that actually changed.

  - Preserve full-source manifest anchors during hunk-based granularity analysis and retain changed manifest entity IDs for staged checks.

## 0.16.0

### Minor Changes

- b2b1792: Kibi guidance now helps agents distinguish suitable relational predicates from scalar constraints and review-only claims without replacing readable requirements. CLI, Codex, and Cursor users receive the same predicate-first decision tree and authoritative examples, reducing invented predicates and unsafe modeling.

  - Add built-in, project-local, deny, strict-scalar, ambiguity, false-positive, and ontology-gap guidance to the canonical `kibi-usage` skill.
  - Regenerate the Codex and Cursor mirrors with matching canonical hashes.

### Patch Changes

- 80d5173: Broad Kibi searches now return ranked results even when the serialized entity set is larger than the subprocess runtime's former default output capacity. Searches that exceed Kibi's explicit safety bound now report a clear bounded-capacity failure instead of returning truncated output or a misleading generic Prolog error. Graph, status, and other JSON reporting commands now also load their Prolog module correctly in fresh Node CLI and MCP sessions.

  - Bound one-shot and interactive Node Prolog stdout and stderr capture at 8 MiB, and require a complete response terminator before parsing, while preserving query timeouts and ranking-before-pagination.
  - Translate `ENOBUFS` into a deterministic nonempty query error shared by CLI and MCP discovery paths.
  - Reject negative pagination and search queries above 4,096 characters through the existing typed input-validation boundary.
  - Load reporting modules before executing module-qualified goals in interactive Prolog sessions.

- Staged Kibi checks no longer emit duplicate `symbol_coordinate_review` diagnostics when both staged and working-tree symbol manifests contain entries for the same source files. The manifest lookup now deduplicates by symbol ID and source-signature before running impact validation.

  - Deduplicate authored and manifest symbol extraction results by stable lookup key before building the staged impact lookup.
  - Prefer staged entries over working-tree entries when both exist for the same symbol.

- CLI read-side operations (query, search, status, gaps, coverage, graph) now resolve the active branch correctly on unborn repositories (fresh `git init` with no commits). Previously, these operations silently fell back to `main` when `git rev-parse --abbrev-ref HEAD` failed on an unborn HEAD, causing empty results while `kibi sync` correctly wrote to the actual branch.

  - Replace `git rev-parse --abbrev-ref HEAD` with `resolveActiveBranch(root)` for all read-side CLI operations.
  - Propagate branch resolution errors instead of silently falling back to `main`.

- 610b5be: The improved Kibi guidance skills will ship to CLI, Codex, and Cursor users in the next package release. This keeps the canonical CLI skill bundle and the generated client-plugin mirrors aligned for downstream installs.

  - Release the canonical skills bundled by `kibi-cli`.
  - Release the generated `kibi-codex` and `kibi-cursor` skill mirrors.

- Updated dependencies [28dba1f]
  - kibi-core@0.7.1

## 0.15.0

### Minor Changes

- 6abc7ea: Operators can now run semantic requirement analysis through the dedicated `semantic-advisor --input` CLI route with the same JSON contract and deterministic suggestions as MCP. MCP and upsert analysis now reuse the shared CLI implementation, so ambiguity witnesses and modeling advice stay aligned without starting Prolog.

  - Move semantic-advisor analysis, types, coverage evaluation, and execution into size-bounded `kibi-cli` modules.
  - Replace the MCP semantic-advisor implementation with a thin shared-executor adapter and update upsert imports.

- 6c132ee: Operators can use `find-gaps`, `coverage`, and `graph` through either CLI flags or JSON input with the same results exposed by MCP. The existing `gaps` command remains available as an alias, while reporting defaults and traversal bounds stay unchanged.

  - Move find-gaps, coverage, and graph execution into shared `kibi-cli` operation specs.
  - Replace MCP reporting business logic with thin shared-executor adapters.
  - Route legacy reporting commands and JSON input through the shared operation protocol.

- a0fee4a: Kibi CLI now exposes all 18 MCP operations as peer public routes with exact JSON input/output, enabling agents to use either interface. Agents and automation can choose the transport their environment supports without losing operation coverage or contract fidelity.

  - Added a transport-neutral operation catalog.
  - Added dedicated CLI commands for upsert, delete, semantic-advisor, model-requirement, suggest-predicates, autopilot-generate, sparql-remote, and validate-upsert.
  - Added a cross-surface parity harness.

- c229a35: CLI and MCP operations now run through explicit, transport-neutral contexts while each transport keeps ownership of its own lifecycle. This makes one-shot CLI execution and persistent MCP sessions predictable without changing MCP tool behavior.

  - Add public operation runtime, capability-port, and lifecycle types to `kibi-cli`.
  - Add separate CLI and MCP runtime adapters with write-only MCP stamp refresh.
  - Route MCP registrations through runtime-backed operation specs while preserving timeout, diagnostics, and in-flight request handling.

- 212fe1c: CLI users can now validate and apply one MCP-shaped upsert payload through `validate-upsert --input` and `upsert --input`, including stdin input. Both transports now enforce the same relationship, contradiction, strict-fact, audit, symbol-granularity, durability, and rollback behavior.

  - Move validated upsert execution behind shared Prolog, filesystem, save, and symbol-refresh ports.
  - Keep MCP handlers as thin compatibility adapters and verify CLI/MCP graph-state parity.
  - Ensure a failed relationship prevents save and leaves no partial entity or edge state.

- 6c132ee: Operators now get the same query, search, and status results whether they use familiar CLI flags, JSON input, or MCP. Existing table output, discovery flags, ranking, pagination, relationship display, and status freshness behavior remain available while the execution paths can no longer drift independently.

  - Move query, search, and status business logic into shared `kibi-cli` operation executors.
  - Replace MCP discovery implementations with thin shared-executor adapters.
  - Route human CLI commands and JSON protocol input through runtime-backed shared operations.

### Patch Changes

- 212fe1c: CLI and MCP checks now run the same validation executor, so both interfaces report the same violations for equivalent inputs. The CLI retains its staged workflow, fix suggestions, path overrides, dry-run behavior, and human-readable output while JSON input gains explicit parity coverage for impact diagnostics.

  - Route non-staged CLI validation and MCP `kb_check` through the shared check executor.
  - Preserve CLI advisory-quality and exit-code semantics in its adapter.
  - Add executable CLI/MCP check parity and JSON impact-option coverage.

- 8c3a2e9: CLI and MCP operation changes now have an executable semantic parity safety net. Contributors get immediate failures when an operation is missing, duplicated, or returns transport-specific business data.

  - Add isolated seeded workspace fixtures for all 18 catalog operations.
  - Compare CLI JSON and in-memory MCP results after narrowly scoped volatile-field normalization.
  - Enforce exact catalog-to-parity-case registry completeness.

- cafa25f: Agents can now select Kibi by available capability instead of stopping at MCP-specific guidance. The bundled skills prefer approved MCP tools, fall back safely to a project-local non-installing CLI runner, and provide executable JSON recipes plus an exact 18-operation access catalog.

  - Document every shared MCP operation's dedicated CLI route, input mode, effects, Prolog requirement, mutability, and telemetry handling.
  - Regenerate Cursor and Codex skill mirrors from the canonical capability-based source.

- 0a8a5d3: CLI and MCP users now receive real requirement-modeling and predicate-suggestion plans through the same shared operation executors. Prolog-backed status and reports work reliably again, nested skill commands accept JSON input, and compatibility errors no longer block parity verification.

  - Move modeling execution into `kibi-cli` and keep MCP handlers as thin adapters.
  - Split modeling internals into reviewable modules and use the operation workspace context for migration checks.
  - Restore compatible Prolog query, validation, deletion, and error behavior.
  - Align the MCP dependency range with the released CLI version and remove silent OpenCode catches.

- 212fe1c: Remote SPARQL SELECT queries now produce the same decoded rows through the CLI JSON route and MCP tool. Network access remains opt-in and HTTP(S)-only, while caller-provided timeouts retain their existing whole-second behavior.

  - Share endpoint, query, timeout, request, and result-decoding logic through the CLI operation executor.
  - Route CLI and MCP adapters through an explicit network port and verify parity against a local HTTP fixture.

- 6c132ee: Skill discovery now returns the same bundled metadata, content hashes, and declared resources through CLI JSON routes and MCP tools. This makes scripted CLI usage consistent with agent-facing skill loading while preserving the existing human-oriented `kibi skills` commands.

  - Share bundled skill list, load, and resource-read executors between CLI and MCP.
  - Exercise all three skill operations through the executable CLI/MCP parity harness.

- efa3c7e: Autopilot bootstrap synthesis now returns the same deterministic candidates, payoff guidance, and exact review-only apply plans through CLI JSON and MCP. Cold-start analysis no longer launches Prolog unnecessarily, making scripted bootstrap previews faster while preserving confidence and candidate safety bounds.

  - Share port-backed autopilot discovery, candidate construction, and result generation in `kibi-cli`.
  - Route `autopilot-generate --input` and `kb_autopilot_generate` through the same executor and parity harness.

## 0.14.2

### Patch Changes

- The bundled Kibi usage skill now explains the supported release workflow and correctly distinguishes MCP-first agent operations from CLI-only maintenance workflows. This keeps release guidance aligned with the repository’s develop-to-master process and prevents agents from treating direct `.kb` access as acceptable.

  - Bump the bundled `kibi-usage` skill metadata to 1.0.1.
  - Document changeset versioning, plugin manifest synchronization, and master-branch publishing.

## 0.14.1

### Patch Changes

- 6830005: Formatting-only source diffs no longer trigger Kibi impact review warnings. Agents and developers can now run formatter fixes without receiving semantic-review prompts for unchanged behavior, while actual copy or behavior edits still surface impact diagnostics.

  - Filter formatter-only changed-file impact hunks before extracting semantic-review symbols.
  - Preserve review diagnostics for meaningful text changes inside string and template literals.
  - Add regression coverage for whitespace-only and trailing-comma formatter diffs.

- c7126dd: CLI sync extraction tests no longer leak mocked extractors into later impact-analysis tests. This makes the unit coverage workflow deterministic in CI and prevents unrelated impact manifest checks from failing after sync extraction error-path tests run first.

  - Add an explicit extraction dependency seam for `processExtractions` while preserving the existing default CLI behavior.
  - Route sync extraction tests through injected dependencies instead of Bun module-level mocks.
  - Verify the polluted test ordering that previously failed in CI now passes.

- da9da64: `kibi check --staged` no longer treats ordinary README markdown without YAML frontmatter as a Kibi entity just because it lives under a typed documentation directory. Documentation-only README edits can now pass staged validation without requiring test-entity frontmatter.

  - Skip Markdown entity extraction for staged `.md` files that do not contain YAML frontmatter.
  - Add a staged-check regression for README files under `documentation/tests/`.

## 0.14.0

### Minor Changes

- f1db710: Coverage reports now explain how deep each requirement's test evidence goes without changing existing covered/uncovered semantics. CLI users and MCP clients can distinguish direct passing e2e evidence, scenario-backed e2e evidence, unit-only evidence, nonpassing test evidence, scenario-only coverage, and no evidence at all. Typed test verification fields are honored before legacy e2e tag/path heuristics, so modern test metadata produces more reliable coverage labels.

  Technical summary:

  - Add additive `coverageDepth` / `coverage_depth` fields and coverage evidence lists to requirement coverage rows.
  - Classify coverage depth from direct requirement tests, scenario tests, test statuses, and typed `verification_scope` values.
  - Surface coverage depth in CLI table output and MCP structured coverage results while preserving existing summary and `coverageStatus` fields.
  - Allow typed `verification_scope` and `verification_perspective` test fields through CLI/MCP entity schemas and MCP upsert serialization.

- f1db710: OpenCode background checks now surface advisory Kibi quality diagnostics without turning a clean check into an operational plugin failure. Users get concise structured maintenance logs for review-only findings while hard `kibi check` violations keep the existing failure behavior and exit status. The CLI check command also exposes a JSON format so background integrations can consume the same structured diagnostics reliably.

  Technical summary:

  - Add `kibi check --format json` output with `structuredContent.violations`, `count`, `diagnostics`, and `qualityDiagnostics`.
  - Run OpenCode targeted background checks with JSON output and parse non-blocking `qualityDiagnostics` on successful checks.
  - Log advisory diagnostic summaries through structured warning logs, preserving terminal silence and existing hard check failure routing.

- f1db710: Kibi check outputs now have a stable advisory diagnostics lane for auditability review signals. Operators and MCP clients can receive `qualityDiagnostics` alongside hard `violations` without advisory-only findings changing pass/fail counts or exit behavior. Existing staged impact failures, including symbol granularity violations, remain blocking. Source impact analysis now also highlights overly broad symbols, indistinguishable symbol coordinates, and mixed-purpose component/class ownership as review-only guidance.

  Technical summary:

  - Add the public `QualityDiagnostic` type with `error`, `warning`, `review`, and `info` severities plus explicit `blocking` semantics.
  - Preserve existing `violations`, `diagnostics`, and `impactDiagnostics` fields while adding MCP structured `qualityDiagnostics` output support.
  - Preserve explicitly filtered MCP `kb_check` rule semantics so advisory full-KB quality scans only run for unfiltered checks or requested impact diagnostics.
  - Clarify Codex and Cursor bundled agent guidance so targeted checks use explicit rules and final checks omit rules for full-KB `qualityDiagnostics` review.
  - Add quality diagnostic text formatting and shared blocking helpers that treat `blocking: true` or `severity: "error"` as hard failures.
  - Add non-blocking `multi_requirement_symbol_review`, `duplicate_symbol_coordinate_review`, and `component_mixed_purpose_review` impact diagnostics.

### Patch Changes

- 48b65b9: Kibi quality checks now let teams resolve noisy advisory warnings with explicit, reviewable KB metadata instead of creating fake e2e evidence. Passing integration-level regression evidence can satisfy coverage-depth quality checks, and requirements tagged as intentional umbrella or epic requirements no longer keep emitting broad-fanout diagnostics.

  Technical summary:

  - Preserve test `verification_scope` and `verification_perspective` fields during CLI sync persistence.
  - Treat passing integration coverage as sufficient quality evidence for coverage-depth diagnostics.
  - Suppress broad-fanout quality diagnostics for requirements explicitly tagged `umbrella` or `epic`.

- 439cb2e: Kibi now makes semantic Prolog adoption easier to measure and debug. Diagnostic usage logs expose semantic advisor readiness, predicate suggestion outcomes, upsert semantic readiness, and contradiction failures as structured fields instead of generic success/error text. Operators can opt into predicate-link audits and get Prolog validation query-plan safety checked by default, with normal `.kb/config.json` overrides available when needed.

  Technical summary:

  - Add `predicate-verifiability` as a default-off KB check rule that flags `requires_predicate` targets whose `fact_kind` is not `predicate`.
  - Add `query-plan-safety` as a default-enabled KB check rule that flags Prolog validation clauses that place negation before later generator calls.
  - Enrich MCP diagnostic usage fields for `kb_semantic_advisor`, `kb_suggest_predicates`, and `kb_upsert`.
  - Classify requirement contradiction errors as `semantic_contradiction` validation failures with actionable hints.
  - Preserve semantic context in CLI sync/rebuild validation errors instead of reducing Prolog failures to `Query returned false`.
  - Extend prose coverage with real Align annotation time-key and merge-policy requirements.
  - Refresh changed Prolog check modules through the MCP aggregated check loader.

- cb8d977: Kibi sync no longer treats README files inside configured entity directories as entities. This prevents human documentation such as fixture READMEs from producing missing-frontmatter warnings or failed background syncs while preserving normal entity markdown discovery.

  - Ignore `**/README.md` during CLI sync markdown discovery.
  - Ignore documentation `README.md` files during status freshness checks so synced workspaces remain fresh.
  - Add regression coverage for README exclusion in sync discovery.

- 224f18b: Agents and hook users now get clearer guidance when behavior-changing staged files are missing Kibi impact evidence. The staged check points to the staged-impact workflow, explains that MCP KB writes do not automatically stage tracked markdown or manifest evidence, and tells users which files to stage before rerunning the hook. MCP validation also catches invalid relationship shortcuts earlier, and bundled skill loading makes follow-up resources easier to discover.

  Technical summary:

  - Add Prolog-backed relationship tuple preflight to `kb_validate_upsert` when invoked through MCP.
  - Improve invalid relationship and relationship-source mismatch guidance in MCP upsert flows.
  - Include declared skill resources in `kb_skills_load` visible text and missing-resource errors.
  - Update staged impact diagnostic docs and bundled Kibi usage resources for requirement-mediated behavior-fix evidence.

- Updated dependencies [f1db710]
- Updated dependencies [439cb2e]
- Updated dependencies [cb8d977]
  - kibi-core@0.7.0

## 0.13.1

### Patch Changes

- Symbol metadata writes now work consistently through MCP and the underlying Prolog schema. Agents can create source-linked symbol entities with `symbol_role` and `granularity_reason` metadata without hitting a transaction failure after JSON validation succeeds. This keeps behavioral-anchor traceability usable from the MCP-first workflow.

  Technical summary:

  - Add `symbol_role` and `granularity_reason` to the Prolog entity schema copies shipped by `kibi-core` and `kibi-cli`.
  - Serialize `granularity_reason` as a Prolog atom in `kb_upsert` transactions.
  - Add Prolog and MCP regression coverage for symbol metadata fields.

- Updated dependencies
  - kibi-core@0.6.5

## 0.13.0

### Minor Changes

- Kibi now gives agents source-impact feedback while they are still editing, instead of waiting for the commit hook to be the first signal. Meaningful source edits can be checked through MCP with changed-file impact diagnostics, so agents see coarse symbol ownership, stale symbol evidence, and semantic-review prompts while the source context is fresh. OpenCode, Cursor, and Codex adapters now steer agents toward that MCP-first workflow and keep CLI/hooks as the later safety net.

  Technical summary:

  - Add reusable CLI changed-file impact diagnostics and export them for MCP consumption.
  - Extend MCP `kb_check` with source-file impact options and structured impact output.
  - Update OpenCode, Cursor, and Codex guidance/hooks to request impact-enabled `kb_check` after source edits.
  - Document semantic-review diagnostics and class-member granularity expectations.

## 0.12.8

### Patch Changes

- Kibi now gives agents clearer guidance for the diagnostics flow, so the release notes should reflect that the bundled usage text and MCP logging story were tightened together.

  This update also keeps the package mirrors aligned where applicable, which helps downstream plugin consumers stay in sync with the canonical guidance.

  - Hardened bundled skill guidance for kibi usage.
  - Improved MCP diagnostic logging shape and validation hints.
  - Synced packaged skill copies where they are shipped with the release.

## 0.12.7

### Patch Changes

- Added CLI-level regression tests proving that typed markdown links (`verified_by`, `specified_by`, `validates`) imported through `kibi sync` are visible to `kibi check --rules symbol-coverage` with the correct scenario-aware semantics.

  - `kibi-cli`: added cross-boundary typed-link symbol-coverage regression tests for complete scenario→test chains and scenario-blocked direct req→test paths.

- Updated dependencies [c810f5f]
  - kibi-core@0.6.2

## 0.12.6

### Patch Changes

- 5fdcd46: MCP now re-validates the attached branch KB whenever the same-branch snapshot is externally rebuilt, so running `kibi sync --rebuild` no longer leaves a long-running server stuck on stale data. If refresh cannot be reconciled, requests fail fast with explicit `KbRefreshError` behavior instead of silently continuing from a stale attachment.

  - Added formal docs for same-branch KB freshness detection in MCP, including stat-based stamps and fail-closed retry semantics.
  - Clarified CLI behavior so `--rebuild` is documented as triggering MCP auto-refresh on unchanged branch attachments where applicable.
  - Added KB entities/ADR/requirements evidence and symbol traceability updates for the MCP session refresh path.

- 37ce479: Existing KBs now get an explicit semantic-advisor backfill marker when they migrate to the latest schema. This helps maintainers and agents distinguish deterministic schema upgrades from the separate, reviewable semantic modeling work that may still be needed.

  - Bump the KB schema version and add `semanticAdvisorBackfill: "pending"` during migration.
  - Record the marker in migration audit metadata without creating semantic facts automatically.
  - Update the config schema so migrated configs validate with the new marker.

## 0.12.5

### Patch Changes

- 909be41: Agents now get clearer guidance when modeling Kibi facts and predicates. Instead of opaque validation errors that encourage falling back to prose, common mistakes now point to exact snake_case fields and typed value payloads.

  The documentation also gives agents a compact path for choosing between requirements, strict facts, predicate facts, observations, and metadata. This makes semantic KB modeling easier to apply consistently across product projects.

  - Improve `kb_upsert` diagnostics for camelCase fact fields and incomplete strict/predicate facts.
  - Add modeling-helper warnings for low-confidence requirement downgrades and ontology-gap predicate suggestions.
  - Add modeling cheatsheet, MCP error reference, and product KB improvement prompt.

- c724c8b: Kibi now treats symbol granularity as a behavioral traceability decision instead of assuming every exported declaration is an equally precise target. Agents can model behavior hidden inside factory or composition expressions with manual behavioral anchors, while interfaces, type aliases, and enums no longer block valid coarse behavioral links by themselves. This makes traceability stricter where real behavior symbols exist and more flexible when extractors only see type-shape declarations.

  Technical summary:

  - Added `symbol_role` metadata for symbol entities.
  - Added shared role-aware symbol granularity helpers.
  - Updated MCP upsert and CLI staged checks to reject coarse links only when narrower behavioral symbols are available.
  - Documented manual behavioral anchors for extractor-miss cases.

- Updated dependencies [7f4d51e]
  - kibi-core@0.6.1

## 0.12.4

### Patch Changes

- 4d13def: Agents can now link requirements directly to class methods when that is the narrowest meaningful code symbol. Method-level symbol upserts use `ClassName.methodName` identities, with bare method names accepted only when they are unique in the file. This reduces unnecessary `extractor-miss` workarounds and keeps traceability closer to the behavior being changed.

  - Add qualified `method` symbols to parser-backed symbol analysis and staged symbol extraction for exported classes.
  - Include exported class methods in MCP symbol granularity validation so method-level `kb_upsert` calls are accepted without allowing duplicate bare-name collisions.
  - Update symbol granularity documentation to name class methods as narrow traceability targets.

## 0.12.3

### Patch Changes

- Timed-out MCP tool calls now recover cleanly instead of leaving stale Prolog workers behind. Follow-up Kibi tool calls should be able to continue with a fresh worker after a timeout, reducing the need for users to manually find and terminate wedged `swipl` processes.

  Technical summary:

  - Add MCP tool execution timeout handling with owned Prolog worker reset.
  - Classify timeout and Prolog worker reset diagnostics in usage metrics.
  - Harden interactive Prolog timeout termination and repeated termination cleanup.

## 0.12.2

### Patch Changes

- 8b73781: Bootstrap guidance is now easier for agents to apply correctly in OpenCode. The `/init-kibi` workflow and bundled Kibi usage skill explain that OpenCode can expose canonical `kb_*` MCP tools with a `kibi_` server prefix, and autopilot bootstrap output now includes an explicit `applyPlan` so agents can preview exact writes before asking for approval.

  - `kibi-mcp`: expose aggregate `structuredContent.applyPlan`/top-level `applyPlan` from `kb_autopilot_generate`, preserve `/init-kibi` as a post-hoc bootstrap prompt, mention it in visible output, and advertise typed fact fields in the `kb_upsert` input schema.
  - `kibi-opencode`: document the OpenCode `kibi_kb_*` tool-name convention in `/init-kibi` alias guidance and README.
  - `kibi-cli`: update the bundled `kibi-usage` skill with host-prefix guidance for OpenCode users.

- 35f3944: Kibi now records MCP tool failures with structured error categories and stages, so operators can tell persistence conflicts, Prolog runtime failures, lifecycle failures, and validation errors apart without manually inspecting raw logs. Usage metrics now surface those categories across all tools instead of only grouping `kb_upsert` failures, making incidents like stale snapshots or Prolog startup errors easier to diagnose.

  - `kibi-mcp`: add diagnostic error classification fields (`error_name`, `error_category`, `error_stage`, `error_summary`) to handler error rows in `.kb/usage.log`.
  - `kibi-cli`: extend `usage-metrics` reports with cross-tool error category, stage, and tool breakdowns while preserving existing upsert error summaries.

## 0.12.1

### Patch Changes

- Kibi now blocks coarse symbol traceability when narrower source symbols are available. Agents that try to attach ownership, coverage, or executable identity to a module/file-level symbol must either link the specific function/class/type symbol instead or provide an explicit coarse-link reason, making lazy file-level ontology entries much harder to create accidentally. Existing repositories should run `kibi migrate --dry-run` and then `kibi migrate --yes`; the migration marks old coarse links as `legacy-link` so users can upgrade without breaking immediately on historical ontology data.

  - Add staged `symbol_granularity_violation` enforcement for coarse symbol manifest relationships when changed source files expose granular symbols.
  - Add MCP `kb_upsert` validation that rejects unjustified coarse symbol traceability before writing to the KB.
  - Bump the KB schema version and teach `kibi migrate` to mark existing coarse symbol links with `granularity_reason: legacy-link`.
  - Add `granularity_reason` support for accepted coarse-link exceptions: `config-artifact`, `module-level-behavior`, `extractor-miss`, and `legacy-link`.

## 0.12.0

### Minor Changes

- Kibi can now start representing project-local ontology claims as structured predicate facts instead of prose-only notes. This is the first compatibility slice toward richer domain modeling: teams can define predicate schemas and store ground predicate claims while existing strict property facts continue to work unchanged.

  Add predicate ontology fact fields to the CLI entity schema, public schema export, TypeScript fact types, and Prolog schema validation. The new supported fact lanes are `predicate_schema` and `predicate`, with fields for predicate names, namespaces, arity, arguments, aliases, examples, and predicate polarity.

### Patch Changes

- Updated dependencies
  - kibi-core@0.6.0

## 0.11.3

### Patch Changes

- Kibi CLI users no longer get configuration or init output for the removed briefs feature. Existing project setup stays focused on the core knowledge base files and hooks, with no new `.kb/briefs/` ignore entry created by `kibi init`. Stale brief-specific config should now be treated as removed product surface rather than as a supported no-op.

  Technical summary:

  - Remove CLI brief config support and the public `brief-config` export from built artifacts.
  - Regenerate CLI dist after removing brief schema/init behavior.

## 0.11.2

### Patch Changes

- Kibi now recovers more cleanly when an interactive Prolog query times out. Instead of leaving the stale Prolog child running after a timeout, Kibi terminates it so the next MCP operation can restart from a clean process and surface a clearer timeout failure path.

  - Terminate the interactive `PrologProcess` child when a query timeout fires.
  - Add regression coverage proving timed-out interactive queries do not leave a stuck child running.

- Kibi's bundled usage skill now gives agents clearer guidance for durable traceability and contradiction-safe facts. Agents are steered away from legacy `// implements REQ-xxx` comments and toward symbol entities linked with `implements`, and the skill now includes concrete role and permission examples that make incoherent requirements easier to model and catch.

  - Update the `kibi-usage` skill with symbol-first traceability guidance.
  - Add granular strict fact examples for role-set and billing-permission contradictions.
  - Extend skill content tests to lock in the new guidance and examples.

## 0.11.1

### Patch Changes

- 4aa9830: Kibi now has a reusable markdown skill subsystem across CLI, MCP, and OpenCode. The CLI exposes bundled skills with manifest validation and safe resource loading. The MCP server provides progressive-disclosure tools (`kb_skills_list`, `kb_skills_load`, `kb_skills_read`) for agents to discover and read skills without starting Prolog or touching the KB. OpenCode routes its guidance through the `kibi-usage` skill, giving agents a single source of truth for Kibi usage patterns. An official `kibi-usage` skill bundle ships with all three packages, covering fact lanes, relationship directions, and canonical workflows.

  - feat(cli): add markdown skill loader with manifest types, validation errors, secure path/resource validation, and size limits
  - feat(cli): expose `kibi-cli/skills` public export with `skills list`, `skills load`, `skills read`, `skills validate`
  - feat(mcp): add `kb_skills_list`, `kb_skills_load`, `kb_skills_read` tool definitions, handlers, runtime wiring, and docs rendering
  - feat(mcp): resolve bundled skills from packaged source assets when running from compiled CLI output
  - feat(opencode): route agent guidance through `kibi-usage` skill, add `kb_skills_load` to tool listings
  - docs: add official `kibi-usage` skill with fact lanes, relationship directions, and workflow guidance
  - test: add mock-free MCP handler tests against real bundled `kibi-usage` skill, including invalid skill and resource errors
  - test: add CLI skill unit coverage for valid bundles, validation errors, traversal/symlink escapes, oversize limits

## 0.11.0

### Minor Changes

- f8a3a88: This update introduces a split symbol coordinate workflow that separates logical symbol definitions from their physical source locations. Symbol coordinates are now managed in `documentation/symbol-coordinates.yaml`, which improves git diff readability and reduces merge conflicts when only line numbers change. The `kibi sync` command now supports a `--refresh-symbol-coordinates` flag to explicitly update these locations.

  - **kibi-cli**: Added `--refresh-symbol-coordinates` flag to `kibi sync` and updated pre-commit hooks to enforce coordinate staging.
  - **kibi-mcp**: Updated symbol resolution logic to read from the new split coordinate manifest.
  - **kibi-opencode**: Updated background sync behavior and documentation to support the split manifest workflow.
  - **kibi-vscode**: Updated the symbol resolver to consume the split `symbol-coordinates.yaml` file for navigation and hover features.

- d783b67: Kibi now includes a `usage-metrics` command so operators can inspect how the knowledge base is actually being used and where quality signals are degrading. This makes it easier to spot missing telemetry, frequent zero-result lookups, and recurring validation trouble before those issues turn into blind spots for people or agents. The command reads `.kb/usage.log` and reports the main adoption and remediation indicators in either human-readable table output or JSON.

  - **kibi-cli**: Added `kibi usage-metrics` with `--format json|table` and `--limit <n>` support for usage-log quality reporting.

## 0.10.1

### Patch Changes

- 0d998ad: **Behavior-changing source edits now require Kibi impact evidence before commit.**

  The `kibi check --staged` command now enforces a hard gate: behavior-changing source edits must be accompanied by staged Kibi impact evidence (KB entity documentation or refreshed `documentation/symbols.yaml`). This prevents commits that change behavior without updating the knowledge base.

  **New diagnostics:**

  - `kibi_impact_evidence_missing` — emitted when behavior source edits lack staged KB evidence
  - `symbols_manifest_stale` — emitted when source edits alter symbol coordinates but the staged manifest is missing or stale

  **What this means for users:**

  - If you change behavior-bearing source code, stage relevant KB entity markdown or refresh `documentation/symbols.yaml`
  - Test-only edits (`tests/`, `*.test.*`) and docs-only edits (`.md`) are exempt
  - The no-impact override is available only for classifier false positives, not genuine behavior changes

  **OpenCode guidance updated** to remind agents that Kibi impact evidence is required before completion/commit.

  **Technical changes:**

  - Added `packages/cli/src/traceability/evidence-model.ts` — typed Kibi impact evidence interfaces
  - Added `packages/cli/src/traceability/staged-diagnostics.ts` — `collectStagedKibiDiagnostics()` with stable diagnostic IDs
  - Added `packages/cli/src/traceability/staged-impact-contract.ts` — behavior classification and evidence parsing
  - Added `packages/cli/src/traceability/staged-symbols-manifest.ts` — stale manifest detection
  - Extended `packages/cli/src/commands/check.ts` staged path to evaluate impact evidence
  - Updated pre-commit hook comments and contributor docs

## 0.10.0

### Minor Changes

- 5f715a5: Kibi now automatically respects your repository's `.gitignore` rules during knowledge base discovery. Files ignored by Git — as well as tool directories like `.sisyphus` and `.opencode` — are no longer treated as domain knowledge sources. This prevents draft and build artifacts from polluting your knowledge base.

  - Added documentation describing the repository ignore policy and hard-denied directories.
  - Clarified that Kibi honors repository `.gitignore`, nested `.gitignore`, and `.git/info/exclude` during `kb_autopilot_generate`, briefing generation, and discovery.
  - Documented that global Git excludes are not honored in v1, and that automatic cleanup of previously-discovered KB entities is out of scope for this release.
  - Integrated a note about ignore-aware file-event skipping in the OpenCode plugin README.

## 0.9.0

### Minor Changes

- Kibi now records a schema version in new `.kb/config.json` files and can report migration status without rewriting existing configs during normal loads. Older repositories that never stored `schemaVersion` still load cleanly, but tooling can now detect that they need migration. The CLI also exposes shared schema-version helpers so other packages can use the same version and warning logic.

  - add shared KB schema-version constants and migration status utilities for CLI consumers
  - write `schemaVersion` into init-generated configs while preserving readable legacy versionless configs on load

- The CLI can now turn extracted semantic claims into deterministic strict-model write-sets for contradiction-safe requirement authoring. Re-running the same claim produces the same requirement and fact IDs, while low-confidence claims are downgraded to review-only observations so they stay out of contradiction blocking.

  - add strict modeling utilities for stable ID generation, subject/property normalization, and strict vs observation write-set assembly
  - add CLI tests covering deterministic IDs, exact strict-lane entity/relationship counts, relationship dedupe, and low-confidence downgrade behavior

### Patch Changes

- Kibi now supports fully automated requirement modeling and schema migrations, allowing repositories to stay up-to-date with the latest contradiction-safe modeling standards without manual intervention. The new system enforces strict readiness levels for requirement/fact pairings and automatically downgrades low-confidence claims to non-blocking observations to ensure high precision in conflict detection.

  - add `kibi migrate` command for automated KB schema upgrades
  - implement strict readiness checks and confidence-based modeling lanes
  - update MCP guidance and CLI documentation for automated contradiction workflows
  - extend inference rules to support v1 contradiction semantics (exact-value, range, polarity)

- Updated dependencies
  - kibi-core@0.5.3

## 0.8.0

### Minor Changes

- 4746f3f: Briefs no longer surface internal task-tracking artifacts (such as `.sisyphus/boulder.json`) as if they were meaningful project knowledge. Notifications are now specific-or-silent: a toast only appears when the brief can say what changed and why it matters. Previously, any `.sisyphus/` file edit could trigger a brief with generic content and produce a vague "a brief is available" notification regardless of whether it contained real domain context.

  - `kibi-cli`: adds `isOperationalArtifactPath(pathLike)` helper, exported as `kibi-cli/operational-artifacts`, matching `.sisyphus/**` paths as operational task-tracking artifacts
  - `kibi-mcp`: filters operational artifact sources, entities, and citations before brief content is assembled so `.sisyphus/**` changes never appear in brief entities, citations, prompt blocks, or TLDRs
  - `kibi-opencode`: suppresses brief eligibility for operational-only source changes; adds specificity gate to toast delivery so generic/operational envelopes do not trigger notifications
  - `kibi-vscode`: applies same specific-or-silent semantics to VS Code brief watcher so generic/operational envelopes do not call `showInformationMessage`

### Patch Changes

- 7880675: Kibi now makes symbol manifest tracking harder to forget. New projects initialized with `kibi init` get a default `documentation/symbols.yaml`, and the managed pre-commit hook blocks commits when that manifest has unstaged changes so refreshed coordinates are committed with the related work.

  - Create the default symbol manifest during `kibi init` when it is missing.
  - Add a pre-commit guard that requires dirty `documentation/symbols.yaml` changes to be staged before `kibi check --staged` runs.

- 2a00e15: Kibi discovery is now less noisy for broad agent queries. When agents send multi-intent natural-language searches, targeted domain-specific entities now rank above unrelated generic results. No-signal queries (containing only common stop words) return an empty result instead of arbitrary token-coverage matches. OpenCode agents are now guided to decompose broad queries into focused probes and follow up with exact `kb_query` lookups.

  - `kibi-cli`: Add stop-word filtering, hyphen normalization, plural normalization, and minimum-score threshold to `search-ranking.ts`; add synthetic regression corpus tests.
  - `kibi-mcp`: Add wrapper-level regression tests asserting improved ranking is preserved end-to-end.
  - `kibi-opencode`: Update injected agent guidance to instruct query decomposition with concrete examples.

- 8d8ebf6: Sync operations are now more resilient when multiple file edits trigger overlapping syncs. Previously, concurrent `kibi sync` runs for the same branch could collide on a shared staging directory and fail with a stale snapshot permission error. Each sync now uses an isolated staging directory, eliminating this race while preserving protection against genuine external KB mutations.

  - Replace fixed `.kb/branches/<branch>.staging` with unique per-run staging directories using process ID and timestamp.
  - Add automatic cleanup of abandoned staging directories left by crashed or terminated sync processes.
  - Preserve atomic publish semantics and true stale-snapshot detection for external KB modifications.
  - Fix invalid `specifies` relationship type in TEST-015 documentation that caused sync relationship warnings.

## 0.7.0

### Minor Changes

- b9ef9a2: Add shared brief configuration defaults for automatic TUI delivery across Kibi clients. The CLI now reads and exposes brief config from `.kb/config.json` with sensible boolean defaults (all enabled), the OpenCode plugin delivers idle brief summaries via toast notification with automatic prompt append and auto-submit, and the VS Code extension gates notifications by the shared brief policy. This provides a unified, zero-config experience for teams using multiple Kibi clients.
- 736f675: Add the interactive cold-start bootstrap flow and its regression coverage so the public MCP surface, OpenCode prompt wiring, and extractor exports stay in sync.

### Patch Changes

- 7ed9f0c: Ensure `kibi init` writes `.kb/briefs/` to `.gitignore` so generated brief artifacts are ignored by default.
- a1a198b: Add configurable idle-brief delay and retention policies in shared `.kb/config.json` (`briefs.tui.idleDelayMs` and `briefs.retention.*`). OpenCode now applies retention garbage collection after brief writes and prunes stale `.tui-seen` hashes for briefs that were deleted by retention.
- Updated dependencies [699a482]
  - kibi-core@0.5.2

## 0.6.2

### Patch Changes

- 2066a48: Add init-kibi autopilot generation workflow

  - New MCP tool `kb_autopilot_generate` for read-only candidate generation
  - Activation-state classification and source discovery helpers
  - Deterministic candidate generation for Kibi docs and symbol manifests
  - Conservative generic markdown heuristics for ADR/REQ/FACT candidates
  - Dedupe logic and payoff summary reporting
  - Aligned OpenCode prompt guidance with activation workflow

## 0.6.1

### Patch Changes

- 0ec1cb1: Realign release metadata with the traceability schema update so all publishable packages carry the same patch release notes.
- 4a74281: Enable `noUncheckedIndexedAccess` incrementally across the source packages and add explicit guards where CLI parsing and traceability helpers read indexed values.
- 0ec1cb1: fix(cli): merge working-tree manifests with staged overrides in buildManifestLookup

  - `kibi check --staged` now pre-populates `manifestLookup` from the working-tree
    `config.paths.symbols` manifest before processing staged-manifest overrides.
    This prevents code-only staged changes (where `symbols.yaml` is not staged) from
    falling back to hash-generated IDs and incorrectly failing traceability even when
    the symbol is already linked in the KB.
  - Remove duplicate `toPrologString` in `temp-kb.ts` and reuse the shared
    `toPrologString` from `../prolog/codec` to keep Prolog serialisation consistent.

- 0ec1cb1: fix(opencode): respect absolute configured KB doc roots in bootstrap detection

  - Treat absolute `paths.*` entries in `.kb/config.json` as authoritative when checking whether a workspace is bootstrapped.
  - Add a regression test covering healthy absolute custom doc roots while preserving the existing missing-target bootstrap warning.

- 0ec1cb1: fix(cli): restore prolog codec exports

  - Regenerate the checked-in `src/prolog/codec.js` artifact so `toPrologString` and `toPrologAtom` are available as named exports at runtime, fixing CLI traceability test imports.

- 0ec1cb1: fix(cli): eliminate 2-second false wait during PrologProcess startup under Bun

  - `PrologProcess.waitForReady()` previously looped for up to 2000ms waiting for any stdout/stderr output from `swipl`.
  - Under Bun v1.3.6, spawned `swipl` does not emit output until stdin is written, causing every `start()` to waste ~2 seconds.
  - The fix sends `true.\n` to stdin immediately after spawn and waits for the `true.` response, reducing startup detection time from ~2000ms to ~50ms.
  - This resolves the `temp-kb.test.ts` timeout under bare `bun test` and significantly speeds up all CLI tests that spawn Prolog processes.

- 3a11e57: Fix `kibi status` JSON serialization before first sync and add `kibi-mcp --help` output
- 0ec1cb1: Accept `sourceFile` as an optional entity property during `kb_upsert`.

  - Allows symbol (and other) entities to include `sourceFile` in `properties` without triggering JSON schema validation errors.
  - Adds `sourceFile` to the JSON entity schema and the Prolog entity schema.
  - Adds regression test for symbol upsert with `sourceFile`.

  Fixes #114.

- de5dbaf: Enable `exactOptionalPropertyTypes` across source packages and tighten optional property handling in exported type surfaces.
- Updated dependencies [0ec1cb1]
- Updated dependencies [3a11e57]
- Updated dependencies [0ec1cb1]
  - kibi-core@0.5.1

## 0.6.0

### Minor Changes

- Prepare fresh minor release line for schema and traceability alignment

  This release includes the completed traceability schema realignment work,
  ensuring proper symbol-to-requirement linking, staged traceability checks,
  and the updated release automation model.

### Patch Changes

- Updated dependencies
  - kibi-core@0.5.0

## 0.5.1

### Patch Changes

- 6cdf9f5: Realign release metadata with the traceability schema update so all publishable packages carry the same patch release notes.
- efc7fd7: fix(cli): merge working-tree manifests with staged overrides in buildManifestLookup

  - `kibi check --staged` now pre-populates `manifestLookup` from the working-tree
    `config.paths.symbols` manifest before processing staged-manifest overrides.
    This prevents code-only staged changes (where `symbols.yaml` is not staged) from
    falling back to hash-generated IDs and incorrectly failing traceability even when
    the symbol is already linked in the KB.
  - Remove duplicate `toPrologString` in `temp-kb.ts` and reuse the shared
    `toPrologString` from `../prolog/codec` to keep Prolog serialisation consistent.

- d344f57: fix(opencode): respect absolute configured KB doc roots in bootstrap detection

  - Treat absolute `paths.*` entries in `.kb/config.json` as authoritative when checking whether a workspace is bootstrapped.
  - Add a regression test covering healthy absolute custom doc roots while preserving the existing missing-target bootstrap warning.

  fix(cli): restore prolog codec exports

  - Regenerate the checked-in `src/prolog/codec.js` artifact so `toPrologString` and `toPrologAtom` are available as named exports at runtime, fixing CLI traceability test imports.

- 2994632: fix(cli): eliminate 2-second false wait during PrologProcess startup under Bun

  - `PrologProcess.waitForReady()` previously looped for up to 2000ms waiting for any stdout/stderr output from `swipl`.
  - Under Bun v1.3.6, spawned `swipl` does not emit output until stdin is written, causing every `start()` to waste ~2 seconds.
  - The fix sends `true.\n` to stdin immediately after spawn and waits for the `true.` response, reducing startup detection time from ~2000ms to ~50ms.
  - This resolves the `temp-kb.test.ts` timeout under bare `bun test` and significantly speeds up all CLI tests that spawn Prolog processes.

- 7111197: Accept `sourceFile` as an optional entity property during `kb_upsert`.

  - Allows symbol (and other) entities to include `sourceFile` in `properties` without triggering JSON schema validation errors.
  - Adds `sourceFile` to the JSON entity schema and the Prolog entity schema.
  - Adds regression test for symbol upsert with `sourceFile`.

  Fixes #114.

- Updated dependencies [6cdf9f5]
- Updated dependencies [7111197]
  - kibi-core@0.4.1

## 0.5.0

### Minor Changes

- 0c2c1e7: feat(traceability): document comment-free test workflow with validation parity

  - Add relationship-first traceability guidance: prefer split semantics with `implements` for production ownership, `covered_by` for production coverage, and `executable_for` plus `verified_by`/`validates` for test identity and verification instead of relying only on inline `// implements REQ-xxx` comments
  - Document staged symbol traceability enforcement with both workflow paths: relationship-based (preferred) and comment-based (optional/backward-compatible)
  - Synchronize guidance across AGENTS.md, CLI reference, and LLM rules with the implemented policy
  - Staged enforcement now supports explicit KB relationships in addition to inline comments
  - Document scope boundary: automatic extraction of framework-specific `test()` or `it()` callbacks is out of scope for staged check

### Patch Changes

- Updated dependencies [0c2c1e7]
  - kibi-core@0.4.0

## 0.4.3

### Patch Changes

- 3388cf3: Add CI-only diagnostic logging for symbol coordinate refresh to help isolate the refreshCoordinatesForSymbolId coverage failure on GitHub Actions.
- 49fcad9: Harden OpenCode smart enforcement with posture-aware guidance, deterministic risk routing, structured observability, and an explicit advisory-vs-hook boundary.

  - `kibi-opencode`: adds repo-posture detection, risky-edit classification, smart-enforcement cache/config, posture-aware prompt injection, effective-mode gating, single-block prompt budget, prompt-visible completion reminders, runtime maintenance overlay, selective event routing, and structured smart-enforcement logs.
  - `kibi-cli`: documents and tests hooks as the hard enforcement boundary while preserving branch/post-merge refresh behavior.
  - `kibi-mcp`: enriches diagnostic usage fields so rollout telemetry remains queryable without changing the public MCP surface.

## 0.4.2

### Patch Changes

- 7309d18: Export `__test__` helpers from `traceability/validate.ts` to enable unit testing of internal Prolog parsing utilities.

## 0.4.1

### Patch Changes

- c8761a9: Add fallback support for unique non-exported top-level functions and class methods during symbol coordinate refresh. Resolves symbols that were previously reported as failed.
- 46baebc: Export resolveKbPlPath from kibi-cli public prolog surface

  Add `resolveKbPlPath` to the public `kibi-cli/prolog` export so that `kibi-mcp`
  can import it without breaking against older `kibi-cli` versions that do not
  expose this symbol.

## 0.4.0

### Minor Changes

- 7bd2adf: Add typed fact schema, semantic contradiction model, and discovery bundle tools.

  - **Typed facts**: New `fact_kind` field (subject, property_value, observation, meta) with schema validation, preserved through CLI/MCP sync and query round-trips.
  - **Discovery bundle**: `kb_search`, `kb_find_gaps`, `kb_coverage`, `kb_graph` tools across MCP and CLI. Richer `kb_check` summaries and improved diagnostic usage logging.
  - **Agent guidance**: Updated to prefer discovery-first workflows (`kb_search` → `kb_query`), MCP-only policy aligned with ADR-016 thin-bridge architecture.
  - **Strict-fact validation**: Append-only requirement supersession and migration guidance for strict fact adoption.

### Patch Changes

- 7bd2adf: Bug fixes and Node.js v24 compatibility.

  - **Node 24**: Replace deprecated `import ... assert` with `import ... with` per TC39 Import Attributes proposal.
  - **Core**: Use `member/2` instead of `memberchk/2` in `relationship_allowed`; make `status_meta_dict` resilient to non-standard KB paths.
  - **CLI**: Fix staged traceability check to resolve symbol IDs from `symbols.yaml` using both `sourceFile` and legacy `source` fields.
  - **MCP**: Replace `escapeQuotes` with `toPrologString` for safe Prolog string encoding.
  - **Persistence**: Remove duplicate `ATOM_FIELDS`, add `value_int` integer guard, use `toPrologString` for safe escaping.
  - **Check**: Replace fragile regex violation parsers with `parseViolationRows` from codec.
  - **Tests**: Isolate workspace test from rogue `/tmp/.git`, add 30s timeout to `beforeAll` hooks to prevent flaky timeouts.

- 7bd2adf: Internal code quality improvements and refactoring.

  - Deduplicate `splitTopLevel` into single canonical function in `codec.ts`.
  - Deduplicate `Violation`, `ChecksConfig`, and rule definitions between CLI and MCP.
  - Extract `safeCleanupProlog` helper to eliminate duplicated teardown patterns.
  - Replace `process.exit()` with return values in CLI command handlers.
  - Remove dead code (`target-resolver.ts`), annotate empty catch blocks, remove unreachable code paths.
  - Add `toPrologString` helper, `parseViolationRows`, export `splitTopLevelGeneral` from codec.
  - Clean narration comments across all packages.

- Updated dependencies [7bd2adf]
- Updated dependencies [7bd2adf]
  - kibi-core@0.3.0

## 0.2.7

### Patch Changes

- bc020dd: Generate unit-test LCOV coverage in CI, upload it to Codecov using the repository's CODECOV_TOKEN secret, and add a README coverage badge alongside the main CI status badge.
- e61aa15: Load SWI-Prolog's `rdf_db` library in interactive CLI sessions so `rdf_transaction/1` mutation queries do not fall into interactive correction prompts and hang MCP requests that rely on the long-lived Prolog process.
- 6e9e15c: Import plain string Markdown frontmatter `links` as generic `relates_to`
  relationships during `kibi sync`, and fix `kibi query --relationships` so it
  returns outgoing relationships reliably. Also fix `kibi-opencode` tarball ESM
  imports and self-contained plugin typings so packed installs can build and load
  the plugin and helper subpath exports in Node.

## 0.2.6

### Patch Changes

- 5188a8f: Fix `kb_upsert` status validation so documented entity-specific lifecycle values like `open`, `passing`, and `accepted` are accepted again. The MCP tool schema now avoids advertising a stale fixed status enum, and the shared entity schema accepts both documented statuses and legacy compatibility values.
- Fix `kibi sync` false dangling-relationship warnings by validating relationship shards after entity IDs are loaded, repair sync cache `seenAt` timestamps so invalid cache entries trigger a safe re-import instead of silently skipping files, and harden KB persistence so read-only query/check flows no longer rewrite live RDF snapshots.
- Updated dependencies [4e05344]
- Updated dependencies
  - kibi-core@0.1.10

## 0.2.5

### Patch Changes

- 0b11a77: Add missing `./prolog/codec` export to package.json

  The MCP package imports `escapeAtom` and `toPrologAtom` from `kibi-cli/prolog/codec`,
  but this subpath was not exported in the package.json. This caused the MCP server
  to crash on startup with `ERR_PACKAGE_PATH_NOT_EXPORTED` when the package was
  installed from npm.

- Updated dependencies [29de3fa]
  - kibi-core@0.1.9

## 0.2.4

### Patch Changes

- ec7f86e: Fix sync command to process relationship shards added after initial sync. The sync command now properly detects and imports relationship shard files (`.kb/relationships/*.yaml`) that are added after the first sync, instead of exiting early with "no changes".

## 0.2.4

### Patch Changes

- Fix sync command to process relationship shards added after initial sync. The sync command now properly detects and imports relationship shard files (`.kb/relationships/*.yaml`) that are added after the first sync, instead of exiting early with "no changes".

- Add explicit `id` fields to sync test fixtures for predictable relationship testing.

## 0.2.3

## 0.2.3

### Patch Changes

- Fix stale read behavior in interactive MCP sessions by invalidating cached Prolog query results after successful write operations.

  Add a persistent-session regression test that verifies create/read/update/read and delete/read consistency in one MCP process.

## 0.2.2

### Patch Changes

- 82b9742: Fix issue #53 npm consumer regressions

  - Fixed Prolog lifecycle bug where repeated kb_attach in same process failed with "No permission to modify static procedure 'kb:entity/4'"
  - Added rdf_unload_graph to kb_detach to prevent RDF graph duplication on reattach
  - Fixed MCP symbols manifest resolution to honor paths.symbols configuration (matching CLI behavior)
  - Added comprehensive regression tests for attach/detach lifecycle and symbols precedence
  - Added packed tarball E2E regression tests covering installed package behavior

- Updated dependencies [82b9742]
  - kibi-core@0.1.7
