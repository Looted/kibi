# kibi-zcode

## 0.2.2

### Patch Changes

- db5376c: Projects can now opt into impact reviews that bind a change to its exact source, knowledge decisions and trusted analysis policy. Kibi validates both staged changes and a complete pull-request diff, rejects stale review evidence, and lets agents prepare an unauthored review template through the CLI or MCP instead of hand-assembling one. Every decision and reviewer field stays for an agent to write; preparation never approves or proves anything.
  - Add versioned impact policy and review schemas, immutable review fingerprints, reviewed Python decorator coordinate migration and the trusted aggregate `check-diff` command.
  - Add the read-only `prepare-impact-review --input` CLI route and `kb_prepare_impact_review` MCP operation; regenerate the bundled operation-access catalog for the agent integrations.
  - Keep the sample CI workflow inactive until it is adopted on a protected target.

## 0.2.1

### Patch Changes

- 35cd120: The ZCode, Codex, and Cursor plugins now recognize Kibi tools when the host
  reports them with a prefix, such as `mcp__kibi__kb_check`. Before this fix,
  an agent that correctly ran an impact check through a prefixed tool name
  still got a stop reminder to run it, because the plugin never saw the check.
  - `kb-mcp-tools.ts` in each adapter gains `canonicalKbToolName`, which strips
    `mcp__<server>__`, `MCP:`, and `kibi_` prefixes before matching `kb_*`
    operations.
  - The Codex hook bundle is regenerated.

- 5a06c03: Kibi's agent plugins now share one fast, consistent implementation for source-path classification, Kibi MCP tool recognition, and symbol-manifest indexing. Codex and ZCode now recognize production code outside `src/`, while Cursor reuses the same size-and-mtime-keyed scanner as Claude instead of parsing the full symbol manifest before an edit.
  - Add `kibi-agent-core` as the common Node 18-compatible hook-helper package.
  - Keep host adapters thin while preserving their host-specific event and state contracts.
  - Replace Cursor's YAML parser dependency with the shared cached line scanner.

- 0128b56: Kibi now helps agents keep one shared vocabulary instead of letting every requirement invent its own. `kibi check` warns when two unrelated requirements state the same obligation. Units are compared in canonical form, so "30 min" matches "1800 s", and each warning names the exact facts involved. It also flags subject keys copied from a requirement ID, subject keys that don't follow `component.aspect`, predicates whose arguments read like prose, and entity files whose name doesn't match their ID. All of these are non-blocking warnings or info notes, so existing knowledge bases keep passing.

  When you model a new requirement, Kibi now ranks the subjects that already exist and either reuses one or explicitly declares a new one. It also flags claims that look like possible duplicates. An intentional restatement can be recorded with the new `restates` relationship. Skills and docs now recommend naming entities by the behavior they govern (`REQ-cli-gc`) instead of a sequence number (`REQ-042`). Existing numbered IDs stay valid.

  Predicate schemas can now declare the allowed values for an argument, plus the old spellings that map onto them. New facts must use those values. `kibi check` reports predicate facts that don't match any schema, and `kibi migrate` can fix the mechanical cases after you approve the plan hash. It moves a fact to the only namespace whose schema matches, and rewrites old spellings to the declared value. Everything that needs judgment stays a review item.
  - core: new `semantic_quality.pl` (`entity-id-style`, `domain-redundancy`, `domain-implication`, `subject-key-identity`, `subject-key-shape`, `ontology-quality`) and `units.pl`. Unit canonicalization is used for comparison only, and unknown or ambiguous units such as `KB` are never equated. Adds the `restates` req→req relationship and an optional `diagnosticSeverity` in the rule registry. Adds `:- encoding(utf8)` to modules that contain non-ASCII text.
  - cli/mcp: `restates` is wired through the extractors, schemas, and mutation paths. `entity-id-style` warnings are reported on `kb_upsert` creates and on staged added or renamed entity files. `kb_model_requirement` returns `vocabularyAlignment` (subject decision, candidates, redundancy candidates, stamps, `fallbackUsed`). Ontology-quality thresholds can be set with `KIBI_ONTOLOGY_QUALITY_MAX_SINGLETON_RATIO` / `KIBI_ONTOLOGY_QUALITY_MIN_FACTS`. `kb_compile_intent` create mode now keeps a caller-supplied `requirementId`. `kibi check --staged` now also prints its pass line when metadata-only staged changes have only advisory findings, matching the staged-symbol path.
  - cli/mcp: `predicate_schema` facts accept `argument_constants` and `argument_aliases`, stored like `rule_ir` as JSON. `kb_upsert` / `kb_validate_upsert` reject malformed vocabularies and predicate facts that use undeclared values or aliases. `kb_suggest_predicates` binds aliases to their constant and leaves undeclared values unbound. The new advisory TypeScript rule `predicate-schema-conformance` checks predicate facts against project schemas and the built-in catalog. Its mechanical repairs become automatic `predicate_schema_alignment` migration actions that carry the exact `kb_upsert` input and re-read the fact before writing.
  - core: `ontology-quality` findings name the prose-like arguments.
  - plugin-sdk: new `kibi.vocabulary-alignment.v1` capability (`rankSubjects`, `compareClaims`) with result validators.
  - plugin-builtin: deterministic offline provider (IDF-weighted subject ranking and negation- and quantity-aware claim similarity).
  - plugin-jev: Jev-backed provider. It runs in replace, augment, or shadow mode with builtin fallback, and makes network calls only when it is activated for `kb_model_requirement`. `kb_check` never calls a provider.
  - runtime and agent adapters: regenerated skill mirrors with the naming guidance and `restates` direction docs.

## 0.2.0

### Minor Changes

- e9a8158: Kibi now ships a native ZCode plugin. Teams working in ZCode get the four
  bundled Kibi workflow skills, a `/kibi-bootstrap` slash command, advisory
  lifecycle hooks, and the Kibi MCP server without hand-editing any ZCode
  configuration — and without the plugin making a sound in workspaces that never
  adopted Kibi. Local ZCode development, package builds, and tests use Linux/WSL
  in this release.
  - Install via the repo marketplace from a locally built checkout: run
    `bun run build:zcode`, then in ZCode open Settings → Plugin Management →
    Discover, add the repository directory with the `+` button (marketplace
    manifest at `.claude-plugin/marketplace.json`, plugin at `packages/zcode`),
    and install `kibi-zcode`. GitHub-source installs are unsupported — the
    generated `dist/hook-runner.js` is not committed, and marketplace copies
    never build; `prepack` applies only to npm packaging flows.
  - `.zcode-plugin/plugin.json` declares the skills, command, hooks, and an
    inline `mcpServers` entry verified against ZCode's strict schemas (stdio
    servers accept only `command`/`args`/`cwd`/`env`/`enabled`/`timeoutMs`;
    hook matchers are case-sensitive regexes, so "match all" is expressed by
    omitting the matcher rather than a bare `*`).
  - `hooks/hooks.json` wires `SessionStart`, `PreToolUse` (edit-like tools),
    `PostToolUse`, and `Stop` to `dist/hook-runner.js`. Outputs use the exact
    ZCode contract (`hookSpecificOutput.hookEventName` + `additionalContext`):
    direct `.kb/` edits get an advisory warning, opted-in sessions get discovery
    guidance, and stops remind about impact checks and freshness. Tracking is
    mutation-based (read-only tool calls never count as changes), compares
    canonical workspace-relative paths across edits and `kb_check` sourceFiles,
    invalidates a covering impact check when the same path is edited again, and
    is namespaced per host session so concurrent ZCode sessions in one workspace
    cannot consume or clear each other's pending reminders. Hard enforcement
    stays with the Kibi git hooks.
  - The skills mirror (`packages/zcode/skills/`) rewrites each canonical
    SKILL.md frontmatter to ZCode's recognized key set (`name`, `description`,
    `license`, `metadata`) so skills are marked `safeToAutoLoad`; bodies and
    resources stay byte-identical to `packages/runtime/src/skills/`, enforced by
    a drift test. `scripts/sync-agent-skills.ts` gained a `zcode` target.
  - `bin/mcp-launcher.cjs` keeps non-Kibi workspaces silent: a zero-tool MCP
    session when no `.kb/manifest.json` exists at the resolved Kibi project
    root, a proxy of the resolved `kibi-mcp` (project-local package entry first
    via Node's own resolution, then a PATH lookup — launched shell-free through
    `process.execPath`, so it also works on Windows without command
    interpreters) when it does, and a guidance session that distinguishes a
    missing installation from a launch failure.
  - The launcher resolves export-restricted local `kibi-mcp` installs through
    their public Node entry and declared `bin`, so a working local package wins
    over PATH while a broken local package is surfaced rather than silently
    replaced. Its shell-free `process.execPath` launch path retains the runtime
    handling needed for Windows npm shims.
  - Packaging: `files` ships the manifest, launcher, hooks, skills, command, and
    built `dist/`; `scripts/sync-plugin-manifest-versions.ts` keeps the plugin
    manifest version in sync with the package version; root scripts gained
    `build:zcode`, `dev:zcode`, and matching typecheck entries wired into the
    `build`, `typecheck`, and `pack:all` chains.

### Patch Changes

- 96db9d8: The bundled kibi-usage skill now documents how to debug proof-ratchet regressions: when `kibi prove` or the proof baseline check fails, follow the new "Debugging proof regressions" section in `resources/proof.md`. It explains how to read the failure with `kibi proof explain`, compare current proof state against the committed `proof/baseline.json` ratchet with `kibi proof impact`, and resolve regressions by restoring real coverage (tests, symbol ownership, fresh receipts) instead of lowering the baseline. Agent sessions get a canonical recovery path instead of improvising around proof failures.
  - Add "Debugging proof regressions" guidance to `kibi-usage/resources/proof.md`
  - Point `kibi-usage/SKILL.md` at the new section and bump the skill version to 2.1.3

- c77b371: Proof coverage reaches every requirement that has honest end-to-end evidence: fourteen new packed end-to-end tests wire previously unproven scenarios (status freshness, conservative proof reporting, snapshot relevance, MCP model-requirement and freshness, schema version, strict modeling, plan-hash enforcement, OpenCode enforcement, briefing removal, Prolog/SPARQL adoption, check-gate enforcement, evaluator gold runs, batch diagnostics) into the proof ladder, and requirements that are historically retired can now actually opt out of E2E proof.
  - `kb_check` with `async: true` returns a `kibi.job.v1` receipt whose shape is declared in the tool's output contract, so hosts no longer reject the response schema mismatch on large KBs.
  - Authored `proof_exempt` / `proof_exempt_reason` frontmatter on requirement documents is now extracted and persisted; previously the exemption was silently dropped on sync.
  - The MCP JSON-Schema-to-Zod bridge converts `anyOf` unions faithfully for declared output contracts (input `oneOf` guards keep their intentional lenient behavior).
  - Proof-entity maintenance: stale `SYM-proof-runner` obligation removed from the journaled-engine harness contract, and `REQ-*` inline annotations repointed to the modeled verification-evidence requirement.
  - New proof obligations: `TEST-e2e-*` packed scenarios, `TEST-kibi-change-to-proof-evaluation-live` gold-corpus run, and `TEST-e2e-root-batch-diagnostics`; `runBatch` is exported from the curated suite runner for diagnostic reuse.
