# kibi-agent-core

## 0.16.0

### Minor Changes

- 71f0537: Agents now get Kibi's change steps where they actually look, and stop asking you about things that are not decisions. The session brief every Kibi surface opens with says when to take each step: record a rule you state in the same turn, without asking, and run the linked tests and `kb_check` with `changed: true` before the final message. `kibi init` now builds the `AGENTS.md` section from those same lines, so agents without a Kibi plugin read the same steps. A rule you state is approved by your own words: `kb_record` no longer asks you to confirm its statement, and the stop reminder skips the signoff view when that is all a session recorded. Run `kibi init` again to refresh the `AGENTS.md` section; `kibi doctor` reports it as outdated until then.

  Technical summary:

  - `kibi-agent-core`: `SESSION_BRIEF_LINES` reworded (record in the same turn, no permission needed; tests and `kb_check` with `changed: true` before the final message); the no-Git variant replaces that step. The firm-edit notices and the signoff stop reminder say a keeps receipt needs no approval from the person and that a rule recorded in their own words needs no signoff view.
  - `kibi-cli`: `agentInstructionsFor` builds the managed `AGENTS.md` section from `sessionBriefFor`, adds whom to ask, firm-code edits, committing and the skill line; `captureFollowUp` no longer lists a statement `signoff` in `approvalsNeeded` (`CaptureApproval.kind` drops `signoff`); `kb_review_firm_edit`'s description says a receipt needs no approval.
  - Skills: `kibi-usage` 3.2.0 (load-trigger description, the ask-only-for-decisions rule, call shapes, `nextActions` sent as returned, tests and changed check before the final message, levels, commit only when committing, new `resources/proof-first.md`); `kibi-decisions` 1.16.0 ("What needs the person, and what does not", level-aware recording, shorter validation list, inline `kb_review_firm_edit` shape); `recording.md` "After kb_record"; `workflows.md` recipes record through `kb_record` and the closeout contract becomes "Finishing a change"; `hook-snippets.md` documents the changed check line and `symbol_semantic_review_needed`.
  - KB: `REQ-kb-upsert-approvals-needed` no longer lists the statement signoff; new `REQ-init-agent-instructions-carry-brief` and `REQ-kibi-skills-ask-only-for-decisions` with scenarios and tests.

- 708d968: Hook notes on every host waste fewer turns on rules that are already recorded.

  - A prompt sentence that only restates a current requirement (every topic word, number and negation already in its title or one sentence of its statement) no longer triggers the rule note or the stop-time capture reminder. A new number, term or negation still reads as a rule.
  - The capture reminder and the rule template say that `kb_record` returns every remaining step and approval at once, and that the approvals go to the person in one question.
  - A busy file's snippet names the requirements it cannot show in full ("Also linked (N more): ...") before it drops them on the tightest budget.

- 8cb077c: Kibi now works in a directory that is not inside a Git repository. Before, `kibi init` there failed with a long diagnostic that led with `KIBI_BRANCH`, and following it left every later command failing again. Now `kibi init` sets up the workspace, and search, query, record, upsert, check and sync work on one knowledge store for the directory, reading every `.kb` file on disk as input.

  Kibi says what is missing instead of failing: `kibi init`, `kibi doctor`, the agent hosts' session start, `kibi status`, `kibi check` and the first MCP result of a session carry a `no_git_repository` advisory that names what is off (the commit gate, Git hooks, impact review and per-branch knowledge) and recommends `git init`, then `kibi init`. The agent instructions and the session brief say to finish each change with `kibi check`. The features that need Git (`kibi check --staged`, `kibi check-generated --staged`, `kibi check-diff`, `kibi hooks install`, `kibi branch ensure` / `migrate`, `kibi gc`, impact review, `kibi signoff`) refuse with the new code `GIT_REQUIRED` and name the Git-free alternative.

  After `git init`, the first Kibi call carries the knowledge over to the new branch (pending-source receipts bind the untracked `.kb` files) and keeps the old store under `.kb/recovery/no-git-adoption/`. A `.git` entry that Git cannot read is still a failure, now coded `GIT_REPOSITORY_UNREADABLE`, so knowledge is never split from the branch it belongs to. The error reference has a "Working without Git" entry, and usage telemetry records whether a workspace has version control (`vcs`, `vcs_reason`), never a path.

  Technical summary: `kibi-agent-core` adds `version-control` (`findRepositoryMarker`, `noGitAdvisory`, `noGitAdoptionNotice`, `NO_GIT_UNAVAILABLE_FEATURES`) and `checkoutSessionNote` / `workspaceTelemetryVcs` in `checkout-hooks`, which every host's session start now uses. The branch resolver attaches the reserved store `kibi-internal/no-git` (refused as a `KIBI_BRANCH` value) when the workspace probe finds no repository. `kibi-cli` adds `vcs/` (workspace probe, source inventory, Git boundary, adoption, advisory) and the `GitRequired` operation error, re-exported through `kibi-runtime`. `NOT_A_GIT_REPO` is replaced by `GIT_REPOSITORY_UNREADABLE`.

- da54a73: The person now decides two changes the agent used to be able to make alone: changing the project's Kibi level, and lowering a requirement's `required_evidence`.

  - **Agent hooks.** An edit of the setting that changes the Kibi level, and an edit or `kb_upsert` call that lowers a requirement's `required_evidence`, are put to the person as far as each host allows:
    - Claude Code and Antigravity show a permission prompt that names the change.
    - Codex, Cursor and ZCode tell the agent to ask the person first, and grant no permission for the call.
    - OpenCode stops the change once per session with that notice, so the agent asks.
    - Vibe, which has no pre-tool hook, tells the agent after the edit or `kb_upsert` to ask the person and undo the change unless they agree. Its post-tool hook now also matches `kb_upsert`.
  - **Signoff.** `kibi signoff` shows the project's Kibi level in the summary and the questions view. The summary lists a change of the level against the base commit, and each changed requirement whose evidence floor is now lower, under "Decisions only you make". The JSON view carries them as `level` and `decisions`.

- c1fe951: Kibi levels: a project chooses how hard Kibi holds the agent to its requirements.

  - `test` (the default, and what every project ran before): Kibi records requirements, links them to code and catches contradictions, and also asks for the scenarios, linked tests and proofs that show each requirement holds.
  - `remember`: Kibi records requirements, links them to code and catches contradictions, and asks for no scenarios, tests or proofs.

  The level is `kibi.level` in the root `package.json`, or `level` in `.kb/setup.json` when there is no root `package.json`. Only `kibi init` writes it: at a terminal it asks the person (test recommended); without one it records `--level remember|test`, or `test`. No MCP tool or CLI JSON route writes it, and an unknown value is reported by `kibi check` and read as `test`. The `kibi-bootstrap` skill now has the agent ask the person for the level before it runs `kibi init --level`.

  At `remember`:

  - A plain `kibi check` and the commit gate run the knowledge rules and skip the verification rules (`evidence-floor`, `symbol-coverage`, `must-priority-coverage`, `must-positive-scenario`, `proof-contract-claims`, `proof-contract-symbols`). An explicit `--rules` selection still runs what it names.
  - A current requirement with `required_evidence: tested` or `proved` is reported by the new non-blocking rule `required-evidence-above-level`, and `kb_upsert`/`kb_record` refuse a write that raises `required_evidence` to `tested` or `proved` (`LEVEL_DOES_NOT_CHECK_EVIDENCE`) until a person chooses `test`.
  - A requirement write's `nextActions` still list the `kb_model` and pair-review steps, and no scenario, test or proof step.
  - The MCP server does not list `kb_ingest_proof`, and `kb_skills` does not offer `kibi-provable-code` (it still loads by id).

  At `test`, `kibi check --staged` now reports, and does not refuse, an `evidence-floor` finding on a requirement the commit adds; a requirement the commit changes still blocks.

  KB schema 20: `kibi migrate` raises the schema and writes no level, so an existing project stays at `test`. The upgrade notes say how to choose `remember`.

- 1743450: Reading or searching linked code now shows the requirements of the code in view in every host. When the agent reads a line range, runs a search, or reads files through the shell (`cat`, `sed -n`, `head`, `tail`, `grep -n`, `rg`), the hook adds one compact row per requirement of the symbols in view (id, firmness, title and the symbol that implements it), the focused symbol's requirements first. A shell command that reads several linked files gets rows from each of them. A search gets rows only when its matches fall inside symbols that implement at most 6 requirements, and shows the 3 with the most matching lines; a file-name search (Glob) gets none. A whole-file read of a file with more than 5 requirements names their ids on one line.

  Rows stay small: at most 3 per event (5 for a whole file), at most 10 rows and 2,300 characters per session, and each requirement once per session, counting what Kibi tool results already showed; a firm requirement of the focused symbol is shown once. The one-time search tip is skipped when the first search already shows rows. Codex, ZCode, OpenCode and Vibe, which had no read context before, now add the rows too (ZCode's PreToolUse matcher adds `Read`, `Grep` and `Bash`; Vibe's post_tool hook adds `grep` and `bash`), and Cursor's read snippet after a Read is replaced by the same rows.

  Technical summary: new `kibi-agent-core/read-context` (`readContext`, `hookReadRows`, `resolveReadViews`, `searchToolRead`, `globFilter`) and shell read parsing in `kibi-agent-core/bash-command` (`commandReadViews`, `shellToolReadViews`, `shellToolCommand`); each host hook builds its rows with them.

- 0851175: Adds a scoped decision retriever to `kibi-agent-core` (`kibi-agent-core/retrieval`). It ranks requirements and ADRs as decision cards over an inverted index, credits each decision with the words of the facts it links and the symbols that implement it, and reads no Prolog, so hooks and the MCP server can both call it.

  - Scope comes before ranking. A decision is in this workspace when it links to a file that exists here, or when its knowledge source has at least two decisions linked here. A decision linked only to files that are missing here belongs to another scope and is only counted. A source of at least three decisions with none linked here is distant and keeps half its score. Every other decision is unscoped and keeps 85% of its score.
  - A superseded decision folds into the current end of its chain. A decision whose title shares at least 80% of its words with a higher-ranked one folds into it, unless either is firm or only one of the two is negated. A folded decision stays listed on its card.
  - Each card is one line of at most 300 characters. The result also lists the question's words that no returned decision contains.
  - An embedding provider's similarity scores can be fused with the word ranking by reciprocal rank. Without a provider, the ranking uses words alone.

  `kb_search` now matches a word and its plural (`tags` and `tag`, `ids` and `id`).

  Adds an offline replay harness (`scripts/retrieval-eval/`) with question, holdout, edit and omission case sets. It compares today's search and edit hook with the new retriever.

- 4cddea5: `kb_search` and `kibi search` now answer a question with decisions: five one-line cards for the requirements and ADRs that match it best, and up to seven more decisions related by meaning.

  - Each card is one line of at most 300 characters. The words of the question are ranked over each decision's title, statement, facts and implementing symbols, and decisions scoped to the files you pass rank first. Near-identical decisions share one card, which lists the ones folded into it (`fields: "full"`).
  - When the search-hints plugin is installed, its meaning ranking is fused into every search instead of being asked only for weak answers, and the decisions it finds that are not already a card are listed beside the cards. A decision is credited with the meaning of the scenarios, tests and facts it links. Without the plugin, or when it fails, the words rank alone.
  - A requirement is named as governing only when its card covers at least half of the question. When no card does, the answer is weak: it names no governing requirement, lists the question's words that no decision holds, and never says that nothing governs.
  - Passing `type` (`fact`, `scenario`, `test`, `symbol`) searches those entities as before, ten rows by default.
  - `kibi.search-hints.v1` providers are now asked to score every decision and the entities it links, up to 50,000 entities per call (`SEARCH_HINTS_MAX_LIMIT`), instead of returning at most 20 hints.

### Patch Changes

- 4f85076: The Claude Code, Codex, Cursor and ZCode pre-tool hooks no longer replace a `workspaceRoot` that the agent passes on a Kibi MCP call. Before, a call that named another git worktree was silently answered from the session's checkout, so a read returned the wrong branch and a write would have landed in the session's knowledge base. The hooks now add the session's workspace only to a call that carries none, which is what the kibi-usage skill tells agents to do for a worktree.

  `stampKibiWorkspace` returns undefined when the tool input already carries a non-blank string `workspaceRoot`; a blank or non-string value is still replaced. The four host hook runners return their silent result for a Kibi MCP call that names its own workspace instead of an `updatedInput` rewrite, and their committed hook bundles are regenerated. REQ-agent-hosts-kb-call-workspace-stamp records the rule with a positive and a failure-side scenario, verified by the new TEST-agent-hosts-kb-call-workspace-stamp, which runs the stamping tests of the helper and of the four host runners.

- df6dbfd: Fixes across setup guard rails, `kb_search`, host integrations, coverage/modeling parity, and release gates ahead of 2026.11.6. Staged commit checks now read the Kibi level from the staged snapshot, shell hooks and non-interactive `kibi init --level` protect recorded Kibi levels and `required_evidence` floors consistently across all hosts, `kb_search` respects branch-store freshness, marks close governing matches as candidates, filters low-similarity meaning noise, and renders readable CLI tables, and `kibi-antigravity` / `kibi-vibe` hooks and MCP launchers work reliably in both workspace and user-global installs.

  Technical summary:

  - Setup & levels: `kibi check --staged` reads `kibi.level` from the captured staged/base Git trees and notes level changes; `kibi init --level` refuses to overwrite a different recorded level non-interactively without `--change-level` and warns instead of crashing on malformed `package.json`; `kibi check` prints unknown-level diagnostics in text and JSON, filters verification quality reviews (`coverage_depth_review`, `logical_coverage_review`) at level `remember`; `kibi doctor` reports the Kibi level and marks Git hooks not applicable outside Git; `kibi migrate` previews managed hook refreshes on schema upgrades and refreshes outdated Kibi-managed blocks in `AGENTS.md`/`CLAUDE.md`/`GEMINI.md`; `kibi signoff` compares against merge-base on clean branches; `kibi-runtime` filters `kibi-provable-code` from `kb_skills list` at `remember`; `kibi-mcp` server instructions omit test-run prompts at `remember`; `evidence-floor` guidance asks the person instead of lowering floors; `result-budget` keeps a truncated prefix and `source` hint for oversized single fields; `kibi init` records fixed telemetry error categories on every refusal.
  - Guard rails & hosts: `kibi-agent-core` parses requirement frontmatter with `yaml` (fail-safe on malformed YAML), resolves requirements by frontmatter `id`, handles Codex `apply_patch` multi-hunk edits, guards `kb_delete`/`kb_apply_plan` and shell `kibi init --level` / file writes, bounds regex execution in read-context matching, fixes shell redirection (`2>file`), destructive command detection, and `sed`/`head`/`tail`/`grep` read parsing, and recognizes `mcp_<server>.<tool>` tool names. `kibi-antigravity` returns `allow` (never spurious `ask` or `auto_approve`) as `PreToolUse` pass-through, hardens Windows `run-node.cmd` and `hooks.json` quoting, scopes `kb-tools.ts` `workspaceRoot` injection to Kibi MCP servers, uses `0700` uid-checked temp state dirs, and adds hook-bundle drift checks in CI/publish workflows. `kibi-vibe` supports deferred MCP `roots/list` + `workspaceRoot` attach for user-scope installs, guards `bash` edits and `mcp_kibi.kb_*` / `kb_record` calls, and secures temp launcher logs/state. `kibi-cursor` delivers held rule-capture notes on any next pre-tool call. `kibi-usage` skill (`3.2.1`) documents read/search hook rows across all host mirrors.
  - Search: `kb_search` cross-checks decision corpus cards and seeds against the attached branch store (never naming un-ingested or corpus-superseded requirements as `Governing`, emitting stale metadata when corpus and store diverge), flags close top governing requirements as `ambiguous` with candidate wording (`REQ-kb-search-close-matches-candidates`), applies a `MIN_MEANING_SCORE` floor (`0.22`), restores `kb_query` title-listing `nextActions` on weak/abstained searches, fixes empty-KB notes, renders card lines and digest headers in CLI tables, places `[retired]`/`[superseded]`/`[closed]` beside card IDs while preserving prohibition clauses on truncation, excludes rationale/context sections from governing coverage, seeds folded decisions by parent card coverage, and rejects whitespace-only queries with `VALIDATION_FAILED`.
  - Modeling, coverage, bootstrap & gates: `kb_coverage` preserves caller `limit` when all rows fit within the result budget so CLI and MCP return identical `repairPlanId` and `legacyMigrationPlan.planId`; `kb_model` preserves existing requirement `title`, `status`, `text_ref` and `tags` when targeting an existing `requirementId` (fixing `kb_record(saidBy: "user")` -> `kb_model` -> `kb_upsert` on firm requirements); bootstrap skips `<!-- BEGIN/END kibi-managed -->` blocks in `AGENTS.md`; `ci-proof-reuse.ts` and `proof.yml` resolve `kibi-requirement-proof` from `derived_from` on member-reused trains and fall back to full proof if the report artifact is missing; merge-train treats newline-containing check lists (including single-entry YAML block scalars) as one check per line; `owner-findings` marks unrecorded extracted declarations as `new`; Playwright narrowing regex-escapes bound spec paths; `plugin-search-hints` and `plugin-treesitter` asset verifiers accept `-dev.` stamped prerelease versions; release docs list all post-`version-packages` refresh steps.

## 0.15.0

### Minor Changes

- 42d3197: Recording a rule the person stated now takes one `kb_upsert` call with the reason in a `why` field, and that call leaves no `kb_check` finding it could have avoided. What only later work can settle (the subject a claim is about, a scenario and a test, a proof) comes back as `nextActions` entries with ready inputs instead of warnings. The write also names the current requirements on the same terms, so an older version of a rule is superseded instead of left beside the new one.

  - `kb_upsert` (MCP and `kibi upsert`) accepts `why` on a requirement. It is written to `rationale` and to the body's reason section (its `## Context`, or an existing `## Why` or `## Rationale` section), and `origin.ref` becomes the `## Source` section of a body that has none. An update without `document.body` revises the stored file. A `why` that is not text, disagrees with a `rationale` sent beside it, or is sent on another entity type is refused with `VALIDATION_FAILED` (rule `requirement_why_invalid`).
  - A requirement write that sends `document.body` without `semantic_text`, for a requirement with no stored `semantic_text`, records the body's statement as `semantic_text`, so the server-filled proposition inventory matches the statement the file holds. Before, such a write derived the inventory from the title and `kibi check --staged` refused the new requirement.
  - A committed requirement write returns `nextActions` (`operation`, `code`, `input`, `reason`, `required`) for `entity-context-missing`, `claim-subject-missing` (the stored inventory with the closest existing subject filled in, alternatives named), and, for a requirement without a test, `evidence-floor` and `symbol-coverage` (a scenario and its `specified_by` link when the requirement has none, a test of its scenarios, `covered_by` per uncovered implementing symbol, and a `kibi prove` step when the floor is `tested` or `proved`). The warnings those steps replace are no longer listed in `warnings`.
  - The write result's `relatedRequirements` lists up to five other current requirements whose title and statement share most of its topic words (numbers do not count, so a floor of 9 matches a new floor of 10), as `{id, statement}`.
  - The rule capture template the Claude Code, Codex, Cursor and ZCode hooks give after a rule prompt carries `why` and ends by pointing at the result's `nextActions`. When the sentence that states the rule, or the next one, gives a reason with "because" or "so that", the prompt-time rule note and the template ask the agent to put that reason in `why`.
  - The generated `kibi-usage` field reference lists `why`.

- 4e808b8: An edit of code that implements a current firm requirement now needs the agent's recorded verdict before it can be committed, on every host and without one. `kibi check --staged` blocks a staged change inside such a symbol (`firm_edit_unreviewed`) until each edited symbol has a current `keeps` receipt, written by the new `kibi review-firm-edit` command to `.kb/firm-edit-reviews/<REQ-id>/<file>--<symbol>.json`. A receipt is bound to the requirement's statement and the symbol's code when it is recorded, so it stops matching when either changes. A `changes` verdict keeps the change blocked (`firm_edit_breaks_rule`) until the requirement is superseded with the person's words. The finding prints the exact input to pipe to the command, and `kb_check`'s impact diagnostics report the same findings during the work.

  Receipts are the agent's judgment, never the person's approval: `kibi signoff` lists each one under its requirement as judged by the agent, not approved by you. The Claude Code PreToolUse hook no longer asks about an edit whose symbols all have a current `keeps` receipt, and when nobody can answer its question it tells the agent how to record one and retry. The Codex, Cursor and ZCode pre-edit notices name the command. `KIBI_CONFIRM_FIRM_EDITS=0` still turns off only the hook question, never the staged gate. The command is CLI-only, so the MCP tool list does not grow.

- c180e2d: A rule someone states is now recorded with one small call: `kb_record` (CLI `kibi record --input -`) takes the rule, why it exists, who said it, their words and the code that implements it, and answers with whether a commit would pass. The agent no longer has to read the full `kb_upsert` schema and assemble a requirement payload by hand for a first write: on a test rule the call is 238 characters against a 1,608-character tool definition, where the same write through `kb_upsert` was a 436-character payload against a 10,511-character one.

  - `kb_record` inputs: `statement`, `why`, `saidBy` (`user`, `maintainer` or `agent`), optional `quote`, `code` (`[{file, symbol}]`), optional `test` and `dryRun`.
  - It builds exactly one `kb_upsert` payload (a new open requirement, `firm` with a human origin and the quote as `origin.ref` when a person stated it, `default` with an agent origin when the agent chose it; the code as `implementedBy`; a test as `verified_by` and `coveredBy`) and runs it through `kb_upsert` unchanged: the same schema, advisor, firmness, approval and write path. It never sets `origin.approved_by`.
  - It then runs `kb_check` with `changed: true` for the files the code names and returns that verdict (`commitAllowed`, each finding with `blocks`) and the remaining steps as `nextActions`. The result equals `kb_upsert` of the returned payload followed by that check.
  - `dryRun: true` returns the payload and `kb_upsert`'s dry run and writes nothing.
  - Facts, relationships, proof contracts, updates and other modeling stay on `kb_upsert`; `kb_record` refuses those fields and says so.
  - `kb_record` is an MCP tool in every profile, including `core`. The `kb_upsert` description is shorter and points first writes at `kb_record`.
  - Advertised MCP schemas are smaller, so the new tool costs less than it saves: every choice among strings is written as `enum` instead of `anyOf` of `const`, and `kb_check` advertises `rules` as plain strings (an unknown rule name is still refused, with the allowed names). The six-tool list's model-facing size went from 26,420 characters to 21,320 with kb_record added (an empty knowledge base: 28,610), and every input is validated exactly as before.
  - The capture template the plugins show when a person states a rule (Claude Code, Codex, Cursor, OpenCode, ZCode, and the no-harness session brief) is now a `kb_record` call, and the `kibi-usage` and `kibi-decisions` skills record a new rule with `kb_record`. Every plugin counts a `kb_record` call, MCP or CLI, as the requirement write it asks for, and a `kb_record` dry run as a preview.

  Migration: nothing to change. Existing `kb_upsert` calls behave as before. Hosts that pin a tool list by name need to add `kb_record` to it.

- 5c0f71b: Agents are no longer told that a request sets a rule just because it describes today's behavior. A prompt such as "API keys currently never expire; add a 90-day expiry" used to trigger the "this request reads as a rule" note on "never". Now "never" and "always" count only as an instruction ("Never log keys", "make sure we always ..."), questions and code are ignored, and "must", "from now on" and the other deontic phrases count as before. The session-start text, the `kibi init` agent instructions and the kibi-usage and kibi-decisions skills now also say what a conflict is: a request that would make a recorded requirement false, including narrowing it or adding an exception. Touching the same code is not a conflict, and an agent that cannot tell asks.

  `statedRule` (kibi-agent-core) splits the prompt into sentences with fenced and inline code removed, skips questions other than requests ("Can you make sure ...?"), and matches `never`/`always` only at the start of a clause or after "make sure"/"ensure". The Claude session-start context is reworded to stay within its 1,200-character budget. kibi-usage 2.49.0, kibi-decisions 1.11.0. Run `kibi init` to refresh the managed Kibi section of `AGENTS.md`.

- be9cc7c: No behaviour change for users of the Claude Code, Codex, ZCode or Cursor plugins: their hooks now share one copy of the workspace opt-in check and the hook input reader instead of keeping their own.

  - `kibi-agent-core` adds two entry points. `kibi-agent-core/workspace-optin` resolves the Kibi workspace for a session directory and says whether it is opted in. `kibi-agent-core/hook-input` reads the hook payload from stdin and parses the Codex and ZCode payload fields.
  - The Claude Code, Codex and ZCode hooks resolve the workspace through `kibi-agent-core/workspace-optin`. Their standalone MCP launchers keep their own copy, because they run without installed dependencies.
  - The Codex and ZCode hooks parse their input through `kibi-agent-core/hook-input` and recognize Kibi MCP calls through `kibi-agent-core/kb-mcp-tools` directly, without a local wrapper. The Claude Code and Cursor hooks keep their own input parsers and read stdin through the shared reader.

- 192e238: Every Kibi surface now opens a session with the same short brief: search for the recorded intent before changing behaviour, record the person's decisions with their reason, run `kibi check --staged` before finishing, and treat a request that would make a recorded requirement or decision false as a question for the person rather than a task. Claude Code, Codex, Cursor, OpenCode and ZCode add it at session start; Codex and Cursor sessions, which started silently before, now get it too. The MCP server returns it in its `initialize` instructions and `kb_status` returns it as `sessionBrief`, so an agent on a host without hooks, such as Gemini CLI or any MCP client, reads the same policy. `kibi init` also writes a managed `GEMINI.md` section that imports `AGENTS.md` (`@./AGENTS.md`), because Gemini CLI reads `GEMINI.md` and not `AGENTS.md` by default.

  Migration: none needed. Run `kibi init` again to add the `GEMINI.md` import to an existing repository; a `GEMINI.md` that already imports `AGENTS.md`, or that is a link to it, is left as it is. Turning off the `agentInstructions` setup choice skips it like the other instruction files.

  Technical summary: `kibi-agent-core/session-brief` exports `SESSION_BRIEF`, `SESSION_BRIEF_LINES` and `sessionBriefWith(hostLines)`, which puts host lines (tool prefixes, skill names, missing-hook notes) after the brief. The Claude Code session-start context is rebuilt on it and shrinks from 1,180 to 830 characters (for one linked file). OpenCode adds the brief to the system prompt when the repository root is an active Kibi workspace (`root_active` or `hybrid_root_plus_vendored`). The MCP `SERVER_INSTRUCTIONS` and the `kb_status` output schema gain the brief; the contract fixtures are regenerated. `writeAgentInstructions` reports a `gemini` outcome next to `agents` and `claude`.

- 2be11a1: Codex and ZCode now count a shell in-place edit (`sed -i`, `perl -i`, `>`/`>>` redirections, `tee`) as a source edit, as Claude already did, so the end-of-session capture request and freshness reminder also follow edits made through the shell. The shell edit parser moved into kibi-agent-core (`kibi-agent-core/bash-command`) and is shared by all three hosts.
- bf3c060: An agent looking for prior intent now gets what a requirement says and why it exists in the first answer, and the edit hook shows the recorded reason before code that implements a requirement is changed. `kb_search` answers are smaller by default: graph paths and per-fact `kb_query` calls now come only with `fields: "full"`.
  - Each `kb_search` `answer.governing[]` entry carries `statement` (its `semantic_text`, else the statement its body derives, at most 300 characters). A reason taken from the requirement itself carries `said: { by, on }`: the approver from `origin.approved_by`, else the origin's kind (`human`, `agent` or `import`), and the date the origin was recorded. A migration origin names neither.
  - Breaking: without `fields: "full"`, `results[].evidence` no longer has `graphPaths`, and answer facts (governing and ungoverned) no longer carry `ask`. `moreFacts.ask`, `abstained` and `ambiguous` are unchanged. To get the old shape, pass `fields: "full"`, which also reloads complete entity bodies.
  - The shared edit snippet (Claude Code, Codex, Cursor, ZCode, and OpenCode's edit bullet) adds one `Why:` line for the lead requirement: its reason, where it was recorded, and who and when from its origin, or `Why: no reason is recorded.` The line appears once per file per session with the rest of the first edit snippet. A snippet over its 1,200-character budget now lists fewer requirements, fewer claims and a shorter reason before anything is cut, so the Why line and the follow-up calls stay in it.
  - Entity summaries in `kibi-agent-core` read up to 64 KiB of a requirement document (8 KiB for other entities) and carry `why`.
  - A requirement's reason, in the search answer and on the Why line, now comes from its `rationale` field, then its Why, Rationale or Context section, then its "Why this changed" section (then, in the search answer, a linked ADR). A line or list item that only notes a split or supersede ("Split from REQ-…", "Superseded by …") is skipped, so the reason is no longer a note about where the text came from.

### Patch Changes

- 7db492d: `kibi check --changed` and `kb_check` with `changed: true` give the pre-commit hook's verdict on every current change before anything is staged, and every finding now says what it stops. The check the hooks used to recommend after an edit looked only at the edit's impact: on a test project it returned no violations for a new function no requirement owned, and `kibi check --staged` then refused the commit of the same diff. The new mode refused it in 35 seconds with the real index untouched.

  - `kibi check --changed [paths...]` runs the `--staged` gate over a scratch copy of the index with the working tree added (only the named paths and `.kb` when paths are given). The real index is never written and the scratch file is removed.
  - `kb_check` `changed: true` (with optional `sourceFiles`) runs it in a child process and returns `commitAllowed` and the gate's findings.
  - Every finding carries `blocks`: `"commit"`, `"merge"` or `"none"`. The full check tags its violations `merge`; the staged and changed gates tag theirs `commit`; advice is `none`.
  - The post-edit and Stop messages of the Claude Code, Codex, Cursor, OpenCode and ZCode plugins recommend `kb_check` with `changed: true`, and a changed check counts as the impact check they ask for.
  - The staged gate no longer saves its temporary store after every write batch and evaluates the evidence floor only for the requirements the commit touches. A one-function change on a test project with 8,457 entities went from 7m17s to 48s with the same verdict.

- 9e09a88: A requirement written through the CLI (`kibi record`, or `kibi upsert` of a requirement) now raises the end-of-session signoff reminder on every host, as one written through `kb_record` or `kb_upsert` already did.
- ff0e920: The commit gate and the agent hooks now share one test for a retired requirement. `kibi check --staged` used to skip a `closed` firm requirement while the hooks still asked before an edit of its code; a closed requirement is done and still governs, so the gate now asks for a `kibi review-firm-edit` receipt as well. A closed requirement that a current requirement supersedes guards nothing: the hooks no longer ask about it, `kibi check --staged` no longer gates its code, and `kibi review-firm-edit` names its successor instead of recording a receipt. The hooks now also treat `archived` and `removed` as retired, as the impact review already did.
- da9818c: The firm-edit commit gate now sees every change to code that implements a firm rule: constants and arrow functions, lines only removed from a function, and a function removed together with its symbol record. A note or link added to the rule's document no longer switches the gate off; only a new statement, a new status or a superseding requirement does. A keeps receipt now counts in the pre-edit hooks only for the retry of the edit the same session asked about, so a receipt committed earlier never skips the question in a later session.

  - `kibi check --staged` (and the staged analyzer behind `kb_check`) gates any symbol with an `implements` link to a current firm requirement, whatever its role; attributes `-U0` hunks that only remove lines to the declaration they sit in; and reports a removed symbol record that implemented a firm requirement as `<symbol> in <file> (removed, …)` until a keeps receipt for the removal is staged.
  - The requirement counts as restated only when its statement or status differs from the base commit, or when a requirement the commit adds or edits supersedes it.
  - `kibi review-firm-edit` accepts `"staged": true` to review the code and requirement in the Git index; the gate puts it in the printed input when the file has unstaged edits. It also accepts coarse `.kb/symbols.yaml` symbols with source coordinates (the ones the hooks ask about) and symbols the change removed.
  - Receipt files are named `<symbol>--<hash>.json`, the hash covering the source file and symbol, so long paths no longer fail with `ENAMETOOLONG` and `a b.ts` and `a_b.ts` no longer share a file. Receipts under the earlier `<file>--<symbol>.json` names are still read, and a new review replaces them.
  - The hooks and the CLI read a requirement's statement with one shared reader (multi-paragraph `semantic_text` included), and the hooks find the reviewed code wherever it moved in the file, so a valid receipt no longer reads as stale.
  - Claude Code honours a keeps receipt only when it was recorded after that session asked about the edit; Codex, Cursor and ZCode notify once per requirement per session regardless of receipts.
  - The change-scoped declaration comparison keeps string and regex literals verbatim (so `//` inside a regex is no comment and whitespace inside a string counts), keeps a space where two tokens would join, and only drops blank lines and trailing whitespace for languages without C-style comments, such as Python.

- 8386b5c: The commit gate now asks for a firm-edit review when a change hides the code of a firm requirement while keeping its symbol record: deleting or emptying the file, renaming it away from the record, removing the declaration, or no longer exporting it. Before, only an edit inside the declaration or removing the record itself was gated. `kibi review-firm-edit` records the review of such a symbol as a removal, so the review the gate asks for can now be recorded even when the file is gone. The same holds when the file is renamed to a path that is not source (a `.txt` file, a Markdown page) or replaced by binary or non-UTF-8 content, which Kibi skips; `kibi review-firm-edit` refuses to review code it cannot read as UTF-8. A file-level symbol record (a config artifact, or a file no extractor reads declarations from) stands for its whole file: any edit of the file or its removal needs a review, and the review is bound to the whole file.
- 0fef7b0: The pre-edit firm-requirement question no longer depends on `.kb/symbol-coordinates.yaml` being present and current. That file is a local cache, missing in a fresh clone and stale once a file changes after the last sync, and without it an edit of firm code got no question or notice on any host. A symbol whose coordinates are missing, run past the end of the file, or no longer name it near its first line now counts as touched by any edit of its file, as do file-level records, so the hooks ask (Claude Code) or tell the agent to ask (Codex, Cursor, ZCode, OpenCode).
- d5b01c4: Host hook fixes:

  - Cursor stays quiet in a workspace that never adopted Kibi: no session-start advisory, no `.kb/` warning, no state written. A window opened on a subdirectory of a Kibi project now belongs to it.
  - Cursor counts in-place shell edits (`sed -i`, `>`, `tee`) as source edits, and the stated-rule note and capture template follow such an edit.
  - Shell edits run through `bash -c "..."` (string or argv form) are counted on every host.
  - Codex keeps edited paths workspace-relative, so the `kb_check` the hook suggests clears its Stop reminder after an edit by absolute path.
  - OpenCode counts a rule recorded through the CLI (`kibi record`, `kibi upsert`) or through a Kibi MCP server under any server key, so it no longer asks to record a decision that was recorded.
  - Rule detection no longer reads bug reports ("the bug where users have to click twice"), pasted errors, hindsight ("we should never have shipped this"), indirect questions and single-quoted phrases as a rule.
  - `kb_record` and requirement `kb_upsert` spell out the steps left before `kb_check` passes in the text result, for hosts that show the model only text (Cursor, Gemini CLI).
  - The kibi-usage skill says how to read its resources (`resources/<name>`), and the managed AGENTS.md section points a stated rule at `kb_record`.

- ccda902: The firm-edit receipt is now an MCP tool, `kb_review_firm_edit`, so the MCP catalog has 18 tools. It records the agent's keeps-or-changes verdict on an edit of code that implements a current firm requirement, exactly as `kibi review-firm-edit` does. Before, it was reachable only through the CLI, and an agent that could not run the project CLI had no way to clear the `firm_edit_unreviewed` finding.

  - The `firm_edit_unreviewed` finding names `kb_review_firm_edit` with the exact input to send, and gives `kibi review-firm-edit --input -` as the route without MCP.
  - The Codex, Cursor and ZCode pre-edit notices and the `kibi-decisions` skill name the tool, with the CLI route beside it.
  - The generated `kibi-usage` operation access reference lists it as an MCP tool.

- 34a1be8: A `kb_check` scoped to `sourceFiles` no longer fails when it cuts a result with more violations than diagnostics to its size budget; a violation without a diagnostic now costs only its own text. In a workspace nested inside a larger Git repository, the scoped check now recognizes the agent's own `.kb/` document changes (Git reports them relative to the repository root), so their findings are listed instead of counted as omitted.

  Small simplifications in `kb_upsert`'s inventory fill-in, `kb_apply_plan`'s legacy migration ordering, the migration plan, check policies, pending-source receipts and `statedRule` change no behavior; new tests pin each of those decisions.

- 9e09a88: The edit hooks locate an edit sent with `replace_all` (`replaceAll`) at every place it changes, not only its first match, so a firm symbol touched only by a later match is asked about and shown.
- 0f2ab5b: Agent hooks: rules written as list items or with emphasis (`- Never log API keys`, `**Never** ...`), or after phrases such as "also", "let's", "remember to", "need to" and "may never", read as rules again. Descriptions ("tokens currently never expire, and always have been stored"), "never mind", "never-ending" and "always a pleasure" no longer do, and `~~~` fences, indented code blocks, `>` quoted text and questions asking to be told something are skipped.

  The rule capture template now carries the `## Context` and `## Source` sections kb_check asks of a new requirement and says a scenario and test come next. Claude Code no longer counts a `kb_upsert` dry run as a recorded decision. Cursor delivers the capture template with the first source edit of a rule session instead of the second. Sessions without a session id no longer share one set of markers forever: a new session starts afresh (on Claude Code, unless it resumes or compacts the last one), a session without an id that has been idle for two hours ends at the next prompt, and markers of sessions untouched for a week are removed at session start.

- 3ff13d0: The prompt-time rule note no longer misses rules about errors or rules stated next to a bug report. A line counts as pasted tool output only in the shape tools print (`TypeError: ...`, `Error: ...`, `java.lang.IllegalStateException: ...`, `WARNING [x] ...`, `at fn (file.ts:3:7)`), so "Error messages must never include the stack trace", "ValidationError must always carry the field name" and "At login (and signup) users must accept the terms" are read as rules again. A bug report's frame applies only to its own clause ("Fix the bug where guests can post; from now on only admins are allowed" states a rule), "I must approve each release" is a rule while "I have to leave soon" is not, and a single-quoted clause that states a rule ("Our policy is 'API keys must never be logged'") is kept.
- bc2df1d: The edit hooks recognize more shell edits of a file: a `cd` inside a quoted `bash -c` script, subshells and `{ ...; }` groups, `if`/`then` and loop bodies, the `time`, `timeout <duration>`, `xargs` and `!` prefixes, and the `>|`, `&>` and `&>>` redirections.
- 98c748b: The `Why:` line of the hooks' edit note now names the requirement its reason belongs to (`Why: ... (REQ-x rationale)`, or `Why: no reason is recorded for REQ-x.`). The line used to follow the whole list of requirements, so it read as the last one's reason. A recorded reason of "Reason not stated", which `why` writes when the person gave none, is no longer shown as a reason with an author and date; the note says no reason is recorded, as `kb_search` already did. When a file's code implements both a requirement and the closed requirement it supersedes, the note lists the current one first and marks the other `(closed, superseded by REQ-y)`.

## 0.14.0

### Minor Changes

- 37de7f9: Usage telemetry now records a skill loaded through `kibi skills load`, `kibi skills-load`, `kibi skill` with `action: "load"` or MCP `kb_skills`, so later operations in that workspace report `skill_loaded_before`. Before this, only host hooks marked a load. The mark belongs to the workspace root that answered the call: the CLI resolves it from the directory it runs in, and the MCP server uses the workspace it serves (a call routed to another workspace is recorded by that workspace's server), so a server started in a home directory no longer marks every repository below it. A mark counts only for its own workspace root, not for directories below it. Only the workspace path's hash is stored.

  `kibi-usage`: a payload rejected twice with a typed error is not resent; the agent fixes the rule and field the error names, or follows `nextActions`. The relationship direction table adds `requires_predicate`, `requires_rule`, `assumes`, `depends_on` and `exempts`, and explains `relationship_source_mismatch`.

## 0.13.1

### Patch Changes

- 3cce94f: Removing the inline `implements` comments that Kibi stopped reading no longer stalls an agent. An edit that only deletes such comments, whole lines or a comment trailing code, is not treated as a change to a firm requirement, so the editor hooks do not ask a person to confirm it, and `kibi migrate` now prints the comment review with its instruction in the migration section instead of counting it in the quality backlog. This covers replacement edits, whole-file writes and `apply_patch` edits in Claude Code, Codex, Cursor and ZCode. Technically: `removesOnlyDeadImplementsComments` in the shared decision guard compares the edit's old and new text line by line, accepting a line whose code is unchanged and whose trailing comment was cut, and for an `apply_patch` envelope accepts only an `Update File` section for the edited file whose removed lines are all such comments and that adds none (never an added, deleted or moved file, and never a patch it cannot parse); any other change in the same edit keeps the confirmation.

## 0.13.0

### Minor Changes

- 3e0e613: Search and the edit hooks no longer treat a closed requirement as if it were current. A closed requirement may be done and still hold, so it stays findable, but it now ranks below a current requirement that matches as well, and a closed requirement that a current one supersedes is no longer offered as a candidate for a file no symbol links.
  - `kb_search` scores a closed requirement that no current requirement supersedes at 0.75 of its match and gives the reason `demoted: closed`. The answer applies the same factor to a closed requirement reached through a matched fact, scenario or test, so it follows a current requirement reached as well in `governing`. A superseded requirement keeps its 0.5 demotion.
  - The answer proposes the replacement of a superseded requirement only when that requirement scored at least 0.8 of the best candidate's score, so a weak match on an old requirement no longer pulls its replacement into an unrelated answer. The old requirement still names its replacement under `notGoverning`.
  - The edit hook note (every host) and an impact `kb_check` for an unlinked file list current candidate requirements before closed ones and leave out a closed requirement that a current requirement supersedes, read from front matter links and relationship shards. kibi-agent-core exports `replacedRequirements` for this.

### Patch Changes

- 30d56b9: The file-context hint that hooks inject now points agents at `kb_query({id, includeBody:true})`, which returns the requirement's full body including why it exists. The hint previously suggested `kb_query({id})`, which returns the statement without the body.
- df02251: When the Kibi engine cannot start, anonymous telemetry now says why in a fixed word, so start failures can be told apart without sending any message text. Every `kibi sync` refusal now has its own error code, so a refusal you can act on (unresolved Git conflicts, a requirement that failed proposition-complete ingestion) is counted as a rejection and not as a Kibi failure.

  - The engine daemon writes its start diagnostic as one JSON line: a fixed failure kind (the error's own code such as `swipl_not_found`, or `already_listening`, `store_locked`, `journal_unreadable`, `prolog_module_load_failed`, `branch_attach_failed`, `invalid_branch`, `daemon_error`) and the message. The client still accepts a plain-text diagnostic and raises `ENGINE_START_FAILED` with the same message as before, plus a `startFailure` property. A daemon that exits without a diagnostic reports `daemon_exited`, and an unreadable diagnostic reports `diagnostic_unreadable`. Telemetry sends this kind as `rejection_code`.
  - `SyncError`s that had no code now have one: `GIT_CONFLICTS_UNRESOLVED`, `INVENTORY_INGESTION_FAILED`, `LEGACY_BRANCH_STORAGE`, `BRANCH_RESOLUTION_FAILED`, `ENGINE_SOCKET_UNREACHABLE`, `KB_SAVE_FAILED`, `STAGING_ATTACH_FAILED`, `STAGING_SAVE_FAILED`, `RELATIONSHIP_SHARD_CLEAR_FAILED`, `SYNC_CHECKPOINT_FAILED`, `SYNC_CACHE_KEY_INVALID`, `SNAPSHOT_COMPILE_REFUSED`, `RECOVERY_TARGET_MISSING` and `RECOVERY_BACKUP_EXISTS`. `git_conflicts_unresolved` and `inventory_ingestion_failed` count as rejections.
  - The MCP error classifier recognizes a missing SWI-Prolog (`swipl_not_found`), a failed engine start (`engine_start_failed`) and an engine that never accepted connections (`engine_connect_timeout`) instead of reporting them as `handler_error`.

- 6411b83: Telemetry now names the error underneath a plain wrapper such as "Upsert execution failed: …": the event carries the wrapped error's code, class and crash frame instead of a generic `operation_failed` from the wrapper. The engine client also stops waiting when the daemon it started exits without listening (reporting `ENGINE_START_FAILED` with the exit code or signal after a one-second grace, instead of waiting out the two-minute start timeout), and a start that does time out reports `ENGINE_CONNECT_TIMEOUT` instead of an uncategorized error.

  On native Windows, Kibi now finds a system SWI-Prolog on the search path: it looks for `swipl.exe` and reads the `Path` variable whatever its case. Before, it looked only for an extensionless `swipl` under `PATH`, so doctor and every Prolog-backed command reported that no SWI-Prolog was installed.

  The engine daemon now starts on Windows named pipes: it no longer tries to create the pipe namespace as a directory, and its start diagnostic and publication lock are written to the runtime directory instead of beside the pipe, where no file can exist.

  Escape backslashes in the file paths Kibi passes to SWI-Prolog, so loading the core modules and attaching a KB work on Windows paths such as `C:\Users\...`.

  SWI-Prolog's standard output and error now use LF line ends on every platform, so queries complete on Windows, where SWI-Prolog otherwise writes CRLF.

  The engine flushes its journal through writable file handles on Windows, where fsync on a read-only handle fails with EPERM.

## 0.12.0

### Minor Changes

- dd11641: A fresh clone of a Kibi repository now uses Kibi without anyone running `kibi init` in it. Before, a clone had the knowledge but no git hooks, an empty branch store (so queries answered nothing) and, without a per-user plugin, nothing telling an agent the knowledge base existed, so agents in new clones and cloud sessions ignored it. Now `kibi init` writes a Kibi section into `AGENTS.md` (imported from `CLAUDE.md`), adds a `package.json` `prepare` step that installs the hooks on every dependency install, and the first query, check or write in a clone compiles the branch store itself. Re-run `kibi init` in an existing repository to get the `AGENTS.md` section and the `prepare` step; `kibi doctor` reports them as missing until then.

  - New setup choices `autoSync`, `prepareHooks`, `agentInstructions` (on by default) and `ciGate` (off), recorded on the first `kibi init` in `package.json` `kibi.setup`, or `.kb/setup.json` without a root `package.json`. `kibi init` takes `--[no-]auto-sync`, `--[no-]prepare-hooks`, `--[no-]agent-instructions` and `--[no-]ci-gate`, and the `kibi-bootstrap` skill (3.20.0) asks about them once.
  - Auto-sync: CLI routes, `kibi check` and MCP tools that find this branch's store never compiled compile it first, with a compile that writes nothing Git tracks (no symbol-manifest layout rewrite, no adoption receipt), progress on stderr only, and a fallback to the previous `branch_store_not_compiled` answer when it fails. `kb_status` stays read-only and `kb_apply_plan` never pre-empts a plan. `KIBI_AUTO_SYNC=0` turns it off for one environment.
  - New `kibi hooks install [--quiet]`. The `prepare` step is a Node one-liner that does nothing when `kibi-cli` is not installed (for example `npm ci --omit=dev`), in CI or outside a Git work tree, works under Windows `cmd.exe`, and is not added when a hook manager owns the hooks or there is no root `package.json`. `kibi-cli` exports `./bin/kibi` for it.
  - `AGENTS.md` and `CLAUDE.md` get a marker-delimited section; text outside it is never changed, a link between the two files is written once, and a symlink that leaves the repository is not written through.
  - `kibi init --ci-gate` adds `.github/workflows/kibi-check.yml`, which runs `kibi check` on pull requests (template in `docs/examples/github/kibi-check.yml`).
  - `kibi doctor` has a "Fresh-clone setup" check against the recorded choices, and its missing-hooks remediation is now `kibi hooks install`.
  - The Claude Code, Codex, Cursor, ZCode and OpenCode plugins tell the agent at session start when Kibi's hooks are not installed in the checkout (not where a hook manager or `core.hooksPath` owns them). The check lives in `kibi-agent-core/checkout-hooks`.

- 029f99b: Telemetry now shows where agents struggle, using fixed signals only. A refused payload names the rule it broke (a JSON Schema keyword or a Kibi check such as `inventory_missing`) and the Kibi schema field (an unknown field name is sent as `other`); an upsert reports whether it was a dry run, a bucketed relationship count and its attempt on the same entity; a search reports a bucketed result count, whether it abstained or showed hints, and whether it repeated a search from the last two minutes; events say whether a Kibi skill was loaded in the workspace in the last 30 minutes, which every host's hooks now detect; and a Kibi fault carries its top stack frame inside Kibi's own packages with a fingerprint, never a path, line or message. Retries, repeated searches and skill loads are matched from one-way hashes kept next to the local queue. A kb_validate_upsert or dry-run refusal also returns `rejection` with its code and issues. The Claude Code plugin's PreToolUse hook now also runs for the Skill tool.
- 03d2308: Telemetry now tells refusals apart from faults. An operation that Kibi refused on purpose (an invalid upsert payload, check findings, a semantic contradiction, a firm decision, a missing entity) is sent with status `rejected` and its fixed error code, and `error` is kept for Kibi's own failures, which also carry the JavaScript class name of the thrown error but never its message. The CLI now keeps the code of mutation refusals instead of reporting them as `operation_failed`. Every event carries `telemetry_version: 2`.

### Patch Changes

- ad02757: Simplify the knowledge index's manifest, coordinate and relationship-shard readers without changing what they return, and pin their behaviour with contract tests.
- 9684b7c: Filter "always" (and every other request stop word whose stem differs from the word) out of a request's topic words. The stop lists were compared against stemmed words, so "always" became "alway" and was kept as a topic word, which skewed the requirement candidates shown for unlinked files. Path policy, hook usage logging and the decision-guard markers drop unreachable checks without changing behaviour.

## 0.11.2

### Patch Changes

- f718e79: Remove unreachable branches found while covering the multi-language proof code with unit tests. Behavior is unchanged:
  - The type-position check of the TypeScript references reader stops at the enclosing statement without a trailing fallback.
  - Source classification reads the two ambiguous extensions (`.pl`, `.h`) without a third, impossible case.
  - A symbol refresh failure no longer has a message for a coarse symbol, which is anchored to its whole file and never reported.
  - The tree-sitter reference reader's first-error search and its `System.Environment` check drop branches no input can reach.
  - `kibi-agent-core` exports `moduleFileFromUrl`, which telemetry uses to find its own module file when a bundle drops `import.meta.url`; the Claude Code, Codex and Cursor hook bundles are rebuilt with it.

## 0.11.1

### Patch Changes

- The telemetry status carries the channel in effect and where it comes from (`channel`, `channelSource`), and `telemetryChannel` returns both.

- Edit snippets say what the lead requirement must keep true as the claims its facts model, in words with their operator and members (for example "REQ-GREET must keep true: The greet function must not call console.log."), or as the requirement's own statement, instead of listing internal fact IDs and subject keys. A requirement title that an older Kibi cut at a dot inside a name is shown whole.

- f9ec786: Usage telemetry events now carry a `channel`: `release` for an installed Kibi package, `source` when Kibi runs from a checkout of its own repository, or the value of `KIBI_TELEMETRY_CHANNEL` when a harness sets one (for example `agent-test`). Development and test runs can then be filtered out of real usage. Nothing else about what is sent changes.

## 0.11.0

### Minor Changes

- 43d4366: Usage telemetry data is cleaner and more complete. Telemetry is now off when the home directory lies inside the temp directory, as eval, packaging and end-to-end harnesses set it, so each harness run no longer counts as a new install; Kibi's own eval and packed-test sandboxes also set `KIBI_TELEMETRY=0`. Events now name the host agent from `CLAUDECODE`, `CURSOR_AGENT`, `CODEX_SANDBOX`, `GEMINI_CLI`, `OPENCODE`, `AI_AGENT` or the MCP client name, carry a hashed host session id in every host, and say whether they come from a hosted cloud workspace. Failed CLI commands and MCP tool results now carry a fixed error category: the result's error code (for example `upsert_dry_run_invalid`), the failing `kibi doctor` checks, or the `kibi migrate` approval problem. `kibi migrate --apply-safe` now prints the current plan hash when the approved hash is missing or out of date.

  Hooks in Claude Code, Codex, Cursor, ZCode and OpenCode now all send the anonymous `kibi_hook` event (before, only Claude Code did, and only in diagnostic mode for the others), and each hook remembers, as hashes in `telemetry-sessions.json`, which host session last ran in the workspace. CLI and MCP events take the session id from `KIBI_SESSION_ID`, `CLAUDE_CODE_SESSION_ID` or `CODEX_THREAD_ID` when the host exposes one, and otherwise from that workspace marker (at most 30 minutes old), so events from Cursor and OpenCode sessions, which expose no session variable, can be grouped too. Every host's hook also sends the queue when it is due, and right away at the end of a turn.

### Patch Changes

- ce41f02: Agents now keep a signoff in the pull request it approves. The guidance used to time the signoff as an end-of-work step and said only that an agent must never set `approved_by` itself, so agents often opened the pull request first and then carried the person's answer in a separate follow-up pull request.
  - kibi-usage 2.37.0, kibi-decisions 1.5.0 and kibi-commit-review 1.4.0 (and the signoff-views resource) say to ask for the signoff before opening or merging the pull request, and to record the person's answer (their name in `approved_by` or a `*_waiver_approved_by` field, their words in `origin.ref` or `approval_ref`) on the same branch and pull request. Writing down an answer the person gave is not self-approval. A pull request that only carries a signoff, firmness or waiver approval is ruled out.
  - The stop-hook signoff reminder (Claude Code, Codex, Cursor, ZCode) adds the same rule. So do the `agent-requirement-unapproved` check action, the `dimension_unrepresented` repair hint and the waiver lines of `kibi proof explain`.

## 0.10.0

### Minor Changes

- d89c1d2: Kibi now sends anonymous usage statistics, so its maintainers can see which operations people use, how long they take and how they fail, including in cloud and ephemeral environments where the local diagnostic log is lost. Only fixed names, statuses, durations, error categories, versions and platform are sent. Code, paths, queries, KB content and repository names never are. Turn it off with `kibi telemetry disable`, `KIBI_TELEMETRY=0` or `DO_NOT_TRACK=1`. It is also off in CI and test runs.
  - kibi-agent-core adds `usage-telemetry`, a shared queue and batch sender for PostHog, with a random install id, hashed session ids and no person profiles.
  - kibi-mcp records one `kibi_operation` event per tool call, sends the queue every minute and on shutdown, and prints a one-time notice to stderr.
  - kibi-cli records one event per command, adds `kibi telemetry status|enable|disable`, and prints the one-time notice.
  - kibi-claude records one `kibi_hook` event per hook decision and sends the queue from the Stop hook.

## 0.9.1

### Patch Changes

- 45036a3: Signoff guidance no longer tells agents to attach `latest.html` as a file. Chat apps (the Claude apps, Slack and most others) show an attached HTML file as raw source or a download, so agents now share the page only as a rendered page, such as a Claude Artifact, and otherwise leave the message text as the whole view. Updates the kibi-decisions and kibi-commit-review skills (1.2.1), the `kibi signoff` page note and the stop-hook reminder.

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
