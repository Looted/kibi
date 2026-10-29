# CLI Reference

This document provides complete command-by-command documentation for the kibi CLI. The CLI is both a human-facing command surface and an agent-accessible peer of MCP.

## Dedicated JSON operation routes

The CLI exposes the canonical public operation catalog as a peer to MCP. Every route accepts one JSON object through `--input <file|->`, where a path is resolved from the current working directory and `-` reads standard input exactly once. JSON mode writes one structured JSON value followed by a newline to stdout.

```bash
# Read an input object from a file
kibi query --input request.json

# Read the same object from stdin
printf '%s\n' '{"query":"login","limit":10}' | kibi search --input -
```

The input root must be a JSON object that matches the corresponding operation schema. In JSON mode, do not also pass business flags or positional arguments; mixed input is rejected. Optional `_diagnostic_telemetry` is transport metadata and is removed before business-schema validation. Add the global `--diagnostic-mode` flag to append the operation outcome to `.kb/usage.log`; supplied opaque `session_id` and `actor_id` fields are preserved for workflow correlation.

| Operation | Dedicated CLI route |
| --- | --- |
| `kb_skills_list` | `kibi skills-list --input <file|->` |
| `kb_skills_load` | `kibi skills-load --input <file|->` |
| `kb_skills_read` | `kibi skills-read --input <file|->` |
| `kb_skills` | `kibi skill --input <file|->` |
| `kb_query` | `kibi query --input <file|->` |
| `kb_search` | `kibi search --input <file|->` |
| `kb_status` | `kibi status --input <file|->` |
| `kb_find_gaps` | `kibi find-gaps --input <file|->` |
| `kb_coverage` | `kibi coverage --input <file|->` |
| `kb_graph` | `kibi graph --input <file|->` |
| `kb_semantic_advisor` | `kibi semantic-advisor --input <file|->` |
| `kb_model_requirement` | `kibi model-requirement --input <file|->` |
| `kb_suggest_predicates` | `kibi suggest-predicates --input <file|->` |
| `kb_model` | `kibi model --input <file|->` |
| `kb_plan_bootstrap` | `kibi plan-bootstrap --input <file|->` |
| `kb_compile_intent` | `kibi compile-intent --input <file|->` |
| `kb_apply_plan` | `kibi apply-plan --input <file|->` |
| `kb_ingest_proof` | `kibi ingest-proof --input <file|->` |
| `kb_validate_upsert` | `kibi validate-upsert --input <file|->` |
| `kb_upsert` | `kibi upsert --input <file|->` |
| `kb_delete` | `kibi delete --input <file|->` |
| `kb_check` | `kibi check --input <file|->` |
| `kb_sparql_remote` | `kibi sparql-remote --input <file|->` |

The MCP server registers 16 tools rather than one per operation. The
consolidated routes `kibi skill` and `kibi model` match the MCP tools
`kb_skills` and `kb_model`, and the narrower routes stay available:

- `kibi skill` takes `action: "list" | "load" | "read"` plus `id` and
  `resource`, and returns the routed operation's payload with `action`.
- `kibi model` takes `mode: "analyze" | "requirement" | "predicates"` plus the
  inputs of `semantic-advisor`, `model-requirement`, or `suggest-predicates`
  (`text` is always required), and returns that operation's payload with
  `mode`.
- `kibi upsert` accepts `"dryRun": true`: it runs the `validate-upsert`
  checks, writes nothing, and returns the validation payload plus
  `dryRun: true` and `skippedEffects`. With `"plannedFacts": [...]` (the
  `applyPlan` entries of `kibi model`) the dry run stages those fact writes
  first, so a grounding link to a fact that does not exist yet validates and
  the contradiction preview sees the KB as it would be after the batch
  (`stagedFacts`, `whatIf`). `plannedFacts` without `dryRun` is rejected.
- `kibi delete` accepts `"dryRun": true`: a relationship or direct entity
  delete runs its preflight, writes nothing, and returns `outcome: "dry_run"`
  with `wouldDelete`, the `sourceWrites` a commit would make, and
  `skippedEffects`. An id authored in a Markdown or YAML source is never
  deleted directly: the route writes nothing and returns
  `outcome: "plan_returned"` with `deletionPlan` and a `nextActions` entry
  whose `input` is the exact `kibi apply-plan` input
  (`{"plan": …, "approvedPlanHash": …}`). Pass that unmodified, or rerun
  `kibi delete` with the same `ids` and `"approvedPlanHash"` set to
  `deletionPlan.planHash` to apply it in one call (a stale or different hash
  fails with `DELETE_PLAN_HASH_MISMATCH` and writes nothing). An authored
  requirement returns `outcome: "supersession_required"` and a `kb_upsert`
  supersession next action instead. See the
  [MCP reference](mcp-reference.md#kb_delete) for every field.
- `kibi apply-plan` with `"recoveryJournalId": "bootstrap-…"` resumes a
  bootstrap plan whose process died mid-action without journal edits: the
  interrupted action is re-applied and a source lock left by the dead process
  is reclaimed and recorded in the journal. The MCP-only `async` field is
  ignored; the CLI always applies synchronously.

```bash
printf '%s\n' '{"action":"load","id":"kibi-usage"}' | kibi skill --input -
printf '%s\n' '{"mode":"predicates","text":"Admins may export audit logs."}' | kibi model --input -
printf '%s\n' '{"type":"req","id":"REQ-auth-session-timeout","properties":{"title":"Session timeout","status":"open"},"dryRun":true}' | kibi upsert --input -
```

See the [MCP reference](mcp-reference.md#catalog-operations-mcp-calls-and-cli-routes)
for the full catalog operation to MCP call to CLI route table.

### JSON-route exit codes

| Exit code | Meaning |
| --- | --- |
| `0` | Input validated and the operation completed successfully. |
| `1` | The operation started but failed, including Prolog, filesystem, network, or other runtime failures. |
| `2` | Invocation or input error, including missing/unreadable input, malformed JSON, a non-object root, conflicting flags/positionals, unknown operations, or schema validation failure. |

Errors are written to stderr as `Error [CODE]: detail`. Failed routes do not write a success JSON object.

## `kibi init`

Initializes Kibi repository infrastructure in the current directory. It does
not infer or write product knowledge.

**Behavior:**
- Creates `.kb/` directory structure with canonical knowledge lanes (`requirements/`, `scenarios/`, `tests/`, `facts/`, `adr/`, `flags/`, `events/`)
- Installs git hooks (pre-commit, post-checkout, post-merge, post-rewrite) by default, into the directory Git reads hooks from (`git rev-parse --git-path hooks`), so linked worktrees and `core.hooksPath` are honored. Re-running `kibi init` refreshes only the kibi-managed section of each hook. A hook without a kibi-managed section (hand-written, husky, lefthook, ...) is never edited: init reports it as skipped and points at `--print-hook` so you can delegate from it yourself. Hooks resolve the `kibi` binary at run time (PATH first, then `node_modules/.bin` walking up from the repository root), so they work with both global and project-local installs even though git does not put `node_modules/.bin` on the hook's `PATH`.
- Ignores derived `.kb/` runtime state in `.gitignore` (`.kb/branches/`, `.kb/recovery/`, `.kb/proof/runs/`, `.kb/briefs/`, `.kb/migrations/`, `.kb/symbol-coordinates.yaml`, `.kb/usage.log`). Authored knowledge under `.kb/` stays tracked. `kibi migrate` also removes the pre-canonical blanket `.kb/` ignore stanza so migrated knowledge files are not left Git-ignored.
- Creates Kibi-owned `.kb/manifest.json` (lifecycle metadata only; not a user configuration file)
- Creates `.kb/symbols.yaml` (authored, committed) and the local `.kb/symbol-coordinates.yaml` cache when they do not already exist
- Leaves `.kb/manifest.json` and `.kb/symbols.yaml` alone when a legacy `.kb/config.json` is present and points to `kibi migrate --yes`, which moves the existing knowledge and runs every schema step from the legacy version

**Flags:**
- `--no-hooks` - Skip git hook installation (hooks are installed by default)
- `--github` - Scaffold the documented GitHub Pages badge + full report integration (workflow, README badge, `kibi-report/` gitignore entry)
- `--badge-only` - With `--github` only: publish the badge without the HTML report. Rejected if used alone.
- `--print-hook <hook>` - Print a copy-paste snippet that wires Kibi into an existing hook, then exit without writing anything. `<hook>` is one of `pre-commit`, `post-checkout`, `post-merge`, `post-rewrite`. The snippet resolves the `kibi` binary the same way the managed hooks do (PATH, then `node_modules/.bin`), so it works with project-local installs, and runs the same commands as the managed template with failures propagated. For `pre-commit` that is `kibi check-generated --staged --changed-only` followed by `kibi check --staged`.

```bash
kibi init --print-hook pre-commit >> .husky/pre-commit
```

**GitHub integration:**
- `--github` by itself always means **badge + full report**. It copies the canonical workflow from the `kibi-cli` package (the same file as [docs/examples/github/kibi-report.yml](examples/github/kibi-report.yml)). That workflow generates the report on pull requests (artifact only) and deploys GitHub Pages only from the repository default branch or `workflow_dispatch`.
- Re-running is safe: matching files are left as already configured; customized workflows are not overwritten; an existing Kibi badge is not duplicated.
- If no README exists, the workflow is still written and the badge Markdown is printed.
- If a github.com owner/repository cannot be determined from git remotes, the workflow is still written and placeholder badge Markdown is printed instead of inventing a URL.
- After scaffolding, enable **Settings → Pages → Source → GitHub Actions**. See [GitHub badge + report](github-integration.md).

**Notes:**
- Hooks are installed by default. Only use `--no-hooks` if you specifically don't want automated syncing.
- The pre-commit hook blocks commits that stage `.kb/symbol-coordinates.yaml` (it is derived locally and never committed) or a `.kb/symbols.yaml` that is not in the layout sync writes.
- The pre-commit hook also blocks behavior-changing source edits that lack staged Kibi impact evidence (KB entity docs, authored `.kb/symbols.yaml` entries, or a symbol manifest that already covers every declaration of the edited file). Test-only and docs-only edits are exempt.
- The pre-commit hook also blocks a commit whose staged knowledge introduces a `domain-contradictions`, `scenario-feasibility`, `exception-claim-keys` or `kb-consistency` violation, the same finding full `kibi check` reports on that tree. A violation already present at the last commit does not block an unrelated commit.
- The pre-commit hook also blocks a commit that adds or edits an entity document without the body context full `kibi check` requires (`entity-context-missing`). An entity that already lacked context at the last commit, or that the schema 8 migration acknowledged in `.kb/manifest.json`, does not block.
- Idempotent: safe to run multiple times
- After initialization, ask the coding agent to bootstrap the repository. The
  bootstrap planner owns discovery, approval, source-first application, and
  repair; `doctor` and `sync` are diagnostics/internal lifecycle operations.
- After running, see the quick start guide in README.md for next steps

## `kibi sync`

Extracts entities and relationships from project documents and updates the knowledge base.

**Behavior:**
- Extracts entities from Markdown files with frontmatter
- Imports symbols from YAML manifests
- Keeps the gitignored `.kb/symbol-coordinates.yaml` current: symbols whose identity or source file bytes changed since the last sync are extracted again and every other record is reused, so a no-op sync does no extraction. A fresh clone builds the file on its first sync. When extraction fails, sync warns and keeps the previous coordinates.
- Rewrites a `.kb/symbols.yaml` whose `symbols` sequence is still in YAML flow layout (`symbols: [ { id: … }, … ]`, what kibi-cli before 2.18.0 produced by appending to the `symbols: []` that `kibi init` writes) in block layout once, keeping comments and order, so hook scanners and reviewers can read it; the summary line `Rewrote .kb/symbols.yaml in block layout` reports it
- Updates KB for the current git branch
- Runs validation rules on the updated KB
- Prints a summary that opens with `KB Totals` (the entities the branch KB holds after the sync, by type) and `KB Relationships`, counted from the store, followed by `Imported This Sync (changed sources only)`: an incremental sync recompiles only changed sources, so that second block is a delta, not the size of the KB. Both blocks count distinct relationships: an edge stated in an entity's front matter and again in a symbol manifest or shard counts once. When the store cannot be counted, the summary shows the imported counts under `Entity Counts` as before

**Flags:**
- `--validate-only` - Perform validation without making mutations
- `--rebuild` - Rebuild branch snapshot from scratch (discards current KB)
- `--refresh-symbol-coordinates` - Re-extract every symbol's location into `.kb/symbol-coordinates.yaml` and rewrite `.kb/symbols.yaml` in its canonical layout. Plain sync already keeps coordinates current; use this to rebuild them from scratch or to normalize the manifest. Explicit refreshes are fatal on artifact errors, force coordinate-bearing symbols to persist even when normalized hashes match cached state, and only then advance the sync cache (version 2, workspace-root-relative keys; the artifact is a compiler dependency of `symbols.yaml`). A symbol that gets no coordinates is listed as `failed <id>: <reason>`. A TypeScript or JavaScript symbol whose title names a private class member (`Class.member` or a bare member name for a `private` or `#private` member) is never bound, because the symbol extractor that `kibi check --staged` uses skips private members; its reason says so and asks you to re-point the symbol to the public member or class that owns the behavior, or remove it. Full `kibi check` reports the same symbol under `symbol-granularity` when it has traceability links.
  Extraction misses are reported as failed, including Python and other files handled by the text heuristic. If a qualified symbol title cannot be located, query and validate/upsert a corrected title/sourceFile or an intentional `granularity_reason: extractor-miss` before refreshing. Coverage only offers automatic coordinate repair when current extraction or an explicit coarse anchor can produce coordinates.

**Notes (sync + MCP):**

- Rebuild with `--rebuild` replaces the on-disk branch KB snapshot while MCP can continue running.
- A running MCP session detects same-branch snapshot replacement before serving affected operations.
- If auto-refresh cannot complete during a transient publish conflict, MCP returns a recovery error; retry the tool call after the publish settles.

**Notes:**
- Supports these entity types: req, scenario, test, adr, flag, event, symbol, fact
- **Modeling:** Use `flag` for runtime/config gates; record bugs and workarounds as `fact` entities, usually with `fact_kind: observation` or `meta`. **Strict facts** (subject, property_value) drive contradiction checks, while observation/meta facts are non-blocking notes.
- Symbol manifests must be in YAML format
- Changes are committed to the branch KB's audit log
- A requirement whose stored semantic inventory no longer matches the current semantic advisor fails proposition-complete ingestion. Sync checks every requirement before it stops and lists all failing files in one error, then points at `kibi migrate`, which re-derives the inventories it can and lists the ones that need a manual fix.

Normal sync is a delta compile into the running Node engine: unchanged source
files are skipped, changed/deleted source entities are retracted and reasserted
in the journal, and relationship shards are refreshed only when their content
hash changes. `--rebuild` is the explicit generation-replacement path.

## `kibi engine status|stop|janitor`

The engine is automatically started for CLI and MCP operations. `engine status`
prints the workspace/branch daemon PID and journal status; `engine stop` asks it
to flush and exit. A daemon is shared by all clients for the same canonical
workspace path and branch and exits after ten minutes without clients.
Clients find the daemon through a socket in `KIBI_RUNTIME_DIR`, else
`XDG_RUNTIME_DIR`, else `/tmp/kibi-runtime` on Linux (the per-user `TMPDIR` on
macOS). Processes that set these differently cannot see each other's daemon.
The directory must be owned by you and private to you (`chmod 700`); when
`KIBI_RUNTIME_DIR` names one that is not, Kibi prints a warning and uses a
private directory under `/tmp` instead.
When `engine stop` finds no daemon it says so, and names the pid still holding
the branch store if there is one.

`engine janitor` classifies stale engine daemons and branch-store locks left by
crashed engines or removed worktrees. It only reports by default; `--apply`
performs the cleanup, `--all` also sweeps daemon sockets from other workspaces,
and `--format json|table` selects the output. It also reports stale-lock
takeover records (`.kibi-lock-takeover.json`, kind `takeover-record`) older than
the 24 hours `kb_status` shows them for, and `--apply` deletes them.

## `kibi storage status|compact|export`

- `storage status` reports journaled mode, generation, commit sequence, and journal bytes.
- `storage compact` explicitly compacts the RDF journal; idle engines also compact journals over 16 MiB.
- `storage export --output <directory>` writes derived legacy `kb.rdf` and `audit.log` files outside the active branch store. These exports are not authoritative and are never read by the engine.

Node.js 22 or newer is required for both the CLI/MCP clients and the engine.
Bun remains a repository build/test tool, but is not a supported runtime for
the published Kibi packages.

## `kibi prove`

Runs the configured proof producers and ingests valid
`kibi.proof-run.v1` evidence. For each integration, the producer executes
once (`shell: false`), the workspace snapshot is revalidated before and after,
and the artifact is evaluated independently against every selected test's
`kibi.proof-contract.v1` obligations. Derived `kibi.proof-receipt.v1`
receipts append idempotently, and each append compacts that test's history to
the receipts that can still decide proof (`kibi.proof-receipt-compaction.v1`):
kept receipts are never edited or reordered, so coverage decisions do not
change.

```bash
kibi prove --all
kibi prove --test TEST-checkout
kibi prove --requirement REQ-checkout
kibi prove --integration web-e2e
kibi prove --integration web-e2e,api-tests
kibi prove --all --integration-except heavy-suite
kibi prove --stale
kibi prove --requirement REQ-checkout --stale
kibi prove --all --resume
```

Selectors: `--test`, `--requirement`, `--integration`, `--all` (default).
`--stale` narrows the selection to tests without a current passing receipt
(missing, stale, failed or contract-mismatched, judged as coverage judges
them); when every selected test is current it runs nothing and says so.
`--resume` skips integrations an interrupted run with the same selector
already ingested at the current workspace snapshot (recorded in
`.kb/proof/runs/prove-progress.json`); progress lines on stderr name each
integration as it starts and is ingested. With `--test`, `--requirement` or
`--stale`, a `playwright` integration whose command is a direct
`playwright test` invocation runs only the selected tests'
`proof_bindings[].source_file` spec files; every producer also receives them
as `KIBI_PROOF_SOURCE_FILES` (a JSON array).
`--integration` accepts one or more comma-separated integration ids.
`--integration-except` is a modifier (it requires a selector such as `--all`)
that skips tests bound to the listed integrations. A selector that matches no
proof-bearing test is an error, so a typo cannot silently prove nothing.

The last stdout line is a JSON summary: `passed` (passing receipts),
`certified` (passing receipts whose certificate re-checked, the only ones that
can support `proved`), `failed`, `unchanged`, and per-integration `runs` whose
`results` carry each test's `kind`, `evidenceLevel` (`proved` or `tested`),
`certificateRejection` and `claimBindings`. A certificate kind whose
certificate does not re-check still passes, and stderr names it
(`prove: TEST-x exhaustive: certificate rejected, <reason>`). Before this
summary used `proved` for the passing count; that key is now `passed`.
The exit code is non-zero when any proof fails or a producer errors.

Producer child processes run with `KIBI_PROOF_RUN=1` (plus
`KIBI_PROOF_OUTPUT`, `KIBI_PROOF_SNAPSHOT`, and other `KIBI_PROOF_*`
variables). Runner configurations that need proof-run-aware behavior —
disabling retries, for example — should branch on `KIBI_PROOF_RUN` instead of
inferring a proof run from output-path variables.

A `command` producer also receives `KIBI_PROOF_TEST_REPORT`. When it writes a
`kibi.proof-test-report.v1` there, each test is evaluated against its own
steps, so one failing step fails only the tests that own it. Each entry of
the summary's `runs` then carries `attribution: "per_test"` and `failedSteps`
(`testId`, `stepIndex`, `command`, `outcome`, `exitCode`). Without a usable
report the run is evaluated as one unit (`attribution: "aggregate"`, with an
`attributionReason`). See
[per-test attribution](proving-requirements.md#per-test-attribution-for-command-integrations).
Ctrl-C (or SIGTERM/SIGHUP) stops the producer's whole process group.

### `kibi proof run-steps [steps-file]`

A ready-made `command` integration producer. Reads `{test_id, steps}` entries
from the steps file (default `proof/steps.json`), runs the steps of the tests
`kibi prove` selected (`KIBI_PROOF_TEST_IDS`, or `--test <id...>` when run by
hand), each distinct argv once, and writes a `kibi.proof-test-report.v1` to
`KIBI_PROOF_TEST_REPORT`. Exit code 0 when every step passed. Steps time out
after `KIBI_PROOF_STEP_TIMEOUT_MS` (default 15 minutes).

```bash
kibi proof run-steps                 # as an integration command
kibi proof run-steps --test TEST-checkout
```

## `kibi proof inspect`

Detects languages, build systems, test frameworks (including `node --test`
and `bun test` in the scripts of `package.json` and its workspaces), CI
workflows, configured integrations, and the recommended integration level. Deterministic output for
agents. While `.kb/proof/integrations.json` does not exist and a test runner
is detected, the JSON also carries `proposedIntegration` (a `command`
integration running the `package.json` `test` script, or the detected
runner), `contractDefaults` for a test's `proof_contract`, and
`integrationPlan`: a hash-bound `kibi.migration-plan.v2` that writes the file
when applied with `kb_apply_plan` or `kibi apply-plan --input -` (pass
`plan`, `approvedPlanHash` and `approvedActionIds`). `integrationPlanReason`
says why there is no plan, or what applying it does. `--update <id>` plans
adding or replacing one named integration in an existing file. `--command`
proposes that command instead of the detected one (space-separated words, or
a JSON array of argv strings; no shell quoting). Once the file exists,
`currentIntegrations` lists each configured integration as `{ id, producer,
command }` (the text output prints the command); `currentIntegration` keeps
the comma-joined ids for older consumers. The integration only says how
evidence is produced: whether a receipt counts toward `proofTested` depends
on the test's `verification_scope` (see
[proving requirements](proving-requirements.md)).

A `command` integration is judged as one run: any failing test in it fails
every proof obligation that names the integration. When the proposal runs the
package's whole `test` script, `integrationPlanReason` says so and points at
`--command` (with `--update <id>` once the file exists) to run only the
proof-bearing tests, or at a `kibi.proof-test-report.v1` written to
`KIBI_PROOF_TEST_REPORT` for per-test results.

```bash
kibi proof inspect --json
kibi proof inspect --update e2e --json
kibi proof inspect --update unit --command "npx vitest run tests/e2e" --json
```

### `kibi proof explain`

Projects one requirement (`REQ-*`) or symbol (`SYM-*`) from the same
`kibi.requirement-proof.v5` Proof that coverage uses. Human output labels
`required_proofs`, `executable_for`, and `covered_by` as separate blocks so
agents cannot treat them as one chain. `--json` emits the structured
projection (primary plus optional secondary `covered_by` reasons). This
command does not re-evaluate qualification.

```bash
kibi proof explain REQ-EXAMPLE
kibi proof explain SYM-EXAMPLE
kibi proof explain --requirement REQ-EXAMPLE --json
kibi proof explain --symbol SYM-EXAMPLE --json
```

See [proving requirements](proving-requirements.md) for the full workflow:
proof contracts, integration configuration, the artifact reference, adapter
authoring, and troubleshooting. Playwright is an optional first-party
producer (`kibi-cli/playwright-reporter`); Kibi itself is runner-neutral.
See [the proof ladder](proof-ladder.md) for what each proof stage and status
means.

### `kibi proof compact`

One-off migration for stores written before ingest compacted receipt
histories. Applies the ingest policy (`kibi.proof-receipt-compaction.v1`) to
every test against the live workspace snapshot and each test's current
binding: it keeps the newest receipt, the newest passing receipt, and the
newest receipt per scope and contract for the current binding and snapshot,
so every coverage decision is unchanged. Only the `proof_receipts` block of
each test document is rewritten. Histories that are not structurally valid
are reported as skipped and left untouched.

```bash
kibi proof compact --dry-run   # report what would be removed
kibi proof compact
kibi proof compact --test TEST-E2E-EDITOR-001 --json
```

### `kibi proof prune`

Shrinks each test's `proof_receipts` history to its newest entries, keeping
the newest `--keep <n>` (default 1) per test and reporting the before/after
counts. Unlike `kibi proof compact`, prune counts receipts rather than asking
which ones decide proof, so it can drop a receipt that coverage still
selects. Pruned histories remain ordered, structurally valid evidence, and
current-binding rules still apply to the newest receipt.

```bash
kibi proof prune              # keep the newest receipt per test
kibi proof prune --keep 3     # keep the newest three
kibi proof prune --test TEST-E2E-EDITOR-001
```

### `kibi proof migrate-legacy`

Removes legacy `verification_receipts` frontmatter blocks from test
documents that already carry a `proof_contract`. The old blocks contain
stale snapshot hashes and make live-receipt greps error-prone. The block is
spliced out of the authored document and the compiled property is dropped —
nothing else in the document is rewritten.

```bash
kibi proof migrate-legacy
kibi proof migrate-legacy --test TEST-LEGACY-001
```

## `kibi query [type]`

Queries entities from the knowledge base.

**Syntax:**
```bash
kibi query [type] [--id ID] [--tag TAG] [--source PATH] [--relationships ID] [--format json|table] [--limit N] [--offset N]
```

**Arguments:**
- `[type]` - Optional entity type to query (req, scenario, test, adr, flag, event, symbol, fact)
- `--id ID` - Query by exact entity ID
- `--tag TAG` - Filter by tag
- `--source PATH` - Filter by source file path substring
- `--relationships ID` - Return relationships for a specific entity ID
- `--format json|table` - Output format (default: json)
- `--limit N` - Maximum number of results to return (default: 100)
- `--offset N` - Number of results to skip (pagination)

**Examples:**
```bash
# List all requirements as table
kibi query req --format table

# Find specific test
kibi query test --id TEST-mcp-search-discovery

# Find all entities with "security" tag
kibi query req --tag security --format table

# Find entities linked to a source file path
kibi query symbol --source src/auth/login.ts --format table

# Show relationships for one entity
kibi query --relationships REQ-cli-gc

# Get paginated results
kibi query scenario --limit 10 --offset 0
kibi query scenario --limit 10 --offset 10
```

**Typed fact questions** use the JSON route (`kibi query --input -`) with the same fields as the `kb_query` MCP tool: `factKind` (`predicate_schema` lists the askable predicates), `predicate` with order-free `where` arguments, `polarity`, `scope`, `distinct`, or `subjectKey` with `propertyKey`. The answer carries the matching fact rows and a `factQuery` block with the schema, distinct counts, values that exist when nothing matched, warnings and the next call to run.

```bash
printf '%s\n' '{"predicate":"permission_rule","where":{"actor":"admin"}}' | kibi query --input -
printf '%s\n' '{"subjectKey":"user.role_assignment","propertyKey":"max_roles"}' | kibi query --input -
```

**Notes:**
- Returns "No entities found" if query produces no results
- Results are deterministically ordered
- Type, ID, and tag filters can be combined

## `kibi search <query>`

Searches entity metadata and markdown body text for exploratory discovery. The JSON route defaults to deterministic intent-v1 ranking, which accepts natural-language questions, host-agent facets, and changed source locations, and adds an answer layer; pass `"rankingMode": "legacy"` for lexical ranking.

**Syntax:**
```bash
kibi search <query> [--type TYPE] [--format json|table] [--limit N] [--offset N]
```

**Notes:**
- Searches markdown-backed knowledge and metadata
- Does not search raw code file bodies
- Use `kibi query` for exact follow-up lookups

Intent mode is the default for `kibi search --input -`:

```bash
printf '%s\n' '{
  "query": "what governs downloading a report?",
  "semanticFacets": {"actions": ["export"], "objects": ["CSV file"]},
  "sourceLocations": [{"path": "src/reports/export.ts", "line": 42}]
}' | kibi search --input -
```

Intent results include `queryAnalysis` (with `ambiguous` read from `topRivalMargin`, the margin to the best match the top match is not linked to), matched semantic facets, source-location evidence (the requirements a located symbol `implements` match too), bounded traceability graph paths, `count` (the whole ranking), `returned` (this page), `truncated`, and `abstained: true` when no result reaches `minScore` (default `0.18`). Superseded and deprecated entities are demoted. Source paths must be workspace-relative. The host agent supplies facets; Kibi does not call a model.

On the first page, `data.answer` (`kibi.search-answer.v1`, on by default; `"answer": false` turns it off) lists the current `governing` requirements with `via` and their linked `facts`, `scenarios`, `tests` (including scenario-backed tests, each with `via`), and `adrs`, plus each requirement's `verdict` (`contradiction`, `infeasible`, `unknown` or `none`, with the contradiction and scenario-feasibility `witnesses` that name it), `exceptions` (requirements that exempt it, with `approvedBy`) and `unknowns`; `rationale` ADRs with their `source` and a decision `excerpt`; `notGoverning` superseded or deprecated requirements with `supersededBy`; `observations` (notes, not rules); `ungoverned` matched facts, scenarios, symbols and tests no requirement owns, with their `rank` (when the top match is one, the `note` says the governing list came from lower-ranked matches) and, for an unlinked fact that disagrees with a governing requirement's fact on the same key arguments, `overriddenBy` naming the fact that holds; `scope` (`branch`, `snapshotId`, `syncedAt`); `truncated`; and a `note`. The layer follows graph links and runs the existing checks for the governing requirements only: it is discovery, not proof, and a `none` verdict means no check named the requirement. See the [MCP reference](mcp-reference.md#kb_search) for details.

## `kibi status`

Reports the current KB snapshot, branch, and freshness state.

**Syntax:**
```bash
kibi status [--format json|table]
```

JSON output also exposes `proofSnapshot`, availability, dirty state, file count, and `kibi.workspace-snapshot.v2` version. This deterministic snapshot is the identity coverage uses to accept or reject proof receipts; an unavailable snapshot fails proof closed. Receipt-only frontmatter changes are excluded from the hash so ingesting a receipt cannot invalidate its own proof.

Status also reports the exact `branchAttachment` (`gitBranch`, `kbBranch`,
`kind`, and `migrationRequired`), bounded `staleReasons`, and
`proofSnapshotChanges`. A legacy attachment is read-compatible only;
writes and sync are blocked until the sanctioned migration is applied. Dirty
editor/config paths are reported rather than silently ignored.

Sync stamps the compiler contract it used (a hash of the entity property
schema) into the branch store. When the store was compiled by a CLI build with
a different contract, for example an older build that dropped properties it
did not know, status reports `syncState: "stale"` with a `compiler_changed`
reason even though every source hash still matches. After upgrading to a CLI
whose entity schema changed, every branch store compiled by the older CLI
reports it once. The next `kibi sync` re-imports every source once and clears
it, and the status migration plan covers it with its automatic
`freshness-resync` action (`kibi sync`), so applying that action clears it
too; it gets no review action of its own.

Status does not initialise a missing branch store or repair a damaged one. It
instead returns `branchStore` (`missing`, `incomplete`, or `unreadable`) with a
recovery-oriented stale reason. Use the explicit branch commands below after
reviewing that diagnosis.

Kibi compiles one store per branch and never copies another branch's, so a
branch created without the `post-checkout` hook starts with no store (and the
first engine attach creates an empty one, `generation-1:0`). While `.kb/` holds
authored sources, status reports that state as one blocking stale reason,
`branch_store_not_compiled`, whose remediation is `kibi sync` (the missing or
empty store also reads `syncState: "stale"`), and the migration plan carries an automatic
`branch-store-compile` action (`kibi sync`) that runs after
`branch-store-ensure` and any schema upgrade. `kibi check` reports the same
state once, as the canonical `branch-store-not-compiled` violation, instead of
running rules against an empty KB (which used to report every authored
relationship as a `source-relationship-parity` violation).

When migration is needed, JSON status also returns `schemaStatus` and a
`kibi.migration-plan.v2` `migrationPlan`. Actions are typed with a canonical
`planHash`, dependencies, safety class, preconditions, postconditions, and
exact operation/CLI guidance. Status remains read-only.

The plan's `schema-config-upgrade` action runs `kibi migrate --yes`, so it
declares everything that run writes. Its `affectedFiles` list `.gitignore`
(the run adds the canonical derived entries) beside the manifest, config and
`.kb/migrations`. When the schema is behind on the canonical `.kb/` layout,
the authored-source rewrites the run performs are planned as their own
actions, the same ones `kibi migrate --format json` lists, each with its own
files: for example `symbol-legacy-link-mark` (`.kb/symbols.yaml`),
`entity-origin-backfill`, `close-superseded-requirements` and
`source-path-rewrite`. The upgrade depends on them, so approving it without
them is refused, and their passes inside the run are no-ops. While the
upgrade still moves legacy knowledge into `.kb/` or waits on an operator, it
lists `.kb/` instead and says so in `evidence.sourceRewrites`. Applied through
`kb_apply_plan`, the upgrade's `actionResults[].detail` is read from the
migration audit record, for example `Migrated schema 8 -> 9 (audit
.kb/migrations/main.json): legacy-link marks 0, origin backfill 0, superseded
requirements closed 0, source paths rewritten 0, source paths removed 0;
.gitignore updated.`

## `kibi find-gaps [type]` (`gaps` alias)

Runs curated missing/present relationship analysis.

**Syntax:**
```bash
kibi find-gaps [type] [--missing-rel RELS] [--present-rel RELS] [--tag TAGS] [--source PATH] [--limit N] [--offset N] [--format json|table]
```

**Examples:**
```bash
# Requirements missing scenarios or tests
kibi find-gaps req --missing-rel specified_by,verified_by --format table

# Source-linked gap analysis
kibi gaps req --source src/auth --missing-rel verified_by --format table
```

`--missing-rel` and `--present-rel` count a relationship in either direction and treat `verified_by` and its documented inverse `validates` as satisfying each other, so a requirement whose test `validates` it is not reported missing `verified_by`; `relationshipCounts` keeps one count per relationship name.

`find-gaps` is the canonical command name and dedicated JSON route. `gaps` is a true Commander alias for the same action, so flag and `--input` behavior are identical under either spelling.

The JSON payload carries `rows` (the current page), `count` (matching rows before pagination), `summary` (`total`, the same number, and `provenanceStubs`, the bootstrap facts tagged `bootstrap:provenance-stub` that match the filters but are counted apart from knowledge; they enter `rows` only when `--tag` names that tag) and `meta`.

## `kibi coverage`

Generates curated coverage reports.

**Syntax:**
```bash
kibi coverage [--by req|symbol|type] [--tag TAGS] [--include-passing] [--status STATUSES] [--no-include-transitive] [--limit N] [--offset N] [--include-migration-preview] [--migration-limit N] [--migration-offset N] [--migration-predicate-limit N] [--migration-predicate-min-score 0..1] [--format json|table]
```

**Notes:**
- Requirement coverage summaries distinguish evaluated must-priority requirements from `not_applicable` rows. The link counts (`evaluated`, `fullyCovered`, `notApplicable` and the `missing*` gaps) judge only `priority: must` requirements, and the summary says so with `linkCoverageScope: "priority_must"`; the table titles that group `Links (priority: must)`. A KB without must-priority requirements reads `evaluated: 0` there while `evidenceLevels` and `proofTested` still count every requirement.
- `--include-passing` adds rows with a tested or not-applicable proof outcome back into requirement results; compatibility-oriented structural coverage remains visible on every returned row.
- `--status <statuses>` (comma-separated: `tested`, `missing`, `unresolved`, `not_applicable`) selects requirement rows by `proofStatus` and implies include-passing. Use it to enumerate one slice — e.g. `kibi coverage --by req --status not_applicable` lists every out-of-scope requirement with its typed applicability reason (`proofStages.applicability.reason`: superseded, a status-vocabulary mismatch, or a proof exemption). The summary always reflects the whole KB; pagination applies to the filtered rows.
- Requirement coverage rows include coverage-depth labels when evidence can be classified: `direct_passing_e2e`, `scenario_passing_e2e`, `unit_only`, `open_or_nonpassing_tests_only`, `scenario_only_no_test`, or `no_test_evidence`.
- Coverage-depth labels are informational. They do not change existing covered/uncovered pass-fail semantics, and typed test fields (`verification_scope`, then `verification_perspective`) take precedence over legacy `e2e` tags or `/e2e/` path heuristics.
- Requirement rows also expose the additive `kibi.requirement-proof.v5` contract. `proofStatus` is `tested` (named `proven` before v4), `unresolved`, `missing`, or `not_applicable` for a non-current requirement, and is intentionally independent from compatibility-oriented `coverageStatus`. Each row also carries `evidenceLevel` (`proved`, `tested`, `asserted` or `unverified`) and the `evidence[]` entries that earned it, and the summary counts rows per level under `evidenceLevels`; `proofTested` (named `proofProven` before v4) counts tested rows. From v5 each row also carries `claimEvidence[]`, `claimSummary` and `unprovedClaims` (a requirement is proved only when a certificate binding derives every applicable claim), the summary totals them under `proofClaims`, and the table's Evidence column shows `n/m claims proved`. The summary also counts current requirements with an evidence floor under `evidenceFloors` (`met`, `below`, `pendingReproof`; a floor of `unverified` is not counted), and the table's Floor column shows each row's floor and status (for example `tested pending reproof`). See `docs/proof-ladder.md` for the per-stage semantics and the evidence levels.
- `proofStages` records semantic inventory, logical grounding, contradiction, scenario, scenario-test, passing E2E, executable-symbol, production-symbol, and exact source-coordinate evidence. `proofGaps` lists only blocking issues that prevent `tested`. The passing-E2E stage exposes per-scenario `scenarioObligations`; every linked E2E proof-bearing test is mandatory, while unit/integration-only ancillary tests remain nonblocking when the scenario has qualifying E2E evidence. `proofAdvisories` is reserved for explicitly non-blocking context; missing, stale, failed, invalid, snapshot-unavailable, and contract-mismatched E2E evidence remains in `proofGaps`. `proofRepairs` ranks concrete recovery actions for blocking gaps only.
- Requirement reports also include `repairPlan` (`kibi.repair-plan.v1`). It groups gaps into one small batch per requirement and dependency phase, marks only the earliest unresolved batch `ready`, and links later batches through `dependsOn`. Every batch is read-only guidance with `autoApplicable: false`, a reviewed `workflowSteps` sequence, targeted `validationRules`, and a sequential-write policy.
- Requirement and symbol reports also include the shared `migrationPlan` (`kibi.migration-plan.v2`). Apply only ready automatic actions after explicitly approving its exact hash and action IDs; review, operator, and E2E execution actions remain agent/operator work.
- `repairPlan.scope.complete` is false and `status` is `partial` whenever `limit`/`offset` exclude actionable requirements. Increase the limit and reset the offset before using a plan as a project-wide migration inventory. The plan ID is stable for the same snapshot, filters, evidence, and gaps; receipt ages and check timestamps do not churn it.
- `--include-migration-preview` adds `kibi.legacy-migration-plan.v1` for ready semantic-inventory batches. It defaults to one requirement, reconstructs normalized authored Markdown with exact SHA-256 source identity and UTF-8 proposition spans, ranks project-local schemas before built-ins, and emits review-only property patches. The patch stores authored prose in requirement-only `semantic_text` and never replaces an independent `text_ref`; only an existing `semantic_text` that differs from the current normalized Markdown blocks the batch as source drift. All candidates remain `writeEligible: false` and all batches `autoApplicable: false`.
- The passing-E2E stage requires append-only proof-receipt history for every linked scenario-backed E2E test. New evidence is produced by `kibi prove` as `kibi.proof-receipt.v1`. Only a fresh passed receipt bound to the live `proofSnapshot`, current contract hash, and effective execution fingerprint qualifies; authored `status: passing` remains structural metadata.
- Symbol rows classify `traceabilityRole` as `production`, `executable_test`, or `mixed`. Executable-only test symbols are `not_applicable` to production coverage instead of being counted as fully covered.

## `kibi report`

Generates a polished, self-contained HTML view of requirement health and a
matching SVG badge. This is a human-facing presentation command over the
existing `kb_coverage` operation, not an additional JSON/MCP operation.

**Syntax:**
```bash
kibi report [--output PATH] [--open] [--tag TAGS] [--limit N] [--certificates FILE]
```

**Options:**
- `--output <path>` writes to an HTML file or to `index.html` inside a directory. Directory output also writes `badge.svg`; explicit file output writes `<name>.badge.svg` beside the HTML. The default is `kibi-report/index.html` plus `kibi-report/badge.svg`.
- `--open` opens the report with the operating system's default browser after the file is written successfully.
- `--tag <tags>` limits requirement and symbol health to comma-separated tags.
- `--limit <n>` sets the maximum complete requirement row set. It defaults to 10,000 and fails instead of publishing partial per-requirement metrics.
- `--certificates <file>` publishes a `kibi.certificates.v1` bundle written by `kibi check --write-certificates` next to the report (`kb-certificates.json`, or `<name>.kb-certificates.json` beside an explicit HTML file) and links it with its certificate count per kind. The report does not re-check the bundle; `kibi check --certificates` does.

**Report contents:**
- The tested percentage and count use current requirements only; superseded and otherwise non-current requirements are reported as excluded rather than lowering the score.
- Summary metrics show current requirements, requirements tested end to end, requirements proved by certificate, asserted or unverified (by evidence level), requirements below their evidence floor or pending re-proof, missing scenarios, stale E2E evidence, unique contradiction witnesses, unmapped production symbols, and requirements without implementation.
- Requirement cards separate semantic grounding, scenario, implementation, E2E-test, and fresh-receipt stages, plus a certificate stage when a test carries a certificate (its proof kinds and claims proved). Each card shows the evidence level, the evidence floor and whether it is met, below or pending re-proof (`*` marks a floor set by `required_evidence` rather than the firm default), a `Proved` badge for proved requirements, and any certificate or claim-binding rejections. Cards below their floor sort right after contradictions. Search, health filters (proved, tested, needs attention, below floor, pending re-proof, stale, contradictions), and proof-gate filters run entirely in the generated file. Filter buttons include counts. Relative evidence and generation ages are computed in the viewer from preserved absolute timestamps.
- Stale KB state and dirty workspace proof evaluation are shown as a prominent snapshot warning.
- Stale KB state and dirty workspace proof evaluation are shown as a prominent snapshot warning.
- All KB-provided values are HTML-escaped. The report has no CDN, font, script, or other network dependency, so the output directory can be hosted as-is.
- The generated SVG badge uses the same complete coverage snapshot as the report. It pairs the Kibi logo with a `kibi` label in Codecov/Shields chrome (regular 11px type, `#555` label pane, reserved padding, and white status text), sizes itself to the tested-percentage message (`87% tested`), and uses conservative colors: red for a contradiction or a requirement below its evidence floor, amber for a stale snapshot.

**Examples:**
```bash
# Generate kibi-report/index.html and open it
kibi report --open

# Write the single-file site to a CI staging directory
kibi report --output public/requirement-health

# Publish a focused report
kibi report --tag billing,security --output artifacts/kibi.html
```

For GitHub Pages, follow the copyable workflow in
[docs/examples/github/kibi-report.yml](examples/github/kibi-report.yml) or run
`kibi init --github`. That command scaffolds the same documented integration.
Pull requests generate and validate `kibi report`, then upload `kibi-pr-report`;
only the default branch publishes the canonical Pages site. Enable
**Settings → Pages → Source → GitHub Actions**. Details, package-manager
adaptations, owner-site URLs, and the badge-only opt-out are in
[GitHub badge + report](github-integration.md).

Wrap the published badge image in a link to the report so clicking it opens the
dashboard:

```markdown
[![Kibi requirement health](https://OWNER.github.io/REPOSITORY/kibi-report/badge.svg)](https://OWNER.github.io/REPOSITORY/kibi-report/)
```

Actions artifacts expire and do not provide a stable anonymous URL, so the
badge and its target should use the GitHub Pages deployment rather than the
ordinary downloadable artifact. The Pages URL must be anonymously reachable for
the badge to render in a public README; use an appropriate authenticated static
host when the report must remain private.

## `kibi signoff`

Shows the person what they are signing off on, in one readable view. Agents
run it before asking for signoff at the end of a change, and with
`--questions` whenever decisions about rules wait for the person. It is a CLI
command, not an MCP operation; the `kibi-decisions` and `kibi-commit-review`
skills say when to run it. It reports and never blocks.

**Syntax:**
```bash
kibi signoff [--staged] [--format chat|md|html|json] [--output PATH] [--open] [--no-proof]
kibi signoff --questions <path|-> [--format chat|md|html|json] [--output PATH] [--open]
```

**Summary view (default):** lists each requirement the change adds, rewrites
or retires (from the Git diff of `.kb/requirements/` against `HEAD`, with
untracked files; `--staged` uses the index), and each current requirement the
changed code implements whose document did not change. Each entry quotes the
statement (the previous one too for a rewrite) with its firmness, origin,
replaced requirements, scenarios and proof state. The proof state names the
evidence level, the evidence floor and whether it is met (a floor lowered with
`required_evidence` says so, since approving the requirement accepts it), and
any certificate that no longer re-checks. `--no-proof` skips the proof
lookup, which runs a full coverage pass and can take tens of seconds on a
large knowledge base.

**Questions view (`--questions`):** reads JSON from a file or stdin (`-`):
`{"questions":[{"id"?, "title"?, "statement", "quote"?, "firmness"?, "governs"?, "conflictsWith"?, "question"?, "answer"?}]}`
or a bare array. Each decision is numbered, and the view quotes the recorded
requirement it changes (`id`) or conflicts with (`conflictsWith`) next to the
proposed statement and the person's own words. Decisions with an `answer` are
shown as answered, so the agent can re-render the view as the person replies.

**Output:**
- `chat` (default) prints the view as plain Markdown (headings, quoted
  statements, lists) for the agent to put in its reply, or in a messaging
  tool's message when replies go through one. Any Markdown surface renders it.
  The path of the HTML page goes to stderr, so stdout stays pasteable. Long
  summaries stop after 15 entries and point to the HTML page.
- `md` prints the same Markdown inside a fenced `kibi-signoff` or
  `kibi-questions` block, for hosts whose plugin draws that block (the
  OpenCode terminal). Elsewhere a fence shows as raw code.
- `html` writes a self-contained page (no network, strict content security
  policy) and prints its path; `--output` chooses the file and `--open` opens
  it in the default browser.
- `json` prints the `kibi.signoff.v1` view.

`KIBI_SIGNOFF_FORMAT` (`chat`, `md`, `html` or `json`) sets the default
format for a host.

Every run also writes `.kb/briefs/signoff/latest.json`, `latest.md` and
`latest.html`, which `kibi init` already ignores in Git. `latest.html` is a
self-contained page, so an agent whose host can carry a file or publish a
page can attach it next to the Markdown. The host integrations build on these
files:

| Host | What it offers |
| --- | --- |
| Claude Code | `/kibi-signoff`; a fenced block still renders as Markdown through the `MessageDisplay` hook |
| Cursor, ZCode | `/kibi-signoff` |
| OpenCode | The fenced block (`--format md`) drawn as a framed card, `/kibi-signoff`, and a toast for each new view |
| VS Code (and Cursor with the extension) | The **Kibi: Show Requirements Signoff** panel |
| Claude Code, Codex, Cursor, ZCode hooks | After a session writes a requirement, the stop hook asks once for `kibi signoff` unless it already ran since |

**Examples:**
```bash
# Summary of the working tree for the end-of-work signoff
kibi signoff

# The fenced block for the OpenCode terminal card
kibi signoff --format md

# Staged change, as a page in the browser
kibi signoff --staged --format html --open

# Decisions waiting for the person
printf '%s' '{"questions":[{"id":"REQ-042","statement":"Exports stay in CSV.","quote":"keep CSV for now","firmness":"firm"}]}' \
  | kibi signoff --questions -
```

## `kibi graph`

Runs bounded graph traversal from one or more seed IDs.

**Syntax:**
```bash
kibi graph --from IDS [--relationships RELS] [--direction outgoing|incoming|both] [--depth N] [--entity-types TYPES] [--max-nodes N] [--max-edges N] [--format json|table]
```

**Examples:**
```bash
# Follow requirement links outward
kibi graph --from REQ-cli-gc --direction outgoing --depth 2 --format table

# Inspect both incoming and outgoing relationships
kibi graph --from REQ-mcp-search-discovery,TEST-mcp-search-discovery --direction both --depth 2 --format json
```

## `kibi check`

Validates knowledge base integrity and runs inference rules.

**Behavior:**
- Validates required fields are present
- Checks requirement coverage (must-priority rules)
- Detects dangling references (entities that reference non-existent IDs)
- Detects cycles in dependency graphs
- Enforces `strict-fact-shape` as a canonical blocking check and supports advisory modeling checks (`strict-req-fact-pairing`, `predicate-verifiability`, `proof-contract-symbols`) that run by default as non-blocking `qualityDiagnostics` (a requirement constraining a subject fact is paired by a `requires_property` fact on that `subject_key` or a `requires_predicate` fact about it: the predicate fact's own `subject_key`, else the argument its project-local schema names `subject`, else its first argument), and default-off migration diagnostics (`strict-readiness`, `semantic-completeness`) that run only when explicitly selected with `--rules`. Canonical rules always populate blocking `violations[]`. `--rules` is an invocation-time diagnostic filter only; leftover `.kb/config.json` cannot disable canonical checks. `proof-contract-symbols` reports unresolved `required_proofs.symbol_id` values, type-shape required proofs, and `proof_bindings.source_file` disagreement with the named symbol `sourceFile`. Kibi does not infer TEST names from filenames.
- Runs the canonical `scenario-feasibility` check (a success scenario whose assumed values cannot hold, alone or together, with the property facts and typed rules of current requirements that govern it, by scope and validity window) and two advisory analysis-gap checks by default: `scenario-feasibility-unknown` (a success scenario whose feasibility cannot be decided: no assumptions, contradictory assumptions, an unconstrained or incomparable assumption, conflicting governing requirements, a rule the assumptions neither satisfy nor refute, or a conflict only with constraints whose validity window may not cover the scenario) and `rule-key-arguments-missing` (an opposing rule pair left `unresolved` only because a condition predicate declares no `key_arguments`; the finding names the predicate as `namespace:name/arity` and the key positions that would decide the pair). Both advisory checks report non-blocking `qualityDiagnostics`.
- Runs the canonical `exception-claim-keys` check (an exception requirement's `exempts_claims` must name claims of a requirement it `exempts`) and the advisory `numeric-string-value` check (a `property_value` fact stores a plain decimal as `value_type: string` where the comparison is numeric, so contradiction and feasibility checks skip it; the suggestion gives the typed `value_int`/`value_number` replacement).
- Runs two canonical lifecycle checks: `superseded-requirement-open` (a requirement that another requirement `supersedes` must have `status: closed`; requirements that supersede each other, directly or through a chain, are reported once per cycle with every member and edge, and their members are not reported again as open; `no-cycles` follows only `depends_on`) and `source-path-dangling` (an authored `source` frontmatter field must name an existing workspace path, with any `#anchor` ignored, an existing entity id, or an http(s) URL; a missing `source` is fine). The authored field is dead data: the compiled `source` is always the entity's own file, and Kibi never writes the field, so `kb_upsert` cannot change it. Each `source-path-dangling` finding therefore names the automatic fix in its evidence: `rewrite` when the value names a knowledge file by its pre-canonical path (`documentation/<lane>/...` or `<lane>/...` relative to the knowledge root) and that file exists under `.kb/<lane>/` and is not the entity's own file, otherwise `remove` (`self` when the value names the entity's own file, `dangling` when it names nothing Kibi can map). The same rule covers `text_ref` when its value is shaped like one workspace file path (a directory, a file name with an extension, no spaces; a `#anchor` is ignored) and that file does not exist; prose, entity ids, URLs and lists in `text_ref` are never judged. `text_ref` is evidence, so Kibi never removes it: a pre-canonical knowledge path whose file exists under `.kb/` gets `evidence.rewrite` (with `evidence.field: text_ref`), and anything else gets `evidence.refused` and a review action for a person. A `text_ref` that is a requirement's semantic source (declared `semantic_source_field: text_ref`, or a requirement without `semantic_text`) is never rewritten automatically, since that changes the inventory hash. Both checks block, and `kibi migrate` repairs them (see below).
- Runs the canonical `entity-context-missing` check on authored sources: a current `req`, `scenario`, `test`, `adr` or observation/meta `fact` needs at least 12 words of body context that do not restate its title (requirements: only text under `Context`, `Rationale`, `Why`, `Background`, `Source`, `Notes` or `Evidence` headings). Entities the schema 8 migration acknowledged (tagged `review:context-missing` and recorded in `.kb/manifest.json` as `contextAcknowledged`) are counted by the info diagnostic `entity-context-acknowledged`; the tag on any other entity is still a violation.
- Runs four canonical decision-firmness checks on authored requirements and ADRs (KB schema 9): `decision-firm-unreferenced` (a current decision marked `firmness: firm` must name the human words it rests on in `origin.ref`, or `approval_ref` on a requirement), `decision-firm-superseded` (a decision that supersedes a firm one, retired or not, must itself be firm; from KB schema 10 a decision without `firmness` is firm unless an agent wrote it, and the supersedes of such decisions recorded before schema 10 are acknowledged in `firmSupersedeAcknowledged`), `decision-firm-edited` (a decision that was firm at `HEAD` must not have its title, stated meaning, an ADR's body or its firmness changed in the working tree unless the edit cites new human words in `origin.ref` or `approval_ref`; `kb_upsert` refuses such a write up front) and `supersedes-reason-missing` (a current decision that supersedes another needs a `## Why this changed` section of at least 12 words naming the evidence). Supersede edges the schema 9 migration acknowledged (`supersedesReasonAcknowledged` in `.kb/manifest.json`) are counted by the info diagnostic `supersedes-reason-acknowledged` instead. See [Decision firmness](entity-schema.md#decision-firmness).
- Runs the canonical `kb-consistency` check: the facts current requirements name must hold together, jointly and not only pairwise. Each run produces a `kibi.certificates.v1` bundle (a model or an irreducible contradiction core per property context, a truth value per predicate atom, a decision per decision key, a stratum assignment or a negation cycle for the stored rules) and re-checks it with the independent checker. A re-verified contradiction is a blocking violation that names the core facts, the requirements behind them and one model per dropped fact, with the certificate under `evidence.certificate`; a certificate the checker rejects also blocks. The advisory `kb-consistency-unresolved` check reports each context the checker cannot compare (mixed value types or units, an unsupported operator or polarity, a contradiction whose validity windows never overlap) as a non-blocking diagnostic; it never counts as consistent. See [Knowledge-base certificates](./proof-ladder.md#knowledge-base-certificates).
- Runs the canonical `evidence-floor` check (KB schema 11): every current requirement's evidence level (`proved`, `tested`, `asserted`, `unverified`) must reach its floor, which is `required_evidence` when set, otherwise `tested` for a firm requirement and no floor for any other. A requirement whose receipts are only older than the code counts as pending re-proof and passes unless `--fresh-evidence` is given. Each finding names the level, the floor and where the floor came from, and its suggestion says what would raise the level. See [Evidence floors](./proof-ladder.md#evidence-floors).
- Runs the canonical `related-requirement-unmodeled` check: a current requirement whose proposition ledger still carries `status: missing` entries while it `relates_to` (in either direction) a current requirement modeled with contradiction-ready strict facts or ground predicate facts is a blocking violation, because `domain-contradictions` compares grounded facts only and would never compare the two. The finding names the modeled `subject_key.property_key` and predicate canonical keys and asks for the missing propositions to be modeled against them or for a `supersedes` decision. Requirements without a ledger stay in the `strict-readiness` migration lane; ledgers whose assertive propositions are modeled or explicitly classified, neighbours that model nothing, and superseded neighbours are not reported.
- Runs four advisory lifecycle checks by default: `symbol-owner-superseded` (a symbol whose every `implements` target is superseded or deprecated, so no current requirement owns it; a `closed` requirement is done, not retired; up to 25 symbols per check, then one summary finding), `adr-unlinked` (an accepted ADR that no requirement or other ADR links with, in either direction; a symbol's `constrained_by` link does not count), `adr-proposed` (info: an ADR still `proposed` and not superseded) and `requirement-rationale-missing` (a current requirement whose `origin.kind` is `human` or `agent` has no `rationale` field, no `## Rationale`, `## Why` or `## Context` section in its body, and no link to an ADR; up to 25 per check, then one summary finding). Imported and migrated requirements are not asked for a rationale.
- Runs three advisory approval checks by default, all non-blocking: `exception-unapproved` (a current exception requirement `exempts` another requirement but has no `approved_by`, so it exempts nothing), `exception-approval-self-attested` (an exception whose `origin.kind` is `agent` records `approved_by`, but `origin.approved_by` or `approval_ref` is missing, so nothing corroborates that a person approved it) and `agent-requirement-unapproved` (info: current requirements with `origin.kind: agent` and no `origin.approved_by`, listed by id up to 25 per check, then one summary finding with the remaining ids). Kibi cannot verify that a person approved anything; these checks make agent-recorded approvals visible so a human can confirm them.
- Runs two canonical check-policy rules, inert unless a package is activated for `kibi.check-policy.v1` (such as the experimental `kibi-plugin-ui`): `policy-ownership` (a production symbol in the policy's file set must implement a current requirement grounded in one of its predicates, unless tagged with the policy's exempt tag) and `policy-markers` (a file implementing a requirement that names a pattern must contain every marker the KB declares for it, in the file or its declared sibling templates). Kibi reads the policy as JSON from the package and never imports plugin code; a policy that cannot be read blocks. See [plugin-development.md](./plugin-development.md#check-policy).
- Runs vocabulary-convergence checks by default, all advisory and non-blocking (see [Vocabulary convergence checks](#vocabulary-convergence-checks)): `domain-redundancy`, `subject-key-identity`, `subject-key-shape`, `entity-id-style`, `predicate-schema-conformance` (warnings) and `domain-implication`, `ontology-quality` (info).
- Runs the canonical, blocking symbol-to-source check `symbol-granularity`, which reads each judged symbol's working-tree `sourceFile` with the same source analyzers as `kibi check --staged`: a symbol with `implements`, `covered_by` or `executable_for` links and no allowed `granularity_reason` violates it when it covers its file coarsely while narrower behavioral declarations exist, including when its `title` names no declaration the extractor produces (a private class member, or a removed, renamed or non-exported declaration). It is the staged gate's `symbol_granularity_violation`, evaluated for every symbol with every declaration of the file as a candidate. A file the analyzers cannot fully analyze is skipped. Only the source files of judged symbols are parsed, once per check and for syntax only, so the rule adds a few seconds to a full check.
- With `--staged`, inventories every index path before analysis. TypeScript and JavaScript keep their blocking symbol checks; Kibi metadata is validated through its typed lanes; every other readable UTF-8 text file receives advisory file-level ownership and impact-evidence checks.
- With `--staged`, runs the full-check `symbol-coverage` rule on the staged knowledge for every changed symbol: each changed source symbol and each symbol whose staged `.kb/symbols.yaml` entry changed. It is the same Prolog rule, so a direct `verified_by(Req,Test)` or `validates(Test,Req)` does not count once the requirement has a scenario, and the requirement/scenario/test graph is read from the index, not the working tree. A clean `kibi check` therefore does not leave a coverage gap for the next commit to trip over, and the staged gate does not pass coverage the full check rejects.
- With `--staged`, a staged entity document or relationship shard under `.kb/` also runs the `domain-contradictions`, `scenario-feasibility`, `exception-claim-keys` and `kb-consistency` rules on the staged tree and blocks on each violation the last commit's tree does not already have. Violations already committed are left to the full check, so they do not block unrelated commits.
- With `--staged`, each staged entity document (requirement, scenario, test, ADR, observation or meta fact) is checked with `entity-context-missing`, reading only the file. A finding blocks when the entity did not already have it at the last commit's tree; entities listed under `contextAcknowledged` in the staged `.kb/manifest.json` are exempt, so a migration commit passes.
- Staged deletions and renames retain committed content and ownership for removal review. Binary blobs, unsupported encodings, symlinks, and submodules are reported with explicit skipped reasons and remain non-blocking.
- Reports blocking `violations[]` with actionable suggestions and additive `qualityDiagnostics[]` audit signals for modeling quality, coverage depth, broad requirements, duplicate coordinates, symbol fanout, and strict-fact review
- When `.kb/usage.log` exists, an unfiltered check also turns failed or insufficient `kibi.telemetry-acceptance.v1` metrics into ranked, non-blocking `category: telemetry` quality diagnostics; a missing log is skipped because diagnostic logging is opt-in
- Keeps advisory quality diagnostics non-blocking by default: `review`, `info`, and non-blocking `warning` diagnostics do not change the exit code; hard violations, `severity: "error"`, or `blocking: true` still fail the check

**Flags:**
- `--staged` - Only check staged files (not whole repo)
- `--kb-path <path>` - Path to KB directory (optional)
- `--rules <rule1,rule2>` - Comma-separated list of rules to run (optional)
- `--min-links <N>` - Minimum requirement links per symbol for staged traceability (default: 1)
- `--dry-run` - Show staged-traceability effects without modifying files
- `--format json|text` - Output structured JSON for integrations such as OpenCode scheduled checks, or human-readable text output (default: text)
- `--fresh-evidence` - The `evidence-floor` rule judges proof receipts as they are: a requirement whose receipts are only older than the code fails instead of counting as pending re-proof, and the proof snapshot must be clean. Run it right after `kibi prove`
- `--write-certificates <file>` - Also save the `kibi.certificates.v1` bundle the `kb-consistency` rule re-checked (not with `--staged`)
- `--certificates <file>` - Only re-check a saved bundle against the current KB with the independent checker and print the `kibi.verification.v1` report (one verdict per theorem: `proved`, `disproved` or `unresolved`, and every rejected certificate with the reason; `--format json` prints it as JSON). Exits 1 when a certificate is rejected or missing or a theorem is disproved; cannot be combined with `--write-certificates`, `--staged` or `--rules`

### Staged Impact Evidence

When `kibi check --staged` reports `kibi_impact_evidence_missing`, first use Kibi discovery (`kb_search`, then `kb_query`) through visible MCP tools or trusted CLI JSON routes to inspect existing requirements, scenarios, tests, facts, and symbols for the edited source file. If the edit changes behavior, update the KB through either peer surface and also stage tracked evidence that the commit can carry: related entity markdown under `.kb/` or authored `.kb/symbols.yaml` entries. An edit to a file whose every declaration already has a `.kb/symbols.yaml` entry (and whose entries all still name a declaration) needs nothing more: coordinates are derived locally and never staged.

Both `kibi_impact_evidence_missing` and `symbols_manifest_stale` carry `Detail:` lines that name the cause per file: how many symbols the extractor finds in the staged source content, how many of those the staged evidence covers (evidence-only entries are listed separately and not counted), and exactly which symbols are missing from `.kb/symbols.yaml` (with their definition lines). When the Detail lines list uncovered symbols, fix the cause first — author `.kb/symbols.yaml` entries for those symbols (`kibi upsert`, with `implements`/`covered_by` links) — and re-point or retire entries listed as evidence without a matching symbol; the same comparison drives the printed `Suggestion:`. The comparison is by symbol title: coordinates are derived, so a declaration that only moved is never a finding. Detail lines name every symbol, never a shortened list; the `--json` diagnostic `evidence` (`symbolsManifest[].missing`/`extra`, `uncoveredSymbols[].titles`) carries the same complete lists.

While a merge commit is being made (`MERGE_HEAD` exists, for example after resolving conflicts), `kibi check --staged` judges only what the merge itself changed: staged files whose content equals a merged parent's are taken from that parent unchanged, sit in the comparison base, and are neither listed nor checked. The output says how many files were skipped this way (`Merge commit: N staged file(s) are taken unchanged from the merged branch ...`); any debt in them was inherited from that branch. A file the merge resolved or edited is judged in full.

When the staged change moves knowledge files into the canonical `.kb/` layout, as the first commit after `kibi migrate` does, `kibi check --staged` compares each moved file with its committed content at the old path instead of treating it as new. A move qualifies when Git detects it as a rename (or, for a small file the move also rewrote below Git's similarity threshold, when exactly one deleted file and one added file share the file name), the old path is outside `.kb/`, and the new path is the same kind of knowledge file: an entity document into the `.kb/` lane of the same name (`docs/requirements/REQ-x.md` to `.kb/requirements/REQ-x.md`), or `symbols.yaml` / `symbol-coordinates.yaml` onto the canonical file. Only the edits the commit made inside those files are judged, so the move is not blocked by findings the files already had, for example `symbol-coverage` for every symbol of a migrated manifest. A manifest record the commit adds or changes, including records migration rewrites, is still checked in full. The output starts with `Baseline: HEAD with N staged knowledge rename(s) into .kb/ resolved ...`; full `kibi check` still reports the pre-existing findings. Renames inside `.kb/` and edits to files that were already canonical are compared with HEAD as before.

When the staged commit carries a `kibi migrate` run, a symbol record whose only differences from its base are fields the migration writes mechanically is not counted as changed by the commit: a `granularity_reason: legacy-link` the base did not have, and an added `review:context-missing` tag (`origin`, a removed dead `source` and a pinned `semantic_text` are not part of the compared symbol record). The output then also starts with `Migration commit: N symbol record(s) changed only by kibi migrate ... are not judged as changed by this commit: <ids>`. A commit carries a migration when the staged `.kb/manifest.json` records a newer `schemaVersion` than the base, or the commit removes the legacy `.kb/config.json`; the audit record under `.kb/migrations/` is ignored by Git, so it is not the signal. Outside such a commit, adding `legacy-link` to an existing record is a change like any other. Records the commit adds, and records it edits in any other field (an `implements` link, for example), are judged in full.

A staged requirement whose semantic inventory is missing or no longer matches its prose blocks the commit with the same test `kibi sync` applies (proposition-complete ingestion) when the requirement declares an inventory contract (`semantic_inventory_version`, `semantic_source_hash` or `semantic_inventory`) in the staged file or in `HEAD`, when it is new: its path is not in `HEAD` (a renamed requirement counts as new), or when its statement (the prose the inventory covers) differs from `HEAD`. A repository's first commit is exempt, and so is `git commit --amend` of it, since `kibi sync` imports it as its semantic baseline. Other requirements without a contract, for example one whose commit only edits its Context section, are left to `kibi sync`. Each finding names the requirement and the contract errors; re-derive a drifted inventory with `kibi migrate`, or run `kb_model` analyze with the complete prose and write the inventory contract it returns.

KB writes through MCP or CLI JSON routes update branch state, but they do not automatically stage markdown or manifest files. The staged hook can only accept evidence present in the staged change-set, so run the required sync/authoring step and `git add` the tracked evidence before rerunning `kibi check --staged`.

**Examples:**
```bash
# Check entire KB
kibi check

# Export structured two-lane check output for automation
kibi check --format json

# Check only staged changes
kibi check --staged

# Run specific rules
kibi check --rules must-priority-coverage,no-dangling-refs

# Audit advisory strict-fact modeling without failing canonical health
kibi check --rules strict-fact-shape

# Audit strict requirement/fact pairing without failing canonical health
kibi check --rules strict-req-fact-pairing

# Audit predicate ontology links without failing canonical health
kibi check --rules predicate-verifiability

# Audit Prolog validation query plans
kibi check --rules query-plan-safety

# Audit requirement status vocabulary (catches ADR statuses on reqs)
kibi check --rules req-status-vocabulary

# Audit vocabulary convergence (duplicates, subject keys, prose-in-atoms)
kibi check --rules domain-redundancy,subject-key-identity,subject-key-shape,ontology-quality
```

### Vocabulary convergence checks

Deduplication and contradiction checks only work when equivalent prose lands on
the same subject, predicate, and arguments. These rules measure and nudge that
convergence. They are advisory: findings are non-blocking `qualityDiagnostics`
and never change the exit code. All of them are deterministic over the
compiled KB (Prolog, plus TypeScript for `predicate-schema-conformance`, which
also needs the built-in predicate catalog); none calls a plugin or the network.

| Rule | Severity | Reports |
| --- | --- | --- |
| `domain-redundancy` | warning | Two distinct current requirements ground the identical logical term (same predicate/property signature after unit canonicalization, same polarity) or link the same ground fact via `requires_property`, `requires_predicate`, or `requires_rule`. Pairs linked by `supersedes` or `restates` (either direction) are exempt. Evidence carries both requirement IDs, both fact IDs, and the signature. Links are grouped by signature once, so cost grows with the number of links, not with requirement pairs. |
| `domain-implication` | info | Same subject and property, comparable numeric operators, and one bound strictly implies the other (`lte 30 min` implies `lte 3600 s`). Reported as "Implied by", never as a duplicate. |
| `subject-key-identity` | warning | A subject key of the form `req.<segment>[.…]` where `<segment>` is a normalized existing requirement ID (`req.req_cli_gc` for `REQ-cli-gc`, or without the `req_` prefix). Every requirement becoming its own subject makes cross-requirement checks impossible. Also reports one subject or claim minted as several facts: more than one active `subject` fact with the same `subject_key`, and more than one active `property_value` fact with the same `subject_key`, `property_key`, `operator`, `polarity` (absent means `require`), typed value and `unit` (a `forbid` fact states the opposite of its `require` twin, so the pair is never reported; facts linked only by superseded or deprecated requirements are history, not live duplicates; facts that differ in operator, such as the two bounds of a range, or in value, such as two requirements bounding the same property differently, are distinct claims that `domain-contradictions` and `domain-implication` compare). Each group is reported once, on its first fact id, with every fact id in the evidence. |
| `subject-key-shape` | warning | Subject facts whose key is not dotted `component.aspect[.sub]` with lowercase snake segments (`kibi.cli.check.staged`), and `property_value` facts whose `property_key` numbers a clause (`clause_03_must_refresh_...`, `contract_clause_2`) instead of naming a property other requirements can share. |
| `ontology-quality` | info | A predicate (namespace, name, arity) with at least `KIBI_ONTOLOGY_QUALITY_MIN_FACTS` facts (default 8) where the share of argument slots holding a value that occurs in only one fact is at least `KIBI_ONTOLOGY_QUALITY_MAX_SINGLETON_RATIO` (default 0.6): prose is being compressed into atoms. The message names each argument whose own singleton share reaches the threshold. Both variables are read from the invoking `kibi`/MCP process. |
| `predicate-schema-conformance` | warning | A predicate fact with no `predicate_schema` for its namespace, name, and arity (project-local, or the built-in catalog in the `default` namespace), a fact using a value outside a declared argument vocabulary, or a schema whose `argument_constants`/`argument_aliases` are malformed. When the repair is mechanical, the finding carries it and `kibi migrate` offers it as an automatic action (see below). |
| `entity-id-style` | warning | Markdown entities whose filename stem differs from the frontmatter `id`. New purely numeric IDs (`REQ-123`) are reported where they are created: `kb_upsert` warnings (including `dryRun: true` and `kibi validate-upsert`) and staged added or renamed entity files (`--staged`). Committed legacy numbered entities are never flagged. |

Property values are compared after unit canonicalization: durations convert to
seconds, data sizes to bytes (SI `kB`/`MB`, IEC `KiB`/`MiB`), and percentages
to percent. The authored value is stored unchanged. Unknown or ambiguous units
(`KB`, `Mb`, `month`) stay as written and are never equated with anything else.

A `predicate_schema` can close an argument's vocabulary: `argument_constants`
lists the allowed values per argument name, and `argument_aliases` maps legacy
spellings to one of them. Arguments without an entry stay open.

```yaml
fact_kind: predicate_schema
predicate_name: check_finding_policy
argument_names: [rule, finding, severity]
argument_constants:
  severity: [warning, info]
argument_aliases:
  severity: { warn: warning }
```

`kb_upsert` rejects a predicate fact that uses an undeclared value or an alias
(naming the constant to use), and predicate suggestion (`kb_model` mode
`predicates`, CLI `suggest-predicates`) binds aliases to their
constant and leaves undeclared values unbound. Existing facts are converged by
`kibi migrate` (below).

While editing, agents can run impact diagnostics through MCP `kb_check({sourceFiles:[...], includeImpactDiagnostics:true, includeWorkingTreeDiff:true})` or the equivalent `kibi check --input <file|->` JSON route. `kibi check --staged` remains the commit-time git-hook gate once files are staged.

Structured JSON output preserves the same two-lane model used by MCP: hard correctness failures appear under `structuredContent.violations[]`, while advisory audit signals appear under `structuredContent.qualityDiagnostics[]`. For `--staged`, one envelope is emitted for every outcome. `structuredContent.staged.files[]` records each path's Git status, analysis depth, disposition, ownership, evidence, provider, and skipped reason; file-level advisory findings appear in `structuredContent.diagnostics[]`. Advisory-only output is still a successful check; integrations should inspect `blocking` and `severity` instead of treating every diagnostic as a failure.

**See also:** [Staged Symbol Traceability](#staged-symbol-traceability) for `--staged` usage details.

## `kibi doctor`

Verifies environment setup and diagnostics.

**Behavior:**
- Resolves the SWI-Prolog Kibi runs (`KIBI_SWIPL`, then the bundled `kibi-swipl-<platform>` package, then `swipl` on `PATH`), reports its source, path, and version, and loads every library Kibi requires; when the bundle is missing on a supported platform it names the package to add
- Verifies `.kb/` directory exists
- Validates `.kb/manifest.json` syntax
- Recognizes leftover `.kb/config.json` and recommends `kibi migrate --yes`
- Checks git repository presence
- Checks the current branch's KB store ("Branch store"): it fails when `.kb/` holds authored sources but the store is missing or empty (journal sequence 0, nothing compiled), naming `kibi sync`; an incomplete or unreadable store points at `kibi branch recover`
- Verifies git hooks are installed and executable, reading them from the directory Git uses (`git rev-parse --git-path hooks`). Missing hooks are a warning (`!`, `"warning": true` in JSON, counted in the top-level `warnings`), not a failure: without them a new branch is not compiled on checkout and commits skip `kibi check --staged`
- Treats a hook without a kibi-managed section as the project's own hook (hand-written, husky, lefthook, ...). A custom pre-commit passes when it runs both `kibi check-generated --staged --changed-only` and `kibi check --staged` (via `kibi`, `npx kibi`, `node_modules/.bin/kibi` or `"$KIBI_BIN"`; commented lines do not count), and a custom post-rewrite passes when it runs `kibi sync`. Otherwise the check fails and the remediation shows what to delegate to and `kibi init --print-hook <hook>`, because `kibi init` never edits a custom hook
- Fails when an installed kibi-managed hook section differs from what the running CLI installs ("Kibi-managed hook sections"), for example a pre-commit hook written before the generated-manifest gate
- Reports the engine daemon serving this workspace and branch ("Engine daemon"), without starting one: its package versions and SWI-Prolog from the daemon handshake. A daemon with other package versions than this CLI is reported, not failed; the next Kibi command stops and replaces it
- Warns ("Manifest merge driver"), once `.kb/symbols.yaml` holds a symbol, when Git does not route `.kb/symbols.yaml` to `kibi merge-driver` (`merge=kibi` in `.gitattributes`) or `merge.kibi.driver` is not set, and prints both setup lines; merges still work without it, with ordinary line conflicts; the driver command names the project's package manager (from its lockfile)
- Warns, rather than fails, when the secret of an activated plugin is missing and every capability of that plugin is in `augment` mode (for example `TYPESAFE_API_KEY` for `kibi-plugin-jev`): the plugin is skipped and builtin providers keep answering. In `replace` mode the missing secret is a failure
- Reports issues with remediation suggestions

**Examples:**
```bash
kibi doctor
kibi doctor --format json
```

JSON mode emits `kibi.doctor.v1` with resolved CLI, core, and MCP versions and
their entrypoint/package locations so release validation can prove which
artifacts are executing.

**Common Issues Found:**
- SWI-Prolog not found → Add the platform package it names, or see the [install guide](install.md#which-swi-prolog-kibi-uses)
- `.kb/` missing → Run `kibi init`
- Git hooks missing (warning) → Run `kibi init`
- Branch store not compiled → Run `kibi sync`
- Kibi-managed hook section without kibi CLI resolution → Run `kibi init` to regenerate it
- Custom (non-Kibi) pre-commit hook does not run `kibi check-generated --staged --changed-only` and `kibi check --staged` → Add both to the hook; `kibi init --print-hook pre-commit` prints a ready-to-paste snippet. Re-running `kibi init` does not help, because init never edits a custom hook. An unmarked file that is an old Kibi template can instead be deleted so `kibi init` reinstalls it
- Kibi-managed hook sections outdated for this CLI → Run `kibi init` to refresh them (hooks are shared by every worktree of the repository)
- `.kb/manifest.json` missing beside a legacy `.kb/config.json` → Run `kibi migrate --yes` (not `kibi init`)
- Legacy knowledge files that `kibi migrate` cannot move (a destination already exists) → doctor prints the same resolution `kibi migrate` and the migration plan report (stale symbols subset, generated coordinates, ambiguous symbols manifest, or a conflict to compare), instead of sending you back to `kibi migrate`. Legacy copies identical to their `.kb/` file are counted separately; `kibi migrate --yes` removes them
- Config invalid → Check `.kb/manifest.json` syntax; leftover `.kb/config.json` is retired with `kibi migrate --yes`

## Release package validation

Release validation packs the published packages in dependency order, verifies
their compiled entrypoints and dependency ranges, and exercises isolated npm
and pnpm consumers. Consumer repositories own their local update scripts and
dependency overrides; Kibi does not rewrite a consumer's manifests or
workspace configuration.

## `kibi usage-metrics`

Reports adoption and quality metrics from `.kb/usage.log`.

**Syntax:**
```bash
kibi usage-metrics [--format json|table] [--limit N] [--require-acceptance]
```

**Behavior:**
- Reads `.kb/usage.log` from the current repository
- Summarizes tool usage, branch activity, and success/error outcomes
- Reports telemetry completeness and zero-result rates
- Shows `kb_check` violation trend entries and grouped `kb_upsert` error categories
- Limits the zero-result source-file leaderboard with `--limit`
- Adds a versioned `kibi.telemetry-acceptance.v1` report over the latest 200 events. It measures telemetry completeness, advisor-before-requirement-write use, exact validation-before-upsert use, lookup-before-first-edit (per host session, whether `kb_search` or `kb_query` ran before the first edit of a requirement-linked file, read from host plugin hook rows), source-linked zero-result rate, proof-gap recovery, receipt freshness, and repeated mutation failures.
- Separates `failed` from `insufficient_evidence`: an empty, stale (older than seven days), future-dated, partial-coverage, or pre-field-upgrade log cannot pass merely because no failure was observable

**Flags:**
- `--format json|table` - Output format (default: table)
- `--limit N` - Maximum number of top zero-result source files to include (default: 10)
- `--require-acceptance` - Exit non-zero unless the acceptance status is exactly `passed`; the report is still printed for repair automation

**Examples:**
```bash
# Show the default table report
kibi usage-metrics

# Export the full report structure as JSON
kibi usage-metrics --format json

# Show only the top 5 zero-result source files
kibi usage-metrics --limit 5

# Enforce the telemetry report as a completion gate
kibi usage-metrics --format json --require-acceptance
```

**Notes:**
- Returns an error if `.kb/usage.log` does not exist in the current repository
- `--limit` must be a positive integer
- Default thresholds are conservative and inspectable in `acceptance.policy`: at least 95% telemetry completeness, 100% advisor/preflight sequencing when applicable, 100% of host sessions looking requirements up before their first linked edit when hook rows record one, no more than 20% zero-result source lookups, no receipt-specific gaps, and fewer than three consecutive failures for any mutation target

## `kibi usage-remediation`

Builds a read-only `kibi.telemetry-remediation.v1` report from `.kb/usage.log`.

```bash
kibi usage-remediation [--format json|table] [--limit N]
```

- Enumerates the exact log line, request, timestamp, tool, target, reason, and repair action for events behind failed or insufficient acceptance metrics. Log lines count every line of `.kb/usage.log`, including host hook rows; a session whose first requirement-linked edit had no earlier lookup points at that hook row
- Preserves session and actor identifiers when available; advisor and preflight evidence cannot match a write when both records expose different correlation identifiers
- Keeps missing complete coverage evidence as an explicit report-level item
- Sorts deterministically by repair rank, log line, and stable item identity
- Does not write to the knowledge base or usage log; `--limit` only bounds rendered table rows and never truncates JSON evidence
- The report uses exact canonical payload fingerprints for validation correlation when available and a deterministic legacy fingerprint otherwise. Requirement-advisor correlation requires the same requirement and, when both events expose it, the same semantic source hash.



## `kibi telemetry`

Shows or changes the anonymous usage telemetry setting for the current user.

```bash
kibi telemetry [status|enable|disable] [--format text|json]
```

- `status` (the default) prints whether telemetry is on, why (for example `KIBI_TELEMETRY=0`, `CI environment` or `on by default`), and where the settings and queue live
- `disable` saves the opt-out for this user and deletes any events still queued; `enable` saves an opt-in, which also applies in CI
- `KIBI_TELEMETRY=0` and `DO_NOT_TRACK=1` always win over the saved choice
- `--format json` prints `{ enabled, reason, directory, docs }`

What is sent and when is described in [Usage telemetry](./telemetry.md).
## `kibi migrate`

Previews or applies the structured branch migration plan. With no mutation
flags, it is a read-only preview; `--format json` returns the complete
`kibi.migration-plan.v2` action graph.

**Behavior:**
- Upgrades entity schemas and internal storage formats
- Marks pre-existing coarse symbol links with `granularity_reason: legacy-link` at any schema version, using the same rule as the staged granularity gate (`kibi check --staged`): a traceability link is coarse when the source declares narrower behavioral symbols, such as the methods of a linked class (`ClassName.methodName`) or other exported functions when the linked title is not declared at all. The pass is idempotent; the plan offers it as the automatic `symbol_legacy_link_mark` action (id `symbol-legacy-link-mark`), bound to the hash of `.kb/symbols.yaml` it was planned from and listing each symbol with the narrower symbols that make it coarse
- Refreshes generated symbol coordinates, the way `kibi sync --refresh-symbol-coordinates` does, whenever the run rewrote or moved `.kb/symbols.yaml` (a moved legacy manifest, or legacy-link marks, which change a record's coordinate identity), and prints `Refreshed generated symbol coordinates for the migrated .kb/symbols.yaml; ...`. The `symbol-legacy-link-mark` plan action refreshes them the same way. The first commit after a migration therefore carries a current `.kb/symbols.yaml`, and the pre-commit `kibi check-generated --staged` gate reports no drift. A symbol that gets no coordinates is listed as `failed <id>: <reason>` as in sync; if the refresh itself fails, the migration stays applied and a warning names `kibi sync --refresh-symbol-coordinates` as the step to run before committing
- Fixes legacy requirement modeling to follow strict fact-pairing rules
- Moves legacy `documentation/` knowledge lanes and leftover `.kb/config.json` into the canonical `.kb/` layout
- Replaces the pre-canonical blanket `.kb/` gitignore stanza with derived-runtime ignores so migrated `.kb/<lane>/` files are trackable
- Schema 13: adds `.kb/symbol-coordinates.yaml` to `.gitignore` and removes it from the Git index (`git rm --cached`; the local file stays), because sync derives coordinates from source. Commit the removal with the migration
- Treats malformed `.kb/config.json` as a blocker instead of guessing `documentation/` paths
- Classifies a legacy file whose `.kb/` destination already exists, with or without a legacy `.kb/config.json`: a byte-identical copy is removed (the dry run lists it as `would remove`), and anything else blocks the move with a resolution. A legacy symbols manifest whose symbol ids are all in `.kb/symbols.yaml` is reported as a stale subset to remove with `git rm`, a `symbol-coordinates.yaml` copy as generated (keep `.kb/`, `kibi sync --refresh-symbol-coordinates` regenerates it), and other content as a conflict to compare. Kibi only deletes the identical copy itself.
- Without `paths.symbols` in a legacy config whose lanes sit under another folder (for example `kibi-docs/requirements`), takes the symbols manifest beside those lanes (`kibi-docs/symbols.yaml`) instead of the `documentation/symbols.yaml` default. When a `documentation/symbols.yaml` exists too, or is the only candidate, the move is blocked as ambiguous until `paths.symbols` names the current manifest or the stale one is removed.
- Writes `.kb/manifest.json` with the latest `schemaVersion`. While a legacy `.kb/config.json` is present, its `schemaVersion` is where the migration starts, even when a manifest already sits beside it, so no legacy step is skipped. The file move records that legacy version in the manifest and the latest one is written only after the schema steps, so an interrupted run replays them. An empty `.kb/symbols.yaml` seeded by an older `kibi init` does not block the move; the legacy symbols manifest replaces it.
- After moving files in a Git repository, writes a pending-source receipt (`.kb/recovery/pending-sources/`, the record `kb_upsert` keeps for files it creates) for every moved file Git does not track yet, so `kibi sync` compiles the moved knowledge at once. Kibi never stages files: the warning asks you to stage them (`git add .kb`, plus the removals under the legacy folders) before committing, and each receipt retires once Git tracks its file. Later migration steps that rewrite a moved file rebind its receipt.
- Collapses the `source-relationship-parity` findings that `kibi check` explains by untracked files (evidence `untrackedSources`) into one `untracked_knowledge_sources` review action (id `untracked-knowledge-sources`) that lists the files and the number of relationships, instead of one action per relationship.
- Offers `predicate_schema_alignment` actions for `predicate-schema-conformance` findings with a mechanical repair: moving a predicate fact to the only namespace whose schema matches its name and arity, and rewriting argument aliases to their declared constants (with the matching `canonical_key`). Each action is `automatic`, carries the exact `kb_upsert` input, and re-reads the fact before writing; a fact that changed since planning fails the action instead of being overwritten. Ambiguous namespaces and undeclared values stay review actions.
- Schema 6 (from 5 or older): the `entity_origin_backfill` action records `origin: {kind: migration, ref: "kibi migrate v5->v6", recorded_at}` as the last frontmatter key of every authored entity that has no `origin`; every other byte of the file stays as it was, and entities that already carry an `origin` are left alone. Its evidence lists the count, the count per type, and any file it cannot stamp safely (with the reason).
- Schema 8 (from 7 or older): the `entity_body_context` step edits front matter only; every body stays byte-identical. Its `semantic_text_pin` action writes `semantic_text` on each requirement that lacks it, using the pre-schema-8 derivation from the body, so claim spans and hashes do not move once context sections are excluded from derived meaning. Its `context_missing_tag` action adds the tag `review:context-missing` to each current `req`, `scenario`, `test`, `adr` and observation/meta `fact` that fails the body-context test and records those ids (and any already tagged) in `.kb/manifest.json` as `contextAcknowledged`; it never writes prose. Both are idempotent, and `--dry-run` reports the counts (tagged entities per type). `kibi check` treats tagged entities as acknowledged legacy and counts them in the advisory `entity-context-acknowledged` diagnostic.
- Re-derives drifted semantic inventories at any schema version. When the current semantic advisor reads a requirement's prose differently from its stored `semantic_inventory` (for example a claim it used to call `rationale` is now `normative`), `kibi sync` rejects the requirement. `kibi migrate` lists every such requirement. A `semantic_inventory_rederive` action (automatic) rewrites the inventory with the current advisor: a claim whose `claim_key` and `claim_text` still match keeps its status, so a modeled claim stays modeled with its grounding; a new or reclassified claim becomes unresolved (`ontology_gap`, `ambiguous` or `missing`), never modeled; `logic_claims` and `semantic_source_hash` are rewritten to match. Only the contract fields change. The action re-checks the contract hash it was planned with before writing. A requirement Kibi cannot re-derive safely (a grounding fact whose `claim_key` is no longer a modeled claim, or a modeled claim that is now context) gets a `semantic_inventory_review` action instead. Its evidence carries the re-derived `contract` (inventory, `logic_claims`, source hash) and its instruction says to write that contract into the requirement's front matter and re-ground or remove the listed grounding links in the file itself, because `kibi sync` rejects the requirement and store-backed tools cannot see it yet. It also gives a `kibi model --input -` analyze input (`{"mode":"analyze","type":"req","id":...,"text":...}`) that passes the public schema. When the requirement would pass ingestion once the orphaned grounding links are gone (each link in its own front matter `links`, pointing at a fact whose `claim_key` is no longer a modeled claim), the plan also offers `semantic_inventory_rederive_drop_grounding` (id `semantic-inventory-rederive-drop-grounding-<REQ>`, safety `review`): it writes the re-derived contract and removes exactly the grounding links listed in its evidence (`droppedGrounding`); the facts stay. It drops modeled logic, so `--apply-safe` never selects it on its own: approve it by id with `--approved-action`. It re-checks the contract hash and the link list it was planned with, and verifies that the rewritten requirement passes ingestion before writing anything. `kibi sync` stays fail-closed: it still rejects the whole sync while any requirement fails.
- Maps the legacy delivery statuses `implemented`, `done` and `completed` to `status: closed` plus the tag `implemented` in one automatic `req_status_delivered_map` action (id `req-status-delivered-map`). These statuses are outside the entity schema, so `kibi sync` cannot compile such a requirement and store-backed tools do not see it; closed with the tag `implemented` keeps the meaning (delivered, and a must-priority requirement still owes its scenario and test). The evidence lists each mapping (`{requirementId, path, from, to, tag}`); the edit replaces the `status` line and adds the tag to `tags` when it is missing, leaving every other byte of the file alone. `kibi migrate --yes` applies it and prints `Mapped legacy status implemented -> closed (tag implemented) on N requirement(s): ...`.
- States the folder-implied `type` (`req` under `.kb/requirements/`, `scenario` under `.kb/scenarios/`, and so on) as the last front matter key of every authored entity file that has none, at any schema version, in one automatic `entity_type_backfill` action (id `entity-type-backfill`). Such files were written before Kibi stated the type in front matter; sync already reads the type from the folder, but every Kibi write states it, so without this the first `kb_upsert` after a migration would add an unrelated `type:` line to the user's change. Only that line is added. `kibi migrate --yes` applies it and prints `Stated the folder-implied type on N entity file(s) without one (...)`; a KB migrated by an earlier version gets it from its next `kibi migrate`.
- Lists every other requirement whose authored status is outside the requirement vocabulary (`req-status-vocabulary`, for example ADR `status: accepted`, or an unknown status such as `wip`) as a `req_status_vocabulary_map` review action (id `req-status-vocabulary-map-<REQ>`), planned from the source files so it is available before the KB compiles. Such a requirement is skipped by the proof ladder and its semantic inventory is never validated, so drift stays hidden until the status changes. The evidence suggests a target (`accepted`, `proposed` and `draft` map to `open`; `deprecated`, `superseded` and `rejected` to `closed`) and reports the `latentDrift`: the ingestion errors the requirement would have with that status. The target is a semantic choice, so the action runs only when approved by id; it replaces only the `status` line and refuses when the status changed since planning. To pick another status, set it in the file instead. When the latent drift exists, the plan adds the matching re-derivation (`semantic_inventory_rederive`, or the drop-grounding variant) as a review action that depends on the status action, so approving both (`--approved-action req-status-vocabulary-map-<REQ>,semantic-inventory-rederive-<REQ>`) applies them in order, and approving the re-derivation alone is refused. A status without a suggestion gets a plain review action. When the status keeps the file from compiling, the evidence carries the `extractionError` and the instruction says that `kibi sync` cannot compile the requirement until the status is fixed.
- Repairs the blocking lifecycle findings from authored sources at any schema version. A `close_superseded_requirements` action (automatic, id `close-superseded-requirements`) sets `status: closed` on every superseded requirement that is not closed, replacing only the `status` line. Requirements that supersede each other are never closed automatically: each cycle gets a `review_supersession_cycle` action naming every member and edge, so a person decides which requirement is current. A `source_path_rewrite` action (automatic, id `source-path-rewrite`) repairs every authored `source` field that is redundant or dead; the compiled `source` is always the entity's own file, so nothing Kibi compiles is lost. Its evidence lists rewrites (`{entityId, file, from, to}`): a value that names another knowledge file by its pre-canonical path (`documentation/<lane>/...`, or `<lane>/...` relative to the knowledge root) is pointed at that file under `.kb/<lane>/`, keeping any `#anchor`. It also lists removals (`{entityId, file, from, reason}`): a value that names the entity's own file, in the pre-canonical or `.kb/` spelling, with or without `./` or `#anchor`, compared case-insensitively, is removed with reason `self`, and a dangling value Kibi cannot map is removed with reason `dangling`. A value that names another existing workspace path, an http(s) URL or an existing entity id is provenance and stays. Each edit replaces or removes only the `source` line and must read back with every other frontmatter key unchanged. A value Kibi cannot edit safely (one spanning several lines, for example) gets a `review_source_path_dangling` action for a person instead; that is the only review this repair produces. Both automatic actions re-read their files and refuse to write when the value changed since planning; `migration-sync` depends on them. `kibi migrate --yes` performs the same repairs directly, prints the cycles and the source fields it could not edit as warnings, and `--dry-run` prints the counts it would rewrite and remove.
- Lists the schema 6 items a person must decide as review actions with stable ids: exceptions that exempt a requirement but have no `approved_by` (`review_exception_unapproved`), agent-recorded exception approvals nobody corroborated (`review_exception_approval_self_attested`), one action per predicate named by `rule-key-arguments-missing` (`review_predicate_key_arguments`), one per scenario reported by `scenario-feasibility-unknown` (`review_scenario_feasibility_unknown`), one queue for the agent-authored requirements `agent-requirement-unapproved` lists (`review_agent_requirements_unapproved`), one queue for the symbols `symbol-owner-superseded` lists (`review_symbol_owner_superseded`), one queue for the requirements `requirement-rationale-missing` lists (`review_requirement_rationale_missing`), one action per ADR reported by `adr-unlinked` (`review_adr_unlinked`) or `adr-proposed` (`review_adr_proposed`), and any blocking violation.
- When the plan rewrites authored sources, the schema upgrade depends on those rewrites and a `migration-sync` action recompiles the KB, so the check and coverage readback after `--apply-safe` already see the migrated files. `migration-sync` is left out while a requirement still needs a manual inventory fix, because sync would reject it, and when no source is rewritten and the status plan already compiles or resyncs the KB after the schema upgrade, so the plan matches the `kb_status` plan. For the same reason, the status plan's `freshness-resync` and `branch-store-compile` syncs depend on the inventory re-derivations, and are blocked (evidence `blockedBy`) while a `semantic_inventory_review` is open.
- Plans quality actions only from a branch store that has been synced at least once; a never-synced store is reported as an incomplete `quality` domain instead of as one missing-relationship action per authored link.
- Idempotent: safe to run if already on the latest version. A second run after a completed migration plans no schema 6 actions, and `kibi migrate --yes` reports that no migration is needed.

- The text preview lists migration actions apart from the quality backlog: review findings `kibi check` and `kb_status` report at any schema version (codes `quality_*`, `coverage_*`, and check reviews such as `review_adr_unlinked`) are counted per code under "Quality backlog (not part of the migration)", and `Migration: complete` means no migration action remains even when the backlog is long. `--backlog` lists each backlog action; `--format json` keeps the complete, unchanged plan.
- After a completed migration, prints how to wire `kibi merge-driver` for `.kb/symbols.yaml` when Git does not route the file to it yet

**Flags:**
- `--dry-run` - Show what would be migrated without making changes
- `--backlog` - In the text preview, list every quality and coverage backlog action instead of counts per code
- `--yes` - Apply migration changes without prompting
- `--format json|table` - Render the structured plan or a concise table. With `--apply-safe`, the table form prints the outcome, one line per action and a summary of the remaining plan; `--format json` prints the full apply result
- `--apply-safe` - Apply only approved deterministic actions
- `--approved-plan-hash SHA256` - Required exact plan hash for `--apply-safe`
- `--approved-action ID` - Explicit action ID (repeatable or comma-separated): an automatic action, or a review action Kibi can execute once approved (`semantic_inventory_rederive_drop_grounding`, `req_status_vocabulary_map`, or a `semantic_inventory_rederive` that depends on a status mapping). Without it, `--apply-safe` applies every ready automatic action and no review action

**Example (predicate vocabulary):**
```bash
kibi migrate --format json > plan.json        # review predicate_schema_alignment actions
kibi migrate --apply-safe --approved-plan-hash "$(jq -r .planHash plan.json)"
```

**Example (schema 5 to 6):**
```bash
kibi migrate --format json > plan.json        # origin backfill, inventory re-derivations, review items
kibi migrate --apply-safe --approved-plan-hash "$(jq -r .planHash plan.json)"
kibi migrate --format json                    # remaining review actions, now including kibi check findings
```

`kibi migrate --yes` performs the same automatic steps without a plan: it
stamps origins, maps the legacy delivery statuses, re-derives the inventories
it can, prints a warning for each requirement that needs a manual fix, and
records `entityOriginBackfill`, `supersededRequirementsClosed`,
`sourcePathsRewritten`, `sourcePathsRemoved` and `legacyStatusesMapped` in
`.kb/migrations/<branch>.json`, with `status: applied` and, as
`preMigrationWarning`, the schema warning the KB showed before the run.
`kibi migrate --dry-run` prints what it would change.

When work remains that `--yes` does not apply (a requirement status with no
safe mapping, an inventory that needs a manual fix, or a lifecycle item a
person decides), the run does not print `Migration complete`. It prints
`Migration incomplete: N requirement(s) are not compiled, so kb_query,
kb_coverage and kb_upsert do not see them, and M other item(s) need a
decision.`, one line per uncompiled requirement with its file, the extraction
error and the edit that fixes it, and the next command to run. The exit code
stays 0, as for any run that leaves review actions; `kibi status` and
`kibi check` keep reporting the uncompiled files until they compile.

**Notes:**
- Use `kibi status` to check if a migration is pending for your branch.
- Safe application rejects stale hashes, blocked actions, review/operator actions,
  and actions omitted from `--approved-action`.
- Migration is recommended when upgrading `kibi-cli` or `kibi-mcp` packages.
- Migration refreshes symbol coordinates itself when it rewrites the symbols manifest; run `kibi sync --refresh-symbol-coordinates` only if it warned that the refresh failed or coordinate diagnostics remain.

## `kibi gc`

Garbage collects stale branch knowledge bases.

**Behavior:**
- Lists branch KBs that no longer exist in git
- Quarantines stale stores first; irreversible deletion requires explicit purge
- Keeps quarantined stores restorable during the retention window (30 days by default)
- Safe by default (dry-run mode)

**Flags:**
- `--dry-run` - Only list stale branches (default)
- `--force` - Quarantine stale branches (reversible)
- `--purge` - Permanently purge quarantined stores past retention
- `--retention-days <n>` - Retention window for purge (default: 30)

**Examples:**
```bash
# List stale branches (safe)
kibi gc --dry-run

# Quarantine stale branches
kibi gc --force

# Purge expired quarantined stores
kibi gc --purge --retention-days 30
```

**Notes:**
- Use `--dry-run` first to see what would be deleted
- Stale = an exact or legacy store whose branch is not a local Git head or
  worktree branch; remote-only refs do not keep stores live

## `kibi merge-driver <base> <current> <other>`

Git merge driver for `.kb/symbols.yaml` and `.kb/relationships/*.yaml`. Git
passes the ancestor (`%O`), current (`%A`), and other (`%B`) versions; the
driver merges the record lists by `id` and writes the result to `<current>`.

**Behavior:**
- Keeps records added on either side, applies one-sided edits and deletions,
  and unions relationships and links both sides added to one symbol
- Reproduces the current file byte for byte when nothing changed
- On a real conflict (both sides changed the same field differently, an edit
  against a deletion, duplicate ids, or invalid YAML) prints each conflict,
  leaves ordinary conflict markers, and exits 1

**Setup:**
```text
# .gitattributes
.kb/symbols.yaml merge=kibi
.kb/relationships/*.yaml merge=kibi
```
```bash
git config merge.kibi.driver "npm exec --no -- kibi merge-driver %O %A %B"
```

Use `pnpm exec kibi`, `yarn exec kibi` or `bunx --no-install kibi` in place of
`npm exec --no -- kibi` in pnpm, Yarn or Bun repositories; `kibi doctor` and
`kibi migrate` print the command for the lockfile they find.

`.kb/symbol-coordinates.yaml` is never committed, so it never conflicts; the
next sync after the merge rebuilds it. For a CI job that applies this to
open pull requests, see
[GitHub badge + report](github-integration.md#merge-conflicts-in-kibi-manifests).

## `kibi branch`

Lists and manages branch knowledge bases.

**Syntax:**
```bash
kibi branch ensure
kibi branch migrate --from <legacy-branch> --to <active-branch> [--apply --approval-hash <sha256>]
kibi branch recover [--apply]
kibi branch restore --branch <branch> [--apply]
```

**Arguments:**
- `ensure` - Ensure the active branch has a branch-local KB snapshot
- `migrate` - Preview (or, with `--apply`, atomically move) a legacy branch KB into the exact active Git branch namespace
- `recover` - Preview (or, with `--apply`, rebuild) an incomplete or unreadable exact branch store from authored sources while preserving the original bytes
- `restore` - Preview (or, with `--apply`, restore) the newest quarantined exact branch store within its retention window

**Flags:**
- `--to <active-branch>` - Explicit exact Git identity receiving a legacy-store migration; it must match the active branch
- `--approval-hash <sha256>` - Required hash copied from the preview; source bytes and identities must still match exactly

**Behavior:**
- Ensures the active git branch has a compiled KB under `.kb/branches/<exact-ref-sha256>/branch.json`
- A missing exact branch store is compiled from the current checkout's tracked sources; no other branch store is copied
- Branch names are never normalized; `master` and `main` are separate namespaces and remote-only refs do not keep stores live
- `migrate` previews by default, stops an attached branch engine before applying, requires the exact target namespace to be absent, and preserves journals/audit/cache files.
- `migrate` is an explicit old/new legacy-literal-path migration. It rejects inferred renames and arbitrary branch-store cloning.
  The old and new identities may be equal when moving a literal store for the current branch into its hashed path.
- `recover` publishes only after a clean rebuild has succeeded, moves the prior store to `.kb/recovery/<branch>/...`, and writes an audit record. It never renames a Git branch.

**Detached HEAD:** when HEAD is detached but its commit is the tip of exactly
one local branch (for example `git checkout <sha>` of a branch tip, or a tool
that detaches before running), Kibi attaches that branch's KB. With zero or
several candidate branches (a CI checkout of a bare SHA, a bisect, a commit two
branches share) Kibi guesses no branch identity:

- Read-only operations (`search`, `query`, `status`, `check`, `coverage`,
  `graph`, and their CLI JSON routes and MCP tools) answer from a read-only
  snapshot compiled from the checkout's tracked sources into
  `.kb/branches/<sha256("kibi-internal/detached-head-snapshot")>`. The snapshot
  is refreshed incrementally before each read, never touches a branch KB, and
  every answer carries a `detached_head_read_only` warning diagnostic naming
  the commit, the branches at HEAD, the store path, and `writes: "refused"`.
- Writes (`upsert`, `delete`, `apply-plan`, `sync`, and other `kb-write` or
  `workspace-write` operations) are refused with the way out: check out a
  branch (`git switch <branch>` or `git switch -c <branch>`) or set
  `KIBI_BRANCH`.

`KIBI_BRANCH` still overrides the Git identity verbatim. `kibi gc` keeps the
snapshot store while HEAD is detached on it and collects it afterwards.

**Examples:**
```bash
# Ensure the current branch has a KB
kibi branch ensure

# Preview then apply a legacy literal-store migration while on the target branch
kibi branch migrate --from old-ref --to feature/target
kibi branch migrate --from old-ref --to feature/target --apply --approval-hash <preview-hash>

# Preview then recover an unreadable store for the active exact branch
kibi branch recover
kibi branch recover --apply
```

## `kibi skills`

Manage and inspect bundled agent skills. Skills are reusable Markdown guidance packages shipped with Kibi.

**Behavior:**
- Lists available bundled skills
- Loads a skill's manifest and body
- Reads individual resources declared by a skill
- Validates a local skill bundle directory

**Subcommands:**

```bash
kibi skills list [--format json|table]
kibi skills load <id> [--format json|markdown]
kibi skills read <id> <resource> [--format text|json]
kibi skills validate <path> [--format json|table]
```

**Arguments:**
- `list` - Show all bundled skills with ID, name, version, and description
- `load <id>` - Load a skill by its bundled ID. Returns the skill body and manifest.
- `read <id> <resource>` - Read a specific resource file declared in the skill manifest
- `validate <path>` - Validate a local skill bundle directory against the skill schema

**Flags:**
- `--format json|table` - Output format for `list` and `validate` (default: table)
- `--format json|markdown` - Output format for `load` (default: markdown)
- `--format text|json` - Output format for `read` (default: text)

**Examples:**
```bash
# List all bundled skills
kibi skills list

# Load the canonical usage skill as markdown
kibi skills load kibi-usage --format markdown

# Read a specific resource from a skill
kibi skills read kibi-usage resources/fact-lanes.md --format text
```

**Notes:**
- Skills are bundled with Kibi. Remote installation, marketplace, and script execution are not supported in v1.
- OpenCode is an adapter for skill discovery, not the source of truth. The bundled skill set is authoritative.
- Generic MCP/CLI agents should start with [generic-agent onboarding](generic-agent-onboarding.md) and load `kibi-usage`. Do not copy a long prompt as a substitute for skill discovery.
- The JSON routes `skills-list`, `skills-load`, `skills-read`, and the consolidated `skill` route (`{"action":"list"|"load"|"read", ...}`) back the MCP `kb_skills` tool.

## Workspace selection

The CLI runs in the current directory. The MCP server answers from the
workspace it started in and can route single calls elsewhere through
`workspaceRoot` (see the [MCP reference](mcp-reference.md#workspace-routing)).
These environment variables decide which workspace that is:

| Variable | Effect |
| --- | --- |
| `KIBI_WORKSPACE`, `KIBI_PROJECT_ROOT`, `KIBI_ROOT` | Pin the workspace. The CLI and MCP server use it instead of the working directory, and a pinned MCP server does not route calls to other workspaces. |
| `KIBI_MCP_ATTACH_ROOT` | Set by host launchers (Claude Code, Codex, Cursor, ZCode plugins) to the session's workspace; the launcher starts the MCP server there. It does not pin: per-call `workspaceRoot` routing to worktrees stays enabled. An operator-set `KIBI_WORKSPACE` still passes through and pins. |

A detached HEAD whose commit is the tip of exactly one local branch attaches
that branch's KB. Any other detached HEAD serves reads from a read-only
snapshot of the checkout and refuses writes; see [`kibi branch`](#kibi-branch).

## Engine read limits

All CLI and MCP clients of a workspace branch share one engine process with a
single Prolog queue. A read can be bounded so a runaway query cannot hold that
queue:

| Variable | Effect |
| --- | --- |
| `KIBI_ENGINE_READ_TIME_LIMIT_MS` | Wall-clock budget, in milliseconds, for each read-only engine request (capped at 115000, below the engine's hard 120 s query timeout). |
| `KIBI_ENGINE_READ_INFERENCE_LIMIT` | Logical-inference budget for each read-only engine request. |

Both are unset by default (reads are unbounded, as before). Write requests,
module loads, and `kibi sync` compilation are never bounded. The read-only
queries a write operation such as `kibi upsert` runs before it writes are
reads, so a write can fail with `QUERY_LIMIT_EXCEEDED` before anything is
written. A read that reaches its
limit is stopped inside Prolog and fails with error code
`QUERY_LIMIT_EXCEEDED`; the envelope's `error.details.limitExceeded` is
`{ "kind": "time" | "inferences", "limit": <n> }`. It is never reported as an
empty or partial answer.

## Staged Symbol Traceability

`kibi check-generated --staged` compares the staged `.kb/symbols.yaml` bytes
with the canonical layout a refresh writes, computed from the exact Git index,
and fails when `.kb/symbol-coordinates.yaml` is in the index: coordinates are
derived locally by every sync and never committed (schema 13; `kibi migrate`
untracks the file). It also fails if the index changes while it runs. The
command does not alter the index or working tree. Run
`kibi sync --refresh-symbol-coordinates`, review the diff, then stage only the
intended hunks (`git add -p`) before retrying. CI runs the full check before
`prove --all`. The installed pre-commit hook uses `--changed-only` to skip the
check when the staged change does not touch the symbol manifest.
An initialized repository with no symbols has no coordinate artifact to
refresh, so its first commit is allowed without that file.

The `kibi check --staged` command inventories every staged path and enforces traceability on code before commit.

**Purpose:**
Every new or modified code symbol (function, class, method, accessor, behavioral class property, or module) must be explicitly linked to at least one requirement before it can be committed. This prevents "orphan" code from being merged and catches edits hidden behind broad class/module links when a narrower changed anchor exists.

**Workflow Options:**
1. **Relationship-based (Preferred for Test/e2e):** Model the code as a symbol in your manifest (e.g., `.kb/symbols.yaml`), link it to a `TEST-*` entity with `executable_for` to establish its identity. The canonical traceability chain is `REQ-<area>-<behavior>` → `SCEN-<area>-<behavior>` → `TEST-<area>-<behavior>`. Use `covered_by` to link symbols to the tests that exercise them. This satisfies the staged check without modifying source code. Note that physical symbol coordinates are maintained separately in `.kb/symbol-coordinates.yaml` and must be refreshed via `kibi sync --refresh-symbol-coordinates` when code changes.
2. **Comment-based (Optional Shortcut):** Add an inline `// implements REQ-<area>-<behavior>` comment. This remains backward-compatible and useful for quick code-only changes.

**How to use:**
```bash
# Check staged files for traceability coverage
kibi check --staged
```

This command reads blob content from the Git index rather than the working tree. It reports any new or modified TypeScript/JavaScript symbols that do not have requirement links (either via inline comments or explicit KB relationships). It also reports `symbol-coverage` for changed symbols (the full-check rule), stale symbol-coordinate evidence and `symbol_granularity_violation` when a changed behavioral member such as `UploadPageComponent.processingProgressLabel` is covered only by a coarse class/module relationship without an audited `granularity_reason`. If violations are found and this is run as a pre-commit hook, the commit will be blocked.

Readable UTF-8 files outside the TypeScript/JavaScript and Kibi metadata lanes receive advisory file-level checks. This includes Python, shell scripts, YAML and Compose files, Dockerfiles, Markdown, JSON, and other text formats. Kibi resolves ownership only from real source-linked symbol entities and typed `implements` relationships in committed knowledge plus the staged KB changes. Unstaged KB edits and unrelated staged entities do not satisfy the advisory check.

The text and JSON output include the complete path inventory, counts by analysis depth, and an explicit reason for skipped content. “No staged files found” is reserved for an empty Git index. Binary blobs, non-UTF-8 text, symlinks, and submodules are reported but do not block the commit.

The staged CLI gate does not prove that linked prose still matches the source edit. Use an impact-enabled `kb_check` through MCP or CLI JSON mode while editing to get `symbol_semantic_review_needed` guidance and inspect linked requirements/scenarios/tests before deciding whether to update KB entities.

Quality diagnostics may also appear during full or staged checks. They are designed to surface auditability problems automatically without creating a new command agents must remember: broad requirement reviews, multi-requirement symbol fanout, mixed-purpose class/component reviews, duplicate symbol-coordinate reviews, status misuse, strict-fact modeling gaps, and coverage-depth labels are review signals unless explicitly marked blocking.

**Scope Note**: Staged symbol checks handle explicitly modeled symbols and extracted TypeScript/JavaScript anchors, including exported class methods, accessors, and behavior-bearing class properties. Other readable text currently receives file-level analysis. Automatic extraction of framework-specific `test()` or `it()` callbacks is not currently supported.

**Inline Directive Syntax (Optional):**

Link a code symbol to a requirement by adding a comment:

```typescript
export function myFunc() { } // implements REQ-cli-gc
```

Link to multiple requirements:

```typescript
export class MyClass { } // implements REQ-cli-gc, REQ-cli-check
```

**Analysis depth:**
- Symbol-level: TypeScript and JavaScript (`.ts`, `.tsx`, `.js`, `.jsx`, `.mts`, `.cts`, `.mjs`, `.cjs`)
- Metadata: Kibi entity Markdown, symbol manifests, coordinate manifests, relationship shards, and `.kb/manifest.json`
- Advisory file-level: all other readable UTF-8 files
- Explicitly skipped: binary blobs, unsupported encodings, symlinks, and submodules

**CLI Flags for staged checking:**
- `--staged` - Only check staged files
- `--min-links <N>` - Minimum requirement links per symbol (default: 1)
- `--kb-path <path>` - Path to KB directory
- `--rules <rule1,rule2>` - Specific rules to run
- `--dry-run` - Show what would be blocked without blocking commit

**See also:**
- [Troubleshooting](troubleshooting.md) - Hook repair and remediation
- [AGENTS.md](../AGENTS.md) - Agent-specific workflows

---

*For detailed system architecture, see [architecture.md](architecture.md)*
*For entity and relationship schemas, see [entity-schema.md](entity-schema.md)*
*For MCP server reference, see [mcp-reference.md](mcp-reference.md)*
