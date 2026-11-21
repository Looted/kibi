# Results and recovery

## Reading a search answer

Start with `kb_search`, then exact-filter with `kb_query`. Use `kb_status`
when branch or freshness confidence matters. `kb_search` defaults to intent
ranking, so you can ask it a question ("what governs checkout rounding?"); its
`data.answer` layer lists the current governing requirements with linked
facts, scenarios, tests, and ADRs, separates superseded requirements, and
labels observations as notes. Each governing requirement also carries a
`verdict` (`contradiction`, `infeasible`, `unknown`, or `none`, which is not
proof), the `exceptions` that exempt it, and the `unknowns` the checks could
not decide. Those links and verdicts are discovery, not proof. Answer a
question about why a rule is what it is from that requirement's `why`: quote
its recorded text; a neighbouring requirement's reason is not this one's; when
`why.recorded` is false, say no reason is recorded, do not supply one, and
offer to record the person's. Pass `sourceLocations` before changing a source
file, and `rankingMode: "legacy"` for literal identifier lookups. A weak
answer may add `queryAnalysis.hints` (requirements the question may mean):
re-ask in their words, never cite a hint as the rule. See
`resources/workflows.md` for the mode recipe.

## Typed results and recovery

Every CLI JSON/MCP result has `kibiProtocol`, `operation`, `resultVersion`,
`status`, `data`, `effects`, `diagnostics`, and typed `nextActions`.
`status: error` normally means a failed pre-commit operation. The bootstrap
error `BOOTSTRAP_PLAN_REJECTED` can follow earlier committed actions: inspect
`data.actionResults` and `data.applied`, then re-plan from the current state.
Its journal is terminal; never recover or replay it. `BOOTSTRAP_PLAN_INVALID`
fails preflight before bootstrap writes or a new journal; obtain a corrected
plan. A migration plan whose actions were refused before changing anything
returns `status: error`, `MIGRATION_PLAN_REFUSED` and `data.outcome:
refused`: nothing changed, so read the action `detail` and get a new plan.
`data.outcome: reconciliation_required` (status success) means an action
failed mid-way: inspect its effect before retrying. `kb_delete` (core MCP profile: CLI `kibi delete --input -`) of an
authored entity returns status success with `deleted: 0` and `outcome:
plan_returned` (or `supersession_required` for a requirement): nothing was
deleted yet, and `nextActions` names the call that does it. If the status is
`committed_with_repairs`, the mutation already committed: inspect failed effects,
execute each required repair action in order, and never retry the original
operation. Record effect failures, followed actions, and unsafe retries in
diagnostic telemetry.

## Results cut to the size budget

Every result keeps its `data` within 24,000 characters. A list cut to the
budget still returns at least one row and says so: `data.truncated: true`,
`data.truncation` (`returned`, `total`, `omitted`, `nextOffset`, `hint`), a
`RESULT_TRUNCATED` info diagnostic and a `nextActions` entry that repeats the
call with `offset: nextOffset`. Page with that offset or narrow the filters;
a larger `limit` returns the same page. One row past the budget is cut and
lists the parts it left out in `omittedFields`. `kb_coverage` and `kb_query`
without an `id` list summary rows, and `kb_coverage` returns its plans as
summaries; pass `fields: "full"` with a small `limit` or a narrow filter for
the full rows and plans. A `kb_check` with `rules` lists its findings in pages
the same way. A read whose data is still over 64,000 characters fails with
`RESULT_TOO_LARGE`: narrow the call.

## Exact Git attachment

The active ref is the exact KB identity. `KIBI_BRANCH` is used verbatim; Git's
symbolic HEAD is used otherwise. Slash, `@`, Unicode, `main`, `master`, and
detached states are not normalized or merged. Hashed stores and their
`branch.json` identity fence are compiled artifacts. A missing exact store is
created by `kibi sync` from this checkout's tracked sources. Kibi never copies
stores across branches and never selects merge winners; unresolved authored Git
conflicts block compilation. See `resources/branch-lifecycle.md` for legacy
migration, worktrees, quarantine, restore, and purge.
