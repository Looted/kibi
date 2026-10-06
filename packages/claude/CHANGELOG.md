# kibi-claude

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
