# kibi-runtime

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
