# kibi-cursor

## 1.0.1

### Patch Changes

- Cursor agents now get an always-on CLI recipe when Kibi MCP tools are missing, instead of treating Kibi as unavailable.

  - Put the exact `npx --no-install kibi <route> --input -` command, MCP-to-CLI name mapping, and Shell-approval language in the always-applied workflow rule.
  - Keep published plugin hooks advisory and untrusted by default; dogfood still opts into `--trusted-workspace` locally.
  - Document the operator prerequisites (Agent mode, Shell, trusted workspace, project-local CLI) for the fallback to run.

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

### Patch Changes

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

- 3d7d04f: Generic MCP and CLI agents now discover Kibi's operating rules from bundled skills instead of a long copy-paste prompt. Improving an existing product KB is covered by a `kibi-usage` resource rather than a second manual, so agent guidance stays in one place and cannot drift from the packaged workflow.

  - Add `kibi-usage` `resources/kb-improvement.md` and bump that skill to 2.1.0.
  - Replace `docs/prompts/llm-rules.md` with `docs/generic-agent-onboarding.md`.
  - Remove the obsolete retroactive-init prompt; bootstrap stays in the `kibi-bootstrap` skill.

- 29793c7: The Cursor stop hook no longer starts an extra Kibi follow-up after you only deliver a plan. Reads and search no longer look like source edits, so plan mode can finish without an impact-check nudge. If that same turn actually edited source or updated the knowledge base, the existing follow-up still runs.

  - Record dirty paths only from known editable tools.
  - Treat `CreatePlan` as plan delivery and stay silent at stop unless that turn also edited source or mutated the KB.
  - Skip follow-up when `stop.status` is `aborted` or `error`.

- 8db2e37: Cursor plugin users can now enable Kibi without adding a separate project MCP configuration. The plugin finds the `kibi-mcp` version installed in the opened project, starts it inside that workspace, and reports a clear setup error when the dependency is missing. It never downloads or falls back to a global Kibi runtime.

  - Replace the plugin MCP `npx --no-install` command with the packaged consumer-workspace launcher.
  - Cover isolated and packed plugin launches, workspace selection, package-layout resolution, exit codes, and signal forwarding.

- 535dea8: Agents can now keep working in synthetic, detached, or unreadable workspaces while Kibi reports the migration work it can evaluate. Coverage and checks preserve their useful domain results when branch status is unavailable, and the Codex/Cursor skill assets now stay aligned with their published plugin metadata.

  - Keep status-derived migration actions read-only and append them only when branch resolution succeeds.
  - Preserve the shared migration-plan contract across coverage and checks without requiring a Prolog-backed status query in non-Git harnesses.
  - Synchronize plugin manifests and freshness skill CLI examples for the next coordinated patch release.

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

- Updated dependencies [6ca08bb]
- Updated dependencies [a2acea9]
- Updated dependencies [33262f8]
- Updated dependencies [9e6fb3f]
- Updated dependencies [3d7d04f]
- Updated dependencies [2d6cc59]
- Updated dependencies [8f71f1a]
- Updated dependencies [a07fad5]
- Updated dependencies [2e68da9]
- Updated dependencies [4cf383b]
- Updated dependencies [7bc4f61]
- Updated dependencies [15b5825]
- Updated dependencies [51fb55b]
- Updated dependencies [1ca62af]
- Updated dependencies [f1a6d5c]
- Updated dependencies [1ca62af]
- Updated dependencies [44fd818]
- Updated dependencies [8fe890c]
- Updated dependencies
- Updated dependencies [7654339]
- Updated dependencies [c77d3f1]
- Updated dependencies [967cef7]
- Updated dependencies [395e38f]
- Updated dependencies
- Updated dependencies [535dea8]
- Updated dependencies [5fdb828]
- Updated dependencies [b97329a]
- Updated dependencies [4c75e4d]
- Updated dependencies [c942344]
- Updated dependencies [07803e4]
- Updated dependencies [b746960]
- Updated dependencies [400e88c]
  - kibi-cli@1.0.0
  - kibi-mcp@1.0.0

## Unreleased

### Patch Changes

- The published Cursor plugin now launches the `kibi-mcp` installed in the opened project, even when Cursor starts plugin processes from the plugin installation directory. The launcher preserves the consumer workspace as the child cwd and `KIBI_WORKSPACE`, and fails with an actionable message when the project-local package is missing.

  - Replace plugin MCP's ambient `npx --no-install` invocation with the packaged consumer-local resolver.
  - Add isolated and packed-artifact coverage for workspace resolution, package layouts, exit codes, signals, and missing-runtime failures.

## 0.6.3

### Patch Changes

- Existing Kibi installations now receive an agent-guided migration workflow instead of opaque repair advice. Status, checks, and coverage expose one deterministic, hash-bound action plan; agents can safely apply only explicitly approved automatic repairs while semantic, proof, package, and operator work remains visible for review. This makes damaged or legacy KBs recoverable without direct `.kb` edits and gives every run an auditable post-application readback.

  - Add `kibi.migration-plan.v2` fragments to the 21-operation surfaces and support hash/action authorization in `kb_apply_plan` and `kibi migrate --apply-safe`.
  - Add lazy status/planning and deterministic schema, branch, storage, coordinate, and recovery action execution with workspace-root-safe CLI/MCP parity.
  - Refresh agent skills, traceability fixtures, and SkillOpt coverage for migration safety boundaries and five-axis closeout reporting.

## 0.6.2

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

## 0.6.1

### Patch Changes

- Dogfood projects now get branch-local knowledge bases that follow the exact Git ref, actionable stale-source diagnostics, and a sanctioned relationship cleanup path. Verification receipts and packed package provenance are stricter and reproducible, while agents receive conservative symbol-recovery guidance and explicit interim-state signals. This prevents silent `master`/`main` drift and makes passing E2E evidence distinguishable from complete semantic proof.

  - Remove implicit branch-name normalization and add previewed legacy branch migration.
  - Add exact relationship deletion, v2 receipt/schema parity, status diagnostics, dogfood package manifests, and SkillOpt cases.

## 0.6.0

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

## 0.5.1

### Patch Changes

- 5e4e126: Agents no longer treat Kibi's CLI as an MCP fallback. MCP tools and the trusted project-local CLI are presented as peer surfaces over the same 18 operations, and agent guidance now selects whichever interface is visible and approved in the current environment. The CLI's `--input` JSON routes remain first-class for agent automation, with no preference order implied.

  - Reframe `kibi-usage` Interface Selection and the operation-access preference column to peer surfaces.
  - Update OpenCode prompt injection, enforcement, and init-kibi guidance.
  - Update the MCP init-kibi prompt and the staged-impact evidence resolution text.
  - Re-sync the Cursor and Codex skill bundles.

- Codex and Cursor users now receive the same verified prose-to-logic guidance as the Kibi CLI. The bundled `kibi-usage` skill explains proposition coverage, typed Logic IR safety, predicate recovery, and contradiction-aware validation without relying on repository-specific release conventions.

  - Synchronize the Logic IR, fact-lane, workflow, and portable skill guidance into both agent bundles.
  - Keep the bundled skill manifests and canonical hashes aligned with the CLI public skill.

- 5e4e126: Kibi now ships as a portable Agent Plugin alongside the existing Cursor Plugin. The open Agent Plugins standard (agent-plugins.org) packages Kibi's Agent Skills and MCP server so any compatible client — Cursor, Copilot, OpenCode, and others — loads Kibi's capabilities without client-specific adaptation. The Cursor Plugin keeps Cursor-only components (rules, commands, hooks), and both formats are listed in the same marketplace.

  - Add a committed portable Agent Plugin artifact at `agent-plugin/` with a conformant `plugin.json` manifest (plugin.schema.json 1.0.0).
  - Generate the artifact's `mcp.json` with the required `$schema` and `stdio` server type.
  - List the Agent Plugin (`plugins/kibi-agent-plugin`) in the repo marketplace alongside `kibi-cursor`.
  - Add `scripts/build-agent-plugin.ts` to regenerate the artifact and keep its skills in sync with the canonical bundle.

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

- 2f9073c: Kibi now ships optional guidance for recording UI and visual expectations, so agents working on a screen can discover "where things live" and cannot silently drift the layout. A prose requirement anchors the full visual description, checkable positions, alignment, and header ordering decompose into strict facts that reject conflicting writes, and relational alignment uses the built-in `visual_layout_rule` predicate. The lane is per-project: non-UI projects simply never model UI subjects, and no validation rule requires them.

  Also, `kb_status` within a long-lived MCP session now observes same-session file and KB changes instead of returning a stale cached result. Compound Prolog goals (such as the status query) are no longer cached in one-shot mode, so a status check after a source or documentation edit reports the current freshness state.

  - Add `docs/ui-requirements.md` with the three-layer UI modeling guide, payload-shaped examples, and the check workflow.
  - Point the modeling cheatsheet decision tree, agent LLM rules, and the AGENTS quick references at the new UI lane.
  - Add a self-contained `kibi-usage` skill resource (`resources/ui-requirements.md`), declare it in the skill manifest, and add a UI modeling workflow section.
  - Synchronize the updated `kibi-usage` skill into the Codex and Cursor bundles.
  - Keep compound Prolog goals out of the one-shot query cache so `kb_status` reports fresh state after same-session writes.

## 0.5.0

### Minor Changes

- b2b1792: Kibi guidance now helps agents distinguish suitable relational predicates from scalar constraints and review-only claims without replacing readable requirements. CLI, Codex, and Cursor users receive the same predicate-first decision tree and authoritative examples, reducing invented predicates and unsafe modeling.

  - Add built-in, project-local, deny, strict-scalar, ambiguity, false-positive, and ontology-gap guidance to the canonical `kibi-usage` skill.
  - Regenerate the Codex and Cursor mirrors with matching canonical hashes.

### Patch Changes

- 610b5be: The improved Kibi guidance skills will ship to CLI, Codex, and Cursor users in the next package release. This keeps the canonical CLI skill bundle and the generated client-plugin mirrors aligned for downstream installs.

  - Release the canonical skills bundled by `kibi-cli`.
  - Release the generated `kibi-codex` and `kibi-cursor` skill mirrors.

## 0.4.0

### Minor Changes

- a0fee4a: The Cursor plugin now supports capability-based Kibi interface selection, using visible MCP tools first and a trusted project-local CLI fallback when needed. Deterministic worktree resolution keeps both interface choices anchored to the intended repository.

  - Add MCP-first, CLI-fallback agent guidance.
  - Resolve trusted worktree runtime paths deterministically.

### Patch Changes

- cafa25f: Agents can now select Kibi by available capability instead of stopping at MCP-specific guidance. The bundled skills prefer approved MCP tools, fall back safely to a project-local non-installing CLI runner, and provide executable JSON recipes plus an exact 18-operation access catalog.

  - Document every shared MCP operation's dedicated CLI route, input mode, effects, Prolog requirement, mutability, and telemetry handling.
  - Regenerate Cursor and Codex skill mirrors from the canonical capability-based source.

- 23e815a: Agents can now keep using Kibi when MCP tools are unavailable but a trusted project-local CLI is ready. Guidance across Cursor, OpenCode, and MCP documentation now selects the interface by capability and stops for operator action only when neither safe surface is available.

  - Replace MCP-exclusive guidance with the visible-MCP, trusted-CLI JSON route, and blocked state machine.
  - Preserve direct `.kb/` access prohibitions, discovery-before-mutation, sequential writes, and completion validation gates.

- e71f1ce: Cursor dogfood sessions now keep each linked worktree as the Kibi data workspace while launching a compatible built MCP runtime from that worktree or its primary checkout. Invalid, stale, or unrelated builds are rejected without installing packages, and Cursor hooks offer the project-local CLI only as advisory guidance after explicit workspace trust.

  - Add deterministic build, runtime, SWI-Prolog, and package-version checks to the Cursor worktree resolver.
  - Preserve an explicit `KIBI_WORKSPACE` when the MCP diagnostic launcher starts from another runtime root.
  - Track MCP capability as `observed` or `unknown` and keep hook-driven CLI fallback non-executing.

## 0.3.1

### Patch Changes

- f1db710: Kibi check outputs now have a stable advisory diagnostics lane for auditability review signals. Operators and MCP clients can receive `qualityDiagnostics` alongside hard `violations` without advisory-only findings changing pass/fail counts or exit behavior. Existing staged impact failures, including symbol granularity violations, remain blocking. Source impact analysis now also highlights overly broad symbols, indistinguishable symbol coordinates, and mixed-purpose component/class ownership as review-only guidance.

  Technical summary:

  - Add the public `QualityDiagnostic` type with `error`, `warning`, `review`, and `info` severities plus explicit `blocking` semantics.
  - Preserve existing `violations`, `diagnostics`, and `impactDiagnostics` fields while adding MCP structured `qualityDiagnostics` output support.
  - Preserve explicitly filtered MCP `kb_check` rule semantics so advisory full-KB quality scans only run for unfiltered checks or requested impact diagnostics.
  - Clarify Codex and Cursor bundled agent guidance so targeted checks use explicit rules and final checks omit rules for full-KB `qualityDiagnostics` review.
  - Add quality diagnostic text formatting and shared blocking helpers that treat `blocking: true` or `severity: "error"` as hard failures.
  - Add non-blocking `multi_requirement_symbol_review`, `duplicate_symbol_coordinate_review`, and `component_mixed_purpose_review` impact diagnostics.

## 0.3.0

### Minor Changes

- Kibi now gives agents source-impact feedback while they are still editing, instead of waiting for the commit hook to be the first signal. Meaningful source edits can be checked through MCP with changed-file impact diagnostics, so agents see coarse symbol ownership, stale symbol evidence, and semantic-review prompts while the source context is fresh. OpenCode, Cursor, and Codex adapters now steer agents toward that MCP-first workflow and keep CLI/hooks as the later safety net.

  Technical summary:

  - Add reusable CLI changed-file impact diagnostics and export them for MCP consumption.
  - Extend MCP `kb_check` with source-file impact options and structured impact output.
  - Update OpenCode, Cursor, and Codex guidance/hooks to request impact-enabled `kb_check` after source edits.
  - Document semantic-review diagnostics and class-member granularity expectations.

## 0.2.2

### Patch Changes

- Kibi now gives agents clearer guidance for the diagnostics flow, so the release notes should reflect that the bundled usage text and MCP logging story were tightened together.

  This update also keeps the package mirrors aligned where applicable, which helps downstream plugin consumers stay in sync with the canonical guidance.

  - Hardened bundled skill guidance for kibi usage.
  - Improved MCP diagnostic logging shape and validation hints.
  - Synced packaged skill copies where they are shipped with the release.

## 0.2.1

### Patch Changes

- 5d2975a: Cursor stop hooks no longer inject a long multi-line Kibi freshness reminder after every agent response. Follow-ups are now one line, and most sessions stay silent.

  - Track `kb_upsert`, `kb_delete`, and `kb_check` MCP usage during the session.
  - Emit no stop follow-up when nothing KB-relevant changed, or when `kb_check` already ran after edits.
  - Emit a short summary (`Kibi KB updated (kb_upsert).`) after KB mutations, or a single-line sync nudge when source files changed without KB activity.
  - Fix publish workflow to build and pack `kibi-cursor` tarballs before npm publish.

- Cursor sessions now use Cursor's documented workspace root payload when deciding whether Kibi is already configured. This prevents the plugin from telling agents that Kibi needs bootstrapping just because the hook process is running from the plugin install directory instead of the actual workspace. The bootstrap reminder now names the missing `.kb/config.json` condition directly instead of implying MCP is unavailable.

  - Parse `workspace_roots` from Cursor hook payloads and prefer the first workspace root for Kibi config detection.
  - Add a regression test covering `sessionStart` without `cwd` when `workspace_roots` points at a configured workspace.
  - Reword the bootstrap reminder to describe a missing workspace config rather than generic initialization failure.

## 0.2.0

### Minor Changes

- Cursor users can now install an optional Kibi adapter plugin that bundles MCP configuration, workflow rules, skills, slash commands, and advisory editor hooks. The plugin builds on the existing `kibi-cli` and `kibi-mcp` foundation without replacing them, and teams that prefer manual setup can continue configuring the local `kibi-mcp` server directly.

  - Add the publishable `kibi-cursor` package with Cursor plugin manifest assets, rules, skills, commands, hook declarations, and MCP config.
  - Add advisory hooks for bootstrap reminders, direct `.kb` edit warnings, read/write guidance, and session freshness follow-ups.
  - Wire `kibi-cursor` into workspace build, pack, release-state, publish, CI unit coverage, docs, and marketplace verification.

## 0.1.0

### Minor Changes

- Cursor users can install an optional Kibi adapter plugin that bundles MCP configuration, workflow rules, skills, slash commands, and advisory editor hooks. The plugin builds on `kibi-core`, `kibi-cli`, and `kibi-mcp` without replacing them, and teams that prefer manual setup can continue configuring the local `kibi-mcp` server directly.

  - Add the publishable `kibi-cursor` package with Cursor plugin manifest assets, bundled skills, rules, commands, hook declarations, and MCP config.
  - Add a conservative hook runner with bounded session state, bootstrap reminders, direct `.kb` edit warnings, read/write guidance, and freshness follow-ups.
  - Wire `kibi-cursor` into workspace build, pack, release-state, publish, CI unit coverage, docs, and marketplace verification.
