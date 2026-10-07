# kibi-claude

## 0.7.0

### Minor Changes

- 393f492: Large bootstrap plans no longer fall over when they take longer than the agent's MCP client is willing to wait. `kb_apply_plan` reports progress after every bootstrap action, so clients that reset their timeout on progress keep waiting, and `async: true` returns a `kibi.job.v1` receipt to poll with `kb_job_status` instead of holding the request open. If an apply is still cut off mid-action, `kb_apply_plan` with the journal's `recoveryJournalId` resumes it without hand-editing the journal and reclaims a source lock left behind by the dead process.

  `OperationContext` and `RuntimeOptions` gain an optional `onProgress` reporter (`OperationProgress`, `ProgressReporter` are exported from `kibi-runtime`). The bootstrap executor reports after each applied action; the MCP server forwards reports as `notifications/progress` when the request carries `_meta.progressToken`, and each report also pushes back the server's `KIBI_MCP_TOOL_TIMEOUT_MS`, which then bounds inactivity rather than the whole apply. `kb_apply_plan` accepts `async` (MCP only; it falls back to a synchronous apply when `kb_job_status` is not enabled) and its output contract admits the job receipt. Bootstrap recovery now accepts drift since the last checkpoint only when the journal is still `applying` with an active action that has no result: that action is re-applied, the result notes it, and the journal records it under `interruptedActions`; any other drift is still refused. `acquireWorkspaceMutationLock` takes a `reclaimDeadHolder` option; `kb_apply_plan` grants it only for a bootstrap recovery whose journal is `applying`, moves a dead holder's lock aside atomically, records it under `lockReclaims` in the journal, and keeps failing closed for live, unverifiable, corrupt or legacy owners. Bundled skills `kibi-bootstrap` 3.5.0 and `kibi-usage` 2.5.0 describe progress, async apply and journal recovery, and say never to edit `.kb/recovery`.

## 0.6.0

### Minor Changes

- b350869: Requirements, scenarios, tests, ADRs and observations now have to say why they exist. `kibi check` blocks a current entity whose body has no real context, `kb_compile_intent` requires a `context` for a new requirement, and bootstrap keeps the quoted source excerpt in the entity instead of only on the approval screen. Existing knowledge bases upgrade to schema 8 with `kibi migrate --yes`, which keeps every body byte-identical and only tags entities that lack context `review:context-missing`, recording their ids in `.kb/manifest.json`; the tag is honored only for those ids, so an agent cannot clear the check by tagging an entity itself. Run `kibi sync` afterwards.

  Entity bodies are split into sections by Markdown headings; `Context`, `Rationale`, `Why`, `Background`, `Source`, `Notes` and `Evidence` headings count as context. A requirement counts only context headings, while scenarios, tests, ADRs and observation or meta facts count all prose. Context needs at least 12 words and a token-set Jaccard similarity below 0.8 against the title (and, for a requirement, `semantic_text`); symbols, flags, events and other fact kinds are exempt. New canonical rule `entity-context-missing` and advisory `entity-context-acknowledged` are registered, and `kb_upsert` (including dryRun) warns about the same finding. `requirementSemanticText` now excludes context sections, and every requirement authoring path writes `semantic_text` explicitly; the schema 8 migration pins it for existing requirements with the previous derivation so claim spans and hashes do not move. `kb_compile_intent` gains `context`, `sourceExcerpt` and `sourceReference` and renders statement, `## Context` and `## Source`; on update it replaces the statement and keeps the existing context sections byte for byte unless new context or source is supplied. `kb_plan_bootstrap` requires `excerpt` for `intent` and `observation` claims and persists it with the source title and reference in the created body. Search snippets come from the first context prose. Bundled skills `kibi-usage` 2.4.0 and `kibi-bootstrap` 3.4.0 document the per-type body contract and say never to invent a reason.

## 0.5.1

### Patch Changes

- 7f08632: Bootstrap no longer drops conditional claims ("If microphone access fails, the editor must ...") or obligations that mention a referent ("... any draft state that refers to it") as `invalid_write`; they become ready requirement candidates. Linking a scenario to an existing requirement with `kb_upsert` no longer requires resending its whole semantic inventory, and a review observation can quote the claim it is about without a `claim_key`. The bundled skills now show how to answer `provide_argument_bindings` from `kb_model` predicates and how to write scenarios from acceptance criteria.

  Technical summary: requirement steps built by `kb_plan_bootstrap`, the `kb_model` requirement path and typed logic plans take each inventory role from the semantic advisor (`advisorPropositionRole`), so the write-time proposition-complete check accepts what Kibi itself generated. The advisor classifies a clause as `definition` only when "means / is defined as / refers to / is called" is the main predicate of a sentence that asserts no obligation; inventories stored with the earlier `definition` role for such clauses still validate. `kb_upsert` on an existing `req` whose payload carries no `semantic_*` or `logic_claims` field and keeps the stored `title` and `text_ref` merges the stored ledger (and the stored `text_ref` when the payload omits it) before validation and writing; a payload that supplies ledger fields or changes the prose is checked as sent. The entity schema, the `kb_upsert` input schema and the Prolog shape check now let an `observation` or `meta` fact carry `claim_text` without `claim_key`; every other fact still needs both. `kibi-usage` 2.3.2 adds a predicate-binding retry example and a review observation payload; `kibi-bootstrap` 3.3.1 makes step 11 write scenarios from acceptance criteria with `assumes` links.

## 0.5.0

### Minor Changes

- 44b2d0d: After bootstrap, agents now keep going instead of stopping at a knowledge base that holds only cited requirements. Previously the `kibi-bootstrap` skill ended with "hand off to the normal Kibi workflow" and no instructions, and its rule against direct `kb_upsert` left claims the plan could not write with no way to author them. Now a "deepen" step tells the agent what to author next, in the normal workflow and with the human informed.

  The bundled `kibi-bootstrap` skill is now 3.3.0. A new step 11 ("Deepen") runs after apply and close-out. It loads `kibi-usage` and hands every claim suppressed as `invalid_write` or listed in `sourceOnlySignals` to `kb_model` and `kb_upsert` with its statement and `sourceId:reference` citation. It proposes a scenario from acceptance criteria (`specified_by`) for each persisted requirement, runs `kb_model` with `mode: "predicates"` on each one, and records any undeclared conflict or open question as a `review:conflict` or `review:open-question` observation. The safety boundary now states that the direct-`kb_upsert` prohibition covers the bootstrap plan's own writes, not this post-bootstrap authoring. Step 5 sends unplanned claims to step 11, and the report step is renumbered 12.

### Patch Changes

- ec26130: Bootstrap now keeps what the onboarding interview leaves unsettled. Previously every declared claim was treated as intended behavior, and contradictions between sources or open questions had no place in the plan, so they stayed in the agent's own notes and were lost after apply. Now a claim can be marked as an observation or an open question, and conflicts between claims can be declared. Each is kept in the KB as a cited review fact instead of becoming a requirement.

  `kb_plan_bootstrap` accepts `bootstrapContext.intentClaims[].kind` (`intent` by default, `observation`, `open_question`) and `bootstrapContext.conflicts[]` (`claimReferences` of two to ten `{ sourceId, reference }` pairs plus a `note`). Observation and open-question claims become `fact_kind: observation` candidates with the claim's citation evidence and `text_ref: <sourceId>:<reference>`; open questions are tagged `review:open-question`. Each conflict becomes a `fact_kind: observation` candidate tagged `review:conflict` that cites every referenced claim; a conflict naming an undeclared claim is reported in `diagnostics`. Kinds and conflicts are part of `declaredContext` and the plan hash (the default `intent` kind is omitted, so existing plans keep their hash), and the facts go through the same plan-time write validation as every other candidate. The `kibi-bootstrap` skill (3.2.3) updates the harvest, declare and approval steps.

- 094fcae: Bootstrap now links your declared intent to the code even when you declare many claims. Previously declared intent claims used up the shared `maxCandidates` budget, so with 50 or more claims every symbol, test and repository document Kibi found was suppressed as `over_limit`, and the plan to approve listed hundreds of suppression rows. Now claims sit outside the budget, generic Markdown stays out of claim-driven plans unless you ask for it, and suppressions are summarized as one count per reason.

  `kb_plan_bootstrap` applies `maxCandidates` (default 50) only to discovered candidates, independent of how many declared `intentClaims` are planned, and reports one `N discovered candidate(s) exceeded maxCandidates` diagnostic instead of the old "discovered candidates get no slots" note. `includeGenericMarkdown` defaults to `false` when `bootstrapContext` declares `intentClaims` (a diagnostic states it) and to `true` otherwise; an explicit value always wins, and the input schema no longer advertises a fixed default. `tldr` and a new `Suppressed candidates by reason` diagnostic aggregate `suppressedCandidates` per reason; the full rows are unchanged. The `kibi-bootstrap` skill (3.2.2) updates step 5 accordingly.

## 0.4.2

### Patch Changes

- 564b171: Bootstrap plans no longer drop the intent claims you declared from tracker, wiki or spec sources when the repository has many candidates. Previously the default 50-candidate cap could silently discard every claim from one source, and two markdown lines that restated one rule could leave an approved plan half-applied. Now every declared claim is planned, each source reports how many of its claims were planned, and a plan that plans none of an authoritative source's claims asks for context instead of reporting ready.

  `kb_plan_bootstrap` applies `maxCandidates` only to discovered candidates. Candidates that would rewrite an already-planned entity with different content are suppressed as `duplicate_entity`, and the write-time `claim_key` grounding check now also runs at plan time against planned writes, suppressing mismatches as `invalid_write`. The plan adds one `Knowledge source …` diagnostic per declared source. The `kibi-bootstrap` skill (3.2.1) tells agents to read those diagnostics and no longer advises against `maxCandidates`.

## 0.4.1

### Patch Changes

- Agents now pick up the `kibi-bootstrap` skill for onboarding work beyond seeding a new knowledge base: reviewing a plan or preview, judging approval readiness, diagnosing a blocked or failed bootstrap, and applying an approved plan. The skill starts every task with `kb_status`, routes review and repair tasks to a read-only preview, and checks before applying that the plan matches the approved one field for field, including `suppressedCandidates`. In paired SkillOpt runs, 10 cells per variant, the new skill scored 95 against 70 for the previous one. It applied approved plans that the previous skill failed to apply, and it had no security failures where the previous skill had two.

  Skill `kibi-bootstrap` 3.2.0 rewrites the frontmatter `description` and the body. Every other frontmatter field and every resource stays the same. The candidate was drafted, evaluated and confirmed on a fresh cohort with the SkillOpt campaign workflow, using the Claude Code target host.

## 0.4.0

### Minor Changes

- f8fff87: The telemetry acceptance and remediation reports now show whether agents look requirements up before they change requirement-linked code. A new `lookup_before_first_edit` metric gives, per host session, the share of sessions that ran `kb_search` or `kb_query` (through MCP or the CLI) before their first edit of a file whose symbols implement a requirement. Sessions that edited first appear in the report with the file and its exact `.kb/usage.log` line. The data comes from opt-in hook rows that every Kibi host plugin now writes when `KIBI_DIAGNOSTIC_MODE` is set; nothing is recorded otherwise.
  - `kibi usage-metrics` / `kb_check` telemetry acceptance: new metric `lookup_before_first_edit` (threshold `>=` policy `lookupBeforeFirstEditMinimum`, default 1) with evidence `unguidedEditPaths` and `lookupOperations`. It is `not_applicable` when no host hook recorded a requirement-linked edit, so logs without hook rows are judged as before. A failed metric adds the advisory diagnostic `lookup_before_first_edit_bypassed` (rank 35).
  - `kibi usage-remediation`: one event item per session whose first linked edit had no earlier lookup, pointing at that hook row.
  - `parseTelemetryUsageLog` still returns only Kibi operation rows; hook rows stay attached to the returned array (read them with `partitionTelemetryUsage`). Remediation `logLine` values now count hook rows and blank lines, so they match the file.
  - `kibi-agent-core/hook-usage-log`: shared `appendHookUsage` / `appendHookUsageRows`, `kbUsageTrace` and `editTraces`. Hook rows (`interface: "hook"`) carry `host`, `session_id`, `hook_action` (`kb_usage` or `edited`), `kb_operation`, `path`, `path_kind` and `requirement_ids`. `hostKbOperation` recognizes MCP tool names and `kibi <route>` shell commands; `extractEditedPaths` reads `apply_patch` headers.
  - Claude Code: `edited` rows now carry the file's `requirement_ids`, and every row names its `host`. Cursor (`postToolUse`), Codex and ZCode (`PostToolUse`) and OpenCode (`tool.execute.after`) now write the same `kb_usage` and `edited` rows.

- 1012d1c: When an agent edits a file that implements a requirement, every Kibi host plugin (Claude Code, Cursor, Codex, ZCode and OpenCode) now says what that requirement must keep true and the decision behind it, not just its ID. The extra lines come from the requirement's linked facts and ADR, so agents see the constraint before they change the code. All hosts build the snippet with one shared builder in `kibi-agent-core`, so they show the same lines within each host's size limits, and none of them presents a superseded or retired requirement as current.
  - New `kibi-agent-core/snippets` export: `fileKnowledgeSnippet`, `requirementGroundingLines`, `editKnowledgeContext`, `editFocus` and `createEntitySummarizer`. Edit snippets add "`<REQ>` must keep true: …" (up to two facts linked via `constrains`, `requires_property`, `requires_predicate` or `requires_rule`) and "Decision: `<ADR>`" for the lead requirement. Read snippets keep the requirement and test lines only.
  - A superseded, deprecated or retired lead requirement gets no "must keep true" or "Decision" lines, so retired policy is not shown as current.
  - Claude Code: the `PreToolUse` edit snippet now comes from the shared builder (no change in content).
  - Cursor: `preToolUse` edit guidance and `beforeReadFile` / read guidance include the shared snippet for files whose symbols implement a requirement, followed by the existing "query before you change it" follow-up.
  - Codex: `PreToolUse` on `apply_patch` (and other edit tools) returns the snippet as `additionalContext`, for up to three changed files per call and once per file per session. Paths come from the patch's `*** Update/Add/Delete File:` headers.
  - ZCode: `PreToolUse` on edit tools returns the snippet as `additionalContext`, including "The edit is inside `<symbol>`" when the edited text is found, once per file per session.
  - OpenCode: the edit-guidance system prompt adds one "must keep true … Decision …" bullet (one fact) for the focus file, within the existing word budget.
  - `readEntitySummary` returns frontmatter `links` (plain entries read as `relates_to`; `type` and `target` in either order) merged with the entity's records in `.kb/relationships` shards, so grounding stored only in shards still reaches the snippet.
  - Session and discovery hints point at `kb_search` questions and its answer layer instead of asking for `rankingMode: "intent-v1"`, which is now the default.

### Patch Changes

- 89870c1: Bootstrap now checks its write actions before review and application, so ordinary require/forbid claims can be applied without malformed facts or semantic-inventory failures. Invalid and ungroundable claims remain cited authoring follow-ups; product intent receives priority over repository observations, and excluded or unreadable candidates are reported. Deterministic failures stop in a terminal journal with committed actions listed and guidance to re-plan; interrupted writes still recover.

  Encode polarity as an `eq` boolean `true` comparison with a require/forbid modifier in the shared strict builder, retaining existing stable IDs. Add writer-schema and semantic-inventory preflight, per-claim extraction diagnostics, task-list normalization, selection accounting, and terminal failure reporting through CLI/MCP status and result envelopes.

  Migration: KB schema 7 makes `strict-fact-shape` a blocking canonical check. Run `kibi migrate --yes`, then `kibi sync`. The migration rewrites legacy polarity-only property facts to the typed boolean encoding while preserving IDs, polarity, relationships, and document bodies. Other malformed strict facts require explicit correction; they are not treated as proof.

- 1012d1c: Kibi keeps answering from the right place when you work in a git worktree, a detached checkout, or on a machine without Prolog. Host launchers no longer pin the MCP server to the first workspace, so per-call workspace routing keeps working, and a missing Prolog runtime points at `kibi doctor` instead of failing opaquely.
  - Claude Code, Codex, Cursor and Z Code launchers set `KIBI_MCP_ATTACH_ROOT` instead of `KIBI_WORKSPACE`; the server starts in that directory without disabling routing. `KIBI_WORKSPACE`, `KIBI_PROJECT_ROOT` and `KIBI_ROOT` still pin.
  - A detached HEAD whose commit is the tip of exactly one local branch attaches that branch's KB.
  - `kb_status` reports `swipl_*` error codes with a `kibi doctor` remediation when the Prolog runtime cannot be resolved.
  - CI and publish check that the committed Claude hook bundle matches its source.

## 0.3.0

### Minor Changes

- f93dcdd: Bootstrap no longer learns only from the code. The agent now starts with a short interview: it asks where product intent already lives (issue trackers such as Jira or YouTrack, wikis, specs, decision logs), which sources are authoritative or stale, and reads them through its own connectors. The bootstrap plan records those sources and the intent claims harvested from them, so each requirement taken from a ticket or page cites it and the citation is part of the approved plan hash. Kibi still never contacts those sources itself.
  - feat(cli): `kb_plan_bootstrap` / `plan-bootstrap` accept `bootstrapContext.knowledgeSources` (id, kind, title, locator, authority, optional connector) and `bootstrapContext.intentClaims` (statement, sourceId, reference, optional excerpt). Both are normalized into `declaredContext` and bound into `planHash`. Grounded claims from authoritative or supporting sources become `req` candidates with `sourceKind: intent_claim`, citation evidence, and `text_ref: <sourceId>:<reference>`. Ungroundable claims become authoring follow-ups, stale sources are suppressed with `stale_knowledge_source`, and claims citing undeclared sources are reported as non-blocking diagnostics. A `needs_context` plan without declared sources asks for them.
  - feat(skills): `kibi-bootstrap` 3.1.0 leads with the source interview before planning; the MCP `/kibi-bootstrap` prompt and the Cursor and ZCode commands follow it.
  - docs: README, landing page, quick start, and install guide lead with a copy-paste agent setup prompt; manual installation moves behind a toggle.

- 5a217be: The Claude Code plugin can now record what an agent did around its Kibi calls, so you can see whether it looked up requirements before editing or only afterwards. MCP and CLI rows show which Kibi operations ran, but not the reads and edits between them, and that was the question the earlier data could not answer. Recording is off unless `KIBI_DIAGNOSTIC_MODE=1` is set, the same opt-in the MCP server and CLI use.
  - Append `interface: "hook"` rows to `.kb/usage.log` for reads, edits, Grep/Glob searches, `.kb/` access, Kibi calls, and Stop reminders. Each row carries `hook_action` (shown vs. silent), `path`, `path_kind`, owning `requirement_ids`, `kb_operation`, `kb_used_before`, and the host `session_id`.
  - Rows are best effort and never change hook output; files outside the knowledge surface are not recorded.
  - Rebuild `bin/hook-runner.mjs`.

### Patch Changes

- 676bac9: The Claude Code, Codex, Cursor, and ZCode plugins now tell the Kibi MCP server which workspace each call is about, so sessions working in a git worktree are answered from that worktree's branch instead of the checkout the server started in. Nothing changes for sessions that stay in one project.
  - Each plugin's pre-tool hook adds `workspaceRoot`, the agent's current Kibi workspace, to every Kibi MCP call. Claude Code, Cursor, and ZCode send it without a permission decision so the host's own approval flow is unchanged; Codex requires `permissionDecision: "allow"` for input rewrites, which does not override a server's tool approval mode.
  - `kibi-agent-core` exports `KIBI_WORKSPACE_ARGUMENT`, `isKibiMcpToolName`, and `stampKibiWorkspace` for the plugins.
  - The Codex hook parser now reads `hook_event_name`, the field Codex actually sends; the Claude and ZCode `PreToolUse` matchers include `mcp__.*__kb_.*`.
  - The ZCode launcher sets `KIBI_MCP_HOST=zcode` so its usage rows are attributed like the other hosts'.

## 0.2.1

### Patch Changes

- db5376c: Projects can now opt into impact reviews that bind a change to its exact source, knowledge decisions and trusted analysis policy. Kibi validates both staged changes and a complete pull-request diff, rejects stale review evidence, and lets agents prepare an unauthored review template through the CLI or MCP instead of hand-assembling one. Every decision and reviewer field stays for an agent to write; preparation never approves or proves anything.
  - Add versioned impact policy and review schemas, immutable review fingerprints, reviewed Python decorator coordinate migration and the trusted aggregate `check-diff` command.
  - Add the read-only `prepare-impact-review --input` CLI route and `kb_prepare_impact_review` MCP operation; regenerate the bundled operation-access catalog for the agent integrations.
  - Keep the sample CI workflow inactive until it is adopted on a protected target.

- 3d78159: Setting up Kibi no longer starts with installing SWI-Prolog. The documentation now says that Linux (x64 and arm64, glibc 2.28 or newer) and macOS (Apple silicon and Intel) need nothing beyond Node.js 22, explains the lookup order and the `KIBI_SWIPL` and `KIBI_SWIPL=system` overrides, and shows how `kibi doctor` reports which SWI-Prolog is in use and what to do when an install skipped the bundled runtime (`--omit=optional`, pnpm `supportedArchitectures`). Manual instructions stay for Alpine and native Windows. The GitHub Pages report workflows that `kibi init` can write no longer install SWI-Prolog by hand, because `npm ci` brings the bundled runtime with it.
  - kibi-cli: drop the `apt-get install swi-prolog` step from the shipped `kibi-report.yml` and `kibi-badge.yml` workflow templates.
  - kibi-cursor, kibi-claude: README and plugin manifest prerequisites say SWI-Prolog is bundled on supported platforms and only needed on `PATH` elsewhere.
  - Kibi's own CI and proof now run the pipeline-built bundled SWI-Prolog (one job keeps a system install with `KIBI_SWIPL=system`), and the release dry run follows the README quick start with the packed tarballs on four platforms; neither ships in a package.

## 0.2.0

### Minor Changes

- 35cd120: Kibi now ships a Claude Code plugin. When an agent reads or edits code that
  the knowledge base links to requirements, it sees a short note first. The
  note lists which requirements that code implements, which tests cover it, and
  which symbol the edit lands in, plus the exact Kibi call for the full detail.
  Before the agent finishes, it gets one reminder to run an impact check on
  source files it changed. The plugin says nothing in projects without Kibi,
  repeats nothing within a session, and goes quiet once the agent is already
  using Kibi. It installs straight from GitHub through the repository
  marketplace.
  - New `packages/claude` plugin (`kibi-claude`): `.claude-plugin/plugin.json`,
    `.mcp.json` with a `CLAUDE_PROJECT_DIR`-aware workspace-gated launcher,
    `hooks/hooks.json` (`SessionStart`, `PreToolUse`, `PostToolUse`, `Stop`),
    a committed self-contained hook bundle (`bin/hook-runner.mjs`, drift-tested),
    and a skills mirror whose `name` is the skill id so plugin slash commands
    stay usable.
  - Hooks never call the CLI: a line scanner indexes `.kb/symbols.yaml` and
    `.kb/symbol-coordinates.yaml` (equivalent to a full YAML parse, about 20x
    faster) and caches it in `CLAUDE_PLUGIN_DATA`, keyed by manifest size and
    mtime.
  - Session memory is an append-only journal, so concurrent hooks for parallel
    tool calls do not lose events. The Stop reminder uses non-error
    `additionalContext`, fires once per file, and respects `stop_hook_active`.
  - Root `.claude-plugin/marketplace.json` gains the required `owner` field
    (Claude Code rejected the file without it) and lists `kibi-claude`
    alongside `kibi-zcode`.
  - `scripts/sync-agent-skills.ts` gains a `claude` target.
