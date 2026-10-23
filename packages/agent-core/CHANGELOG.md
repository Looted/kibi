# kibi-agent-core

## 0.9.0

### Minor Changes

- 180196c: The requirements signoff view now reads well on every host, not only in the hosts that draw Kibi's fenced block.
  - `kibi signoff` prints plain Markdown by default (`--format chat`): headings, quoted statements and lists that render in any chat window, and in messaging tools for agents whose replies go through one (cloud and project sessions). The path of the self-contained page `.kb/briefs/signoff/latest.html` goes to stderr, so an agent can attach or publish it next to the message. `--format md` keeps the fenced block for the OpenCode terminal card, and `KIBI_SIGNOFF_FORMAT` sets the default per host.
  - After a session writes a requirement, the Claude Code, Codex, Cursor and ZCode stop hooks ask once for the signoff view before the work is reported done, unless `kibi signoff` already ran since. A requirement the agent wrote is put to the person through the view, not retold in the agent's words.
  - `/kibi-signoff` is a new command in Claude Code, Cursor and ZCode.
  - The `kibi-decisions` and `kibi-commit-review` skills (1.2.0) say how to show the view on each host, and `kibi-usage` (2.22.0) points to `kibi signoff` when it says to leave `approved_by` to the person. The OpenCode guidance asks for `--format md` so the terminal card still renders.
  - The Claude Code plugin README shows the `.claude/settings.json` snippet that loads the plugin in cloud sessions.

## 0.8.1

### Patch Changes

- f4c5822: After a migration, the `kb_apply_plan` digest of the remaining plan now says when an automatic action in it is blocked: it waits for the actions in its `dependsOn` and needs no approval until a later plan shows it ready. Before, a blocked automatic action looked like something left to approve. The Claude hook's firm-edit question no longer prints a double full stop after a requirement title that ends in one.

  The digest's `next` text appends a count of blocked automatic actions when there are any. `firmEditConfirmation` in `kibi-agent-core/decision-guard` trims a trailing full stop from the named requirements before closing the sentence.

## 0.8.0

### Minor Changes

- 00d2871: The Codex, Cursor and ZCode hooks now act on recorded decisions while the work happens, as the Claude Code hooks do.
  - **Firm requirements before the edit.** When an edit changes code that implements a current firm requirement, the pre-edit hook tells the agent to ask the person before an edit that breaks that rule, naming the rule; once per requirement per session. These hosts cannot put the question to the person from a hook (Codex has no "ask", Cursor does not enforce one, and the ZCode adapter stays advisory), so this is a notice to the agent. Set `KIBI_CONFIRM_FIRM_EDITS=0` to turn it off.
  - **Stated rules are captured.** A prompt that reads as a rule ("must", "never", "from now on") gets the note that recording it with `kb_upsert` is part of the change: through a new `UserPromptSubmit` hook in Codex and ZCode, and in Cursor through a new `beforeSubmitPrompt` hook whose note arrives with the next pre-edit message. When a session changed source files and wrote nothing with `kb_upsert`, the stop hook asks once for the decision to be recorded (Codex continues the turn with it; Cursor adds it to the stop follow-up; ZCode adds it to the Stop context).
  - **Codex unlinked-file candidates** are ranked by the latest prompt's words as well as the path's.

  `kibi-agent-core`: new `kibi-agent-core/decision-guard` entry with the host-neutral pieces (`firmRequirementsTouched`, `firmEditNotice`, `confirmFirmEdits`, the prompt and stop notes, and per-session markers). `kibi-claude` now imports its firm-edit and capture texts from it; behavior is unchanged.

## 0.7.0

### Minor Changes

- b9ec91d: The Claude Code hooks now act on recorded decisions while the work happens, not only after it.
  - **Firm requirements are confirmed before the edit.** When an `Edit`, `MultiEdit`, `Write` or in-place shell write lands in a symbol that implements a current firm requirement (marked `firmness: firm`, or written by a person rather than an agent), the `PreToolUse` hook returns `permissionDecision: "ask"` with the symbol and requirement in the prompt, so the person decides before the code changes. Once an edit is allowed, that requirement is not asked about again in the session; a declined edit is asked again. The agent is told that a declined edit means the requirement stands. In a `claude -p` run with nobody to answer, Claude Code refuses the edit and the agent reads the reason. Set `KIBI_CONFIRM_FIRM_EDITS=0` to turn the prompt off.
  - **Stated rules are captured.** A new `UserPromptSubmit` hook tells the agent, when a prompt reads as a rule ("must", "never", "from now on"), that recording it with `kb_upsert` is part of the change. At `Stop`, a session that changed source files and wrote nothing to the knowledge base is asked once to record the decision or say there was none.
  - **An unlinked file is no longer an all-clear.** The discovery note for a file no symbol links ranks candidate requirements by the latest prompt's words as well as the path's, and, when nothing matches, says that nothing recorded is known to cover the file and that a decision made for it is recorded before the work is reported done (Codex shows the same note).

  `kibi-agent-core`: `requestTopicWords`; `rankRequirementCandidates` and `requirementCandidatesForPath` take optional request words (a requirement sharing only request words needs two of them).

## 0.6.0

### Minor Changes

- d960810: A file with no linked symbols is no longer read as a file no rule covers. Before such a file is edited, the Claude Code and Codex hooks name the current requirements whose titles share the file's path words, and a `kb_check` scoped to the file reports the same candidates, so an agent changing `coach-dashboard.html` is pointed at the coach inbox requirement instead of concluding there is no knowledge-base impact. Agents are also told that recording the behavior a change adds is part of finishing it and needs no permission.
  - `kibi-agent-core`: new `requirement-candidates` module (`pathTopicWords`, `rankRequirementCandidates`, `requirementCandidatesForPath`); `unownedSourceNote` takes the candidates, says that no link does not mean no rule, and drops candidates rather than exceed the snippet budget.
  - `kibi-cli`: an impact-enabled `kb_check` emits `source_file_unowned` (`info`, non-blocking) for each file in `sourceFiles` that no manifest symbol links to a requirement, including files Kibi does not extract symbols from (HTML templates), with `evidence.candidates`. The unlinked-symbol `symbol_semantic_review_needed` suggestion now says recording the behavior needs no permission.
  - `kibi-claude`, `kibi-codex`: the unlinked-file edit note names candidate requirements. The Claude Code session-start context no longer says unlinked files get no context, and says recording new behavior needs no permission; ZCode's session-start context says the same.
  - `kibi-usage` skill 2.19.0: record new behavior without asking; confirm the candidates an unlinked-file note names.

## 0.5.0

### Minor Changes

- cd4723e: Rules a person wrote or imported are no longer treated as an agent's own default choice when they carry no `firmness`. A requirement or ADR without `firmness` now reads as `firm` unless an agent wrote it, so an agent asks before replacing it, and bootstrap records the rules it imports from your documents as firm with a reference to the passage. The usage skill now treats any request that conflicts with a recorded rule as a question: the agent names the rule and asks, whatever the rule's firmness, and changes it only when the person says so. Run `kibi migrate --yes` to move a KB to schema 10; existing supersedes are acknowledged and no source file is rewritten.
  - `effectiveFirmness` takes the entity's origin: an absent value is `default` for `origin.kind: agent` and `firm` otherwise (human, import, migration or no origin). `kb_query` rows and `kb_search` answers show the derived value.
  - Hook snippets label a current firm decision `[firm: ask before changing]` (was `[firm]`) and no longer label retired decisions. The Claude Code and ZCode session-start context adds one sentence: a request that conflicts with a recorded requirement or ADR is a question, so the agent names the rule and asks before changing the code or the rule.
  - `decision-firm-superseded` applies to origin-derived firm targets; `decision-firm-unreferenced` still applies only to an explicit `firmness: firm`.
  - KB schema 10: the `firmness-from-origin-v10` step and the automatic `firm_supersede_acknowledge` plan action record pre-existing supersedes of such decisions in `.kb/manifest.json` `firmSupersedeAcknowledged` (`FROM -> TO`); only listed edges are exempt, and never an explicitly firm target.
  - Bootstrap intent-claim and normative-markdown requirement steps write `origin: {kind: import, ref}` and `firmness: firm`.
  - Skills: `kibi-usage` 2.17.0 (conflicting request means ask; firmness from origin; write firmness explicitly), `kibi-bootstrap` 3.13.0 (imported rules are firm imports, including hand-authored follow-ups).

## 0.4.0

### Minor Changes

- 5ad4319: Requirements and ADRs can now say how firmly they were decided, so a later agent knows whether it may change a decision on evidence or must ask a human first. Mark a rule a person stated `firmness: firm` (it must cite their words in `origin.ref`, or `approval_ref` on a requirement), a guess `firmness: exploratory`, and leave the rest unset (`default`). `kibi check` now blocks a firm decision without that reference (Kibi checks that it is present, not that it is genuine), a decision that is not firm superseding a firm one, and a current requirement or ADR that supersedes another without a `## Why this changed` section naming the evidence. `kb_search` and `kb_query` show the firmness of each decision; the editor hooks label firm and exploratory ones.

  Migration: this is a hard rollout with KB schema 9. Run `kibi migrate --yes` once; it records every supersede edge that predates the rule in the manifest (`supersedesReasonAcknowledged`, as `FROM -> TO`), so those do not block, and an advisory `supersedes-reason-acknowledged` diagnostic counts them. No source file is rewritten and no reason is invented. New supersedes must explain themselves, including a new one on an acknowledged decision.

  Technical summary: new optional `firmness` property (`firm` | `default` | `exploratory`) on `req` and `adr` in the JSON schema, the `kb_upsert` input schema, the markdown extractor and the Prolog entity schema; the schema rejects it on other types. `kb_upsert` judges firmness as it will be written: an update that omits `firmness` keeps the stored value (also in the compiled store), and a write that leaves a decision firm without a reference is rejected. `decision-firm-superseded` checks every superseder, retired ones included, so a chain cannot launder a firm decision; shard edges from deleted entities are ignored. New rules `decision-firm-unreferenced`, `decision-firm-superseded` and `supersedes-reason-missing` (canonical, blocking) and `supersedes-reason-acknowledged` (info) read authored requirements, ADRs, front-matter `supersedes` links and relationship shards, so they agree before a sync. `LATEST_KB_SCHEMA_VERSION` is 9; the `decision-firmness-v9` migration step and the `supersedes-reason-acknowledge` fragment action write only `.kb/manifest.json`. Search answer rows and `kb_query` results carry the effective firmness of requirements and ADRs; hook snippets append `[firm]` or `[exploratory]`. The `kibi-usage` skill gains a "Decision firmness" section.

## 0.3.1

### Patch Changes

- dbfe490: Claude Code: when the agent reads a requirement-linked file and then edits it, the edit hook now still says what the lead requirement must keep true (its linked facts and decision) and names the `kb_check` impact call, alongside the symbol the edit lands in; before, the earlier read suppressed everything but that one line, so an agent that read first never saw the facts or the check. A `SessionStart` after a compact or clear resets the session's "already shown" memory, so the next read or edit of a linked file shows its snippet again instead of returning nothing into a context that no longer holds it; a resume keeps the memory. Codex: an `apply_patch` (or `Write`/`Edit`) to a source file no symbol links to a requirement now gets the same one-time discovery note as Claude Code, with the `kb_search` call that finds requirements for it (an unreadable manifest is reported once instead), and `Stop` now reminds of the `kb_check` impact call after `apply_patch` edits, which were not tracked because the patch names its files only in the patch text.

  Technical summary: `kibi-agent-core/snippets` gains `editKnowledgeUpdate` (focus line, `requirementGroundingLines`, impact-check line), the shared `unownedSourceNote` and `unreadableManifestNote` (re-exported by `kibi-claude`), and an optional `noteFor` callback on `editKnowledgeContext` that claims the same once-per-file slot for a file without a snippet. The Claude session journal gets a `context_reset` event that clears the shown, notice and explored sets but keeps pending edits and their reminders; `dispatchHook` appends it for `source: "compact" | "clear"`. The Codex runner passes `noteFor` from the knowledge index's manifest state and tracks dirty paths (and direct `.kb/` edits) through `extractEditedPaths`, which reads `apply_patch` headers.

## 0.3.0

### Minor Changes

- e00adf2: Projects set up with kibi-cli before 2.18.0 keep every symbol on one flow-sequence line of `.kb/symbols.yaml`, and the host hooks read none of it: the Claude Code hooks told agents that no symbol in a linked file was tied to a requirement, on every edit, when the opposite was true. The shared hook scanner now reads flow-layout manifests like block ones, the Claude Code edit hook no longer calls a file unowned when the manifest is unreadable or when the coordinate artifact binds a symbol to it that the scanner could not read (it says once per session that the manifest could not be read instead), and a plain `kibi sync` rewrites such a manifest in block layout once, keeping comments and order.

  Technical summary: `kibi-agent-core` `knowledge-index` gains a flow-collection reader for `symbols: [ … ]` sections (single or multi-line, CRLF safe) and for flow values inside block records, the index reports `manifest` (`missing` | `empty` | `indexed` | `unreadable`), `coordinateFiles` and `unlinkedFiles`, and the cache format moves to v2 so stale indexes rebuild. `kibi-claude` adds `unreadableManifestNote` (once per session) in place of `unownedSourceNote` for an unreadable manifest or a coordinate-bound file with no indexed record; the Claude and Codex hook bundles are rebuilt. `kibi sync` calls `normalizeManifestLayout` on every tracked symbol manifest ahead of its no-op fast path, through the same `blockifySymbolManifest` helper `kb_upsert`'s manifest writer uses.

## 0.2.1

### Patch Changes

- 2a2b2db: Every Kibi package page on npm now has a README that says what the package is for and how to install it, and links to the documentation site. Package metadata now points npm's "Homepage" link at the documentation site, its "Repository" link at the package's own folder on GitHub, and adds an "Issues" link.

  Adds READMEs to `kibi-cli`, `kibi-mcp`, `kibi-core`, `kibi-runtime`, `kibi-agent-core`, `kibi-codex`, `kibi-plugin-builtin` and `kibi-plugin-sdk`. Sets `homepage` to https://looted.github.io/kibi/, adds `repository.directory` and `bugs` to every package, and refreshes the `kibi-plugin-treesitter` integrity manifest and source-analyzer approval for its changed `package.json`.

## 0.2.0

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

- 15356de: Host hooks no longer ask for a `kb_check` after a `kb_upsert` dry run. A dry run only validates, so the Cursor, Codex, ZCode and OpenCode hooks now count it as validation rather than a KB write.
  - `extractKbMcpToolCall` reports `kb_upsert` with `dryRun: true` as `kb_validate_upsert`.
  - OpenCode's freshness evidence records a dry-run upsert as `kb_validate_upsert`, which carries no mutation evidence.

## 0.1.1

### Patch Changes

- 676bac9: The Claude Code, Codex, Cursor, and ZCode plugins now tell the Kibi MCP server which workspace each call is about, so sessions working in a git worktree are answered from that worktree's branch instead of the checkout the server started in. Nothing changes for sessions that stay in one project.
  - Each plugin's pre-tool hook adds `workspaceRoot`, the agent's current Kibi workspace, to every Kibi MCP call. Claude Code, Cursor, and ZCode send it without a permission decision so the host's own approval flow is unchanged; Codex requires `permissionDecision: "allow"` for input rewrites, which does not override a server's tool approval mode.
  - `kibi-agent-core` exports `KIBI_WORKSPACE_ARGUMENT`, `isKibiMcpToolName`, and `stampKibiWorkspace` for the plugins.
  - The Codex hook parser now reads `hook_event_name`, the field Codex actually sends; the Claude and ZCode `PreToolUse` matchers include `mcp__.*__kb_.*`.
  - The ZCode launcher sets `KIBI_MCP_HOST=zcode` so its usage rows are attributed like the other hosts'.

## 0.1.0

### Minor Changes

- 5a06c03: Kibi's agent plugins now share one fast, consistent implementation for source-path classification, Kibi MCP tool recognition, and symbol-manifest indexing. Codex and ZCode now recognize production code outside `src/`, while Cursor reuses the same size-and-mtime-keyed scanner as Claude instead of parsing the full symbol manifest before an edit.
  - Add `kibi-agent-core` as the common Node 18-compatible hook-helper package.
  - Keep host adapters thin while preserving their host-specific event and state contracts.
  - Replace Cursor's YAML parser dependency with the shared cached line scanner.

## 0.0.0

- Initial shared hook-helper package.
