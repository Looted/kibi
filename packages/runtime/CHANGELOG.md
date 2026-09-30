# kibi-runtime

## 2.0.1

### Patch Changes

- 783cc75: Capability plugins now participate at the real CLI/MCP call sites while default installs keep the same builtin-only behavior.

  Symbol analysis prefers the capability registry when available, ontology matching can compose activated packs for suggest-predicates, and external semantic classifiers run only from `kb_semantic_advisor` and `kb_compile_intent`. `kb_model_requirement` stays a modeling operation and does not call an external classifier. Sync/check/upsert/status/proof paths stay on deterministic builtin analysis. Distribution lists, pack scripts, and docs cover the new plugin packages; Jev remains opt-in.

- 783cc75: Capability plugins can now be loaded safely from a project's package.json without changing default behavior when none are configured.

  Kibi hosts a lazy, injectable capability-plugin registry shared by CLI and MCP. Builtin providers always register; optional packages load only when a capability is first used, with replace/augment/shadow mode rules and an allowlist that keeps external semantic classifiers out of sync/check/upsert/status/proof paths.

  - Add `packages/cli/src/plugins` host loader/registry, composition helpers, and source-analysis service
  - Wire `OperationContext.ensurePlugins` through CLI and MCP runtimes
  - Pass operation context through MCP semantic-advisor / model-requirement / suggest-predicates registration
  - Depend on `kibi-plugin-sdk` `^0.1.0` and re-export the registry from `kibi-runtime`

- 217b044: Provider secrets now resolve the same way in every harness: existing process env wins, then project `.env.kibi` (or `KIBI_ENV_FILE`), then `~/.config/kibi/env`, with legacy `.env` only filling gaps (labeled `legacy_env`). Blank values are unset. `kibi doctor` stays import-free: package/capability/mode/declared for any plugin, plus static first-party Jev secret/model diagnostics from the real bootstrap attribution — never by re-reading files without the pre-bootstrap process snapshot, and never by executing plugin code.

  - Shared `bootstrapKibiEnvironment` with remembered process-key snapshot, blank-as-unset, and `legacy_env`
  - Doctor uses `resolveKibiWorkspaceRoot` + bootstrap `sources`; no `loadPluginPackage` / dynamic import
  - MCP `resolveWorkspaceRoot` delegates to the same canonical resolver
  - Re-export bootstrap helpers from `kibi-runtime`

- 188f875: No user-facing behavior change: `kibi-runtime` now resolves its bundled-skills directory lazily on first use instead of at import time, `isWithinRoot` drops a redundant same-path comparison, `kibi-cursor` drops a provably dead `planDelivered` early return and an always-true stdin branch, and the hook runners' stdin buffering is simplified to an unconditional `Buffer.from`. The reshaping lets the new mutation-testing suite (`docs/mutation-testing.md`, run via `bun run test:mutation`) prove these paths exhaustively — the suite holds a 100% mutation score over `kibi-runtime`, `kibi-codex`, and `kibi-cursor` sources.
- 8985874: Capability plugins now fail closed on unsafe resolution, poisoned loads, and silent classifier errors, and Jev records the model it actually called.

  Project config rejects duplicate package activation and duplicate replace providers. Package entry resolution uses Node/Bun as the source of truth and refuses entries that escape the package root, including via symlinks. A failed plugin import no longer poisons later retries in the same registry. Semantic classifier failures are returned as diagnostics instead of being swallowed, and Jev includes its configured model id in those diagnostics.

  - Validate duplicate plugin activation, secrets, and provider ids
  - Confine resolved plugin entries to the realpath'd package root
  - Evict rejected loadedPackages promises
  - Typed classifier attempt outcomes with diagnostics
  - Configurable Jev model (default `jev-latest`) on errors and requests

- aabd57f: Kibi's runtime package keeps TypeScript symbol analysis portable when installed from a build made elsewhere. It resolves the builtin analyzer through its declared package dependency, so TypeScript resources come from the consumer's install.

  - Externalize `kibi-plugin-builtin` from the runtime bundle and declare it as a runtime dependency.

- db07d8f: Proof diagnostics now agree with the Prolog decision: a structural type-shape unit contract is shown as qualifying, `kibi proof impact` compares against the Git HEAD baseline and exits 0 after a successful report, and mixed-role symbols fail the strict proof integrity gate.

  - Mode-aware candidate evaluation in Prolog; receipt fallback uses `test_receipt_evidence(Context, TestId, Evidence)`.
  - `proof impact` reads `HEAD:proof/baseline.json` with no worktree fallback; diagnostic exit 0.
  - Strict proof workflow and baseline checker include canonical `symbol-traceability`.

- f33a665: Proof failures now name the exact requirement, symbol, and why each `covered_by` candidate did not qualify, without changing what counts as proven. Agents can inspect a requirement with `kibi proof explain` and compare current proof state to the committed `proof/baseline.json` snapshot with `kibi proof impact`, instead of reverse-engineering Prolog or guessing from aggregate counts.

  - Keep `kibi.requirement-proof.v3` and add additive production-symbol `explanations` plus TEST `testResolutions` on the same Proof.
  - Ratchet `proof/baseline.json` to v2 with compact requirement fingerprints; aggregate counts stay the ratchet.
  - Add `kibi proof explain` and `kibi proof impact` as Proof projections, mixed-role leftovers in `symbol-traceability`, and advisory `proof-contract-symbols`.
  - Document the proof-regression workflow in `kibi-usage` 2.1.3.

- Updated dependencies [b375e8f]
- Updated dependencies [e6571b4]
- Updated dependencies [783cc75]
- Updated dependencies [783cc75]
- Updated dependencies [db07d8f]
- Updated dependencies [f33a665]
  - kibi-plugin-builtin@0.2.0
  - kibi-core@0.13.0

## 2.0.0

### Major Changes

- 812c201: Kibi's proof layer is now runner-neutral: any test runner, script, or harness can prove requirements, and Playwright is no longer built into the proof model.

  - `kibi prove` replaces `kibi verify` as the single command to run configured proof producers and record evidence. Proof contracts (`kibi.proof-contract.v1`) declare explicit obligations (`symbol_id` + `target`) executed by a configured integration in `.kb/proof/integrations.json`; `kibi proof inspect` discovers test infrastructure deterministically; one producer run can satisfy many test contracts, and re-ingestion is idempotent.
  - Evidence moves to the `kibi.proof-run.v1` artifact (typed environment, run-level outcome, factual attempt history with `native_case`/`aggregate_run` provenance) evaluated into `kibi.proof-receipt.v1` receipts bound to the live snapshot, contract hash, and effective execution fingerprint. Command proof is the universal fallback, so every project can prove requirements without a first-party framework adapter; strict first-attempt policy never upgrades unknown attempt history into passing evidence.
  - Breaking removals: `kibi verify`, `kb_ingest_verification`, `kibi.playwright-run.v1`, `verification_contract`/`verification_receipts` entity fields (replaced by `proof_contract`/`proof_bindings`/`proof_receipts`), the `required_case_symbols`×`required_projects` Cartesian contract, and `retries` fields. Migrate by re-running `kibi prove` after bootstrap configures proof for your repository.

  DRY: hard cutover to the proof-evidence protocol across CLI, MCP, runtime skills, Prolog proof evaluation, coverage/repair/report surfaces, agent skills, and repository self-proof (packed e2e steps now execute through `kibi prove --all`).

### Minor Changes

- 4b8594f: Proof runs are now self-identifying, failures are attributable, and integration selection finally matches real repositories. `kibi prove` sets `KIBI_PROOF_RUN=1` in every producer child process, so runner configs that must behave differently under proof (disabling retries, for example) can branch on a stable marker instead of guessing from output-path variables — this fixes silent contract violations like proof runs executing with Playwright retries enabled. When a run fails, gap reasons now name the failing member results instead of an opaque "run did not pass", so one slow scenario no longer hides why four domain contracts were refused. `--integration` accepts multiple comma-separated ids, `--integration-except` skips integrations without `--all`, and a selector that matches nothing is now a loud error instead of a silent no-op.

  Two long-standing consumer sharp edges are fixed: the symbol compiler lock is stolen immediately when its recorded holder pid is provably dead instead of blocking writes for the full timeout, and `kb_suggest_predicates` now defers to the semantic advisor's nonlogical classification (`review_nonlogical`) instead of emitting predicate suggestions for rationale, example, or subjective prose.

  The built-in predicate catalog grows ten consumer-escalated families — fail-closed authorization, deployment preconditions, data-migration sequencing, diagnostic visibility, mutation authority, request deduplication, async boundaries, canonical identifiers, responsive breakpoints, and operational pauses — and retrieval ranking no longer lets an exact-pattern miss veto strong lexical and semantic evidence, so claims like "must complete in < 500ms", "read canonical data only", and "renderer-neutral persistence" now ground to precise predicates.

  Technical summary: `commandEnvironment` exports `KIBI_PROOF_RUN`; `evaluateContractAgainstRun` adds failing-member attribution to run-failure gap reasons; `prove` selectors parse comma-separated id sets with fail-fast empty matching; `acquireSymbolCompilerLock` steals well-formed locks with dead holder pids; `suggest-predicates` routes all-nonlogical inputs to `review_nonlogical`; `rankSchema` treats exact-score 0 as a miss rather than a veto; `resource_constraint`, `failure_behavior`, `migration_boundary_rule`, and `abstraction_boundary_rule` gain retrieval cues and intent rules; `predicate-catalog-5.ts` and `predicate-usage-hints-4.ts` add the ten new families.

### Patch Changes

- b1682f1: Agents receive clearer guidance for repairing the actual supplied mutation request and preserving approved predicate bindings. The scoped additions retain the existing workflow while separating payload recovery from conditional relational modeling.

  - Update `kibi-usage` to 2.1.2 in CLI/runtime sources and the generated Codex/Cursor distributions.
  - Preserve the other three skills and all existing resource content.
  - Retain production-adoption safeguards; development comparisons are not held-out evidence.

- ee0dc49: Plugin hooks, the Cursor MCP launcher, and skill validation now expose the
  same entry paths tests already spawn as processes. In-process coverage can
  exercise stdin, CLI guards, and realpath failures instead of leaving those
  lines invisible to Codecov.

  - Export hook CLI helpers and Agent Plugin / launcher internals for tests.
  - Use a namespace `fs` import in skill validation so realpath errors are testable.

- 5999143: Agent-facing skill docs now use the current status field names, so agents following the freshness and E2E receipt workflows look for fields that actually exist in `kb_status` output instead of stale ones.

  - Bundled `kibi-freshness` and `kibi-usage` skills (all agent mirrors) now reference `proofSnapshotChanges` and `proofSnapshot` (previously `verificationSnapshotChanges`/`verificationSnapshot` from the pre-proof-architecture status schema).
  - The skillopt-eval harness reads `proofSnapshot*` status fields and its held-out eval prompts name the current fields, so "dirty editor path" evidence gathering works against live status output again.

  Dry: completes the `verificationSnapshot*` → `proofSnapshot*` rename from the proof architecture change in the surfaces that earlier commit missed.

- Updated dependencies [d53e77a]
- Updated dependencies [e09882a]
- Updated dependencies [a379c9a]
- Updated dependencies [11ba1ef]
- Updated dependencies [7de82d4]
- Updated dependencies [30dbb06]
- Updated dependencies [c4c3832]
  - kibi-core@0.12.0

## 1.0.1

### Patch Changes

- `kibi-runtime@1.0.0` could not be installed from npm because the publish was
  rejected: the package manifest had no `repository` entry, so npm's provenance
  verification failed with
  "Failed to validate repository information". This release adds the missing
  repository metadata so the package publishes and installs normally, matching
  every other Kibi package.

  - Add the standard `repository` block (`git`, `https://github.com/Looted/kibi.git`)
    to `kibi-runtime/package.json`; no code or behavior changes.

## 1.0.0

### Major Changes

- 9e6fb3f: Kibi now uses one opinionated project contract: all Kibi-managed knowledge lives under `.kb/`, check enforcement is owned by the installed Kibi version, and projects can no longer weaken health by disabling rules or relocating entity paths in `.kb/config.json`. Existing repositories must run `kibi migrate --yes` to move legacy `documentation/...` knowledge into the canonical layout and adopt `.kb/manifest.json`.

  Advisory modeling checks still run by default, but they report as non-blocking quality diagnostics instead of failing `kibi check`. Migration rewrites the old blanket `.kb/` gitignore stanza so authored lanes are trackable, and a malformed leftover `config.json` blocks the one-way cutover instead of guessing default paths.

  - Remove user-configurable entity paths and persistent `checks.rules` overrides; retire `.kb/config.json` after migration.
  - Introduce `.kb/manifest.json` for Kibi-owned lifecycle metadata (schema version, semantic backfill state).
  - Add one-way legacy storage migration (`documentation/` and custom configured paths → `.kb/<lane>/`).
  - Split check results by enforcement class: canonical → blocking violations; advisory → quality diagnostics; migration → explicit `--rules` only. Default execution is derived from the class (no separate `runsByDefault` flag).
  - Normalize legacy Kibi `.gitignore` fences during init and migrate; treat `.kb/migrations/` as derived runtime state.
  - Fail closed when leftover `.kb/config.json` cannot be parsed.
  - Update init, sync, hooks, staged evidence, doctor, migration-plan, and integration packages for canonical paths.
  - Generate the requirement-health report on pull requests as a `kibi-pr-report` artifact; keep GitHub Pages deployment on the default branch only.
  - OpenCode treats canonical `.kb/` entity lanes as knowledge that requires evidence; only derived runtime trees (and leftover `config.json`) are ignored.
  - Cursor and Codex hook path policy treat canonical `.kb/` lanes as tracked knowledge, not opaque compiled-store paths.
  - Pending relationship shards are not treated as symbols manifests during source discovery.

- 4c75e4d: Kibi onboarding now separates repository initialization from teaching Kibi about an existing codebase. After `kibi init`, an agent can run the `kibi-bootstrap` workflow to produce a reviewable, hash-bound plan and apply the exact approved plan safely. The old autopilot and init-kibi public names are removed so new users see one clear bootstrap path.

  - Replace `kb_autopilot_generate`/`autopilot-generate` with `kb_plan_bootstrap`/`plan-bootstrap`.
  - Add `kibi.bootstrap-plan.v1` validation, deterministic approval hashes, dependency ordering, stale-plan checks, and typed bootstrap recovery through `kb_apply_plan`.
  - Synchronize the four canonical skill mirrors and update client adapters, docs, fixtures, and SkillOpt cases.

### Minor Changes

- a2acea9: Kibi now has a source-first, exact-Git runtime contract for first-party
  adapters. CLI JSON and MCP structured results share a versioned envelope with
  effect and repair information, while branch stores are hashed and explicitly
  identity-bound. The mutation path can author tracked source documents and
  canonical relationship shards without staging or committing them.

  - Add the `kibi-runtime` first-party integration package.
  - Add exact branch-store manifests, explicit legacy migration/quarantine, and
    typed result/effect contracts.
  - Add source-first document writes, relationship-shard updates, and deletion
    approval plans.

- 7654339: Predicate suggestions now abstain more safely when relevance is weak or bindings are unreviewed, while explaining candidate eligibility and rejection reasons.

  When a genuine ontology gap remains, agents receive a reviewable schema draft instead of an empty recommendation. Reusable launcher schemas and regression coverage improve guidance for consumer-local package resolution and process execution.

  - Add public applicability, binding-provenance, score diagnostics, abstention, and recommended-schema draft fields.
  - Add five launcher-oriented schemas, Cursor launcher coverage, MCP assertions, and reference documentation.
  - Preserve `requires_rule` relationship shards during source-first extraction and sync.
  - Compose multi-entity authored deletions targeting one source file into a single hash-bound write.
  - Fail packed E2E bootstrap immediately when shared npm installation exits unsuccessfully, preserving command output for diagnosis.
  - Scope explicit `kb_check --rules` diagnostics in the Prolog check path instead of evaluating the full rule aggregate first.
  - Fix Logic IR dependency extraction so positive stored rules remain ground and stratification checks terminate.
  - Normalize RDF-typed `rule_schema_id` references before rule verifiability lookup and cover the repair with Prolog regressions.

### Patch Changes

- e3fd1f2: Clean installations can now build Kibi's shared skill runtime without relying on a dependency supplied by another workspace package. This keeps CI, packed consumers, and direct runtime users consistent with local development.

  - Declare `gray-matter` as a direct runtime dependency because the skill manifest parser imports it.

- 3d7d04f: Generic MCP and CLI agents now discover Kibi's operating rules from bundled skills instead of a long copy-paste prompt. Improving an existing product KB is covered by a `kibi-usage` resource rather than a second manual, so agent guidance stays in one place and cannot drift from the packaged workflow.

  - Add `kibi-usage` `resources/kb-improvement.md` and bump that skill to 2.1.0.
  - Replace `docs/prompts/llm-rules.md` with `docs/generic-agent-onboarding.md`.
  - Remove the obsolete retroactive-init prompt; bootstrap stays in the `kibi-bootstrap` skill.

- 7bc4f61: Symbol coordinates no longer vanish when agents edit symbols, and a stale warm cache can no longer hide the damage. Editing a symbol through Kibi now keeps its exact code location in compiled knowledge, and when compiled state ever loses those coordinates while everything else looks unchanged, the approved coordinate refresh actually repairs it instead of reporting "Imported 0". Refresh failures now stop the operation loudly instead of being logged and ignored, so proof gaps appear immediately rather than after the next full rebuild.

  - Source-first symbol upserts re-extract the canonical manifest + artifact entity before committing; authored `symbols.yaml` stays coordinate-free.
  - Sync cache v2: workspace-root-relative keys, `symbol-coordinates.yaml` fingerprinted with its manifest, explicit refreshes forced through persistence, cache written only after durable save.
  - Generated artifacts become identity-bound v2 records published atomically under a workspace symbol compiler lock; malformed artifacts fail closed everywhere.
  - New MCP/CLI regression suites plus a Prolog proof-stage regression cover persistence, warm-cache repair, and fail-closed behavior.

- Generated symbol coordinates now stay aligned with live source files during sync and source-first mutations, even when operations overlap or fail partway through. Coordinate artifacts are published and restored atomically, so callers do not inherit stale or half-written compiler state.

  - Add workspace-scoped symbol compiler locking and compare-before-restore artifact rollback.
  - Include coordinate artifacts and referenced source files in sync freshness fingerprints.
  - Support explicit `test-suite` granularity for intentionally coarse test anchors.

- 3cb9545: Runtime builds now clean stale bundled skills before copying, so skills removed from source (like the retired `init-kibi` autopilot) no longer linger in `dist/skills/` and leak into packed distributions and the MCP skills list.

  The kibi-runtime build script previously only ran `mkdir -p dist/skills && cp -r src/skills/. dist/skills/`, which never removed directories that had been deleted from `src/skills/`. After the bootstrap-plan onboarding change replaced the `init-kibi` autopilot with the canonical `kibi-bootstrap` skill, every rebuild silently resurrected the removed skill from the previous build output. Consumers listing bundled skills saw a ghost `init-kibi` entry alongside `kibi-bootstrap`, and the MCP skills-adapter contract caught the mismatch. The build now mirrors the CLI package's behavior and runs `rm -rf dist/skills` before repopulating it.

  - build: remove `dist/skills` before copying `src/skills` in `packages/runtime/package.json`

- 8d25c5c: Ship a self-contained engine daemon in the published `kibi-runtime` package so packed consumers can start the Kibi engine.

  The runtime bundle inlines `kibi-cli` operation code whose daemon lookup expects `engine-daemon.js` beside the bundle or under a nested `kibi-cli` install. Published-shaped installs (npm or pnpm isolated mode) have neither, so first-party MCP hosts failed with "The Kibi engine is not built. Run `npm run build:cli`" on first engine use. The runtime build now bundles `packages/cli/src/engine-daemon.ts` into `dist/engine-daemon.js`, giving the existing lookup a working entry point without adding dependencies.

- b97329a: Verification status now remains reusable when the only local changes are operational Kibi artifacts that are excluded from the code snapshot. Those changes still appear in status diagnostics, while source changes continue to mark verification evidence dirty.

  - Derive workspace snapshot dirtiness from snapshot-relevant changes rather than every Git porcelain row.
  - Preserve complete change records and counts for operational diagnostics.

- b746960: Kibi now teaches and enforces requirement supersession in one consistent
  direction: the replacement points to the requirement it replaces. Reversed
  edges can no longer hide a newer contradictory policy merely by making that
  newer requirement non-current. Relationship checks also block authored links
  that have silently disappeared from compiled knowledge.

  - Document `supersedes` as new-to-old across bundled and generated skills.
  - Reject reversed supersession when tracked source history proves that the
    purported replacement predates its target.
  - Restrict legacy branch migration to literal-to-hashed storage conversion for
    the same exact Git identity; every cross-identity pair is refused.
  - Cover exact-Git branch policy conflicts and approved evolution with Prolog
    regression tests.
  - Preserve partial-upsert relationship projections and validate
    authored-to-compiled relationship parity.

- Updated dependencies [1ca62af]
- Updated dependencies [7654339]
- Updated dependencies [400e88c]
  - kibi-core@0.11.0
