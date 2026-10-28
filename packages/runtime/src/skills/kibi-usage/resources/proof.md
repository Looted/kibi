# Proof and Verification Workflow

Use this resource when a requirement must be tested end to end before handoff, when
wiring a proof-bearing test, or when `kb_ingest_proof` or `kibi prove`
rejected evidence.

Kibi does not support test runners. Kibi supports proof evidence. Any
producer (Playwright, pytest, JUnit, TAP, shell commands, database harnesses)
reports what happened as `kibi.proof-run.v1`; Kibi evaluates proof.

## Golden path

1. Query the test (`kb_query`, `type: test`) and read its
   `kibi.proof-contract.v1`, `proof_bindings`, and `verification_scope`.
2. Run the configured producer through the canonical command:

   ```bash
   kibi prove --test TEST-<id>
   # or: kibi prove --requirement REQ-<id> | --integration <id> | --all
   # add --stale to rerun only tests without a current passing receipt
   # add --resume to continue an interrupted run (same selector)
   ```

   With `--test`, `--requirement` or `--stale`, a direct `playwright test`
   integration runs only the selected tests' `proof_bindings[].source_file`
   specs; wrappers get them as `KIBI_PROOF_SOURCE_FILES`.

   `kibi prove` captures the workspace snapshot, runs each integration's
   producer once (`shell: false`), revalidates the snapshot, evaluates the
   artifact against every selected contract, and appends idempotent
   `kibi.proof-receipt.v2` receipts (v1 receipts stay valid).
3. Confirm with `kb_status` (fresh, current snapshot) and `kb_coverage`.

Never hand-write receipts. Kibi derives them from validated
`kibi.proof-run.v1` artifacts only.

## Proof contracts

A proof-bearing test declares explicit obligations (never a Cartesian
cases-times-projects matrix):

```yaml
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: web-e2e          # id from .kb/proof/integrations.json
  required_proofs:
    - symbol_id: SYM-PW-4F2A9C61B7D03E85
      target: chromium          # browser, runtime, db, device, or default
  success_policy: all_required_first_attempt
proof_bindings:                 # optional provenance metadata
  - symbol_id: SYM-PW-4F2A9C61B7D03E85
    target: chromium
    native_id: tests/checkout.spec.ts::accepts a card
```

Provenance lives in `proof_bindings`; the contract stays semantic.

`success_policy: own_results_first_attempt` judges each obligation by its own
`native_case` result when the run failed only in execution (other cases
failed), so one unrelated failing case does not fail every receipt of a
Playwright suite. Aggregate-run obligations, run-level errors, timeouts,
interruptions and setup failures still refuse every obligation. Keep
`all_required_first_attempt` unless the user wants per-case judgement.

- Every `required_proofs[].symbol_id` must name an existing `symbol` entity,
  or `kb_check` reports `proof-contract-symbols`. Create the symbols first
  (`kb_upsert`, narrow method-level granularity, never a `type-shape`
  symbol): a production symbol `implements` the requirement and is
  `covered_by` the test; an executable test symbol is `executable_for` it.
- `proof_bindings[].source_file`, when set, must equal the named symbol's
  `sourceFile`: for a production symbol that is the production file, not the
  spec file that exercises it. Omit it when unsure.

## Integration configuration

`.kb/proof/integrations.json` (`kibi.proof-integration.v1`) is tracked,
Kibi-managed configuration describing evidence production only. Never
hand-write it: `kibi proof inspect --json` proposes a `command` integration
for the detected test runner (the `package.json` `test` script first) and
returns `integrationPlan`, a hash-bound `kibi.migration-plan.v2`, plus the
`contractDefaults` a proof-bearing test's `proof_contract` uses. Show the
proposal to the human, then apply the plan with `kb_apply_plan` (or
`kibi apply-plan --input -`) passing `plan`, `approvedPlanHash` (the plan's
`planHash`) and `approvedActionIds`. Once the file exists, a create plan is
refused (`status: error`, `MIGRATION_PLAN_REFUSED`, `data.outcome: refused`;
nothing is written); `kibi proof inspect --update <id> --json` plans adding or
replacing one named integration.

- `producer: command` — Kibi synthesizes the envelope from the process
  outcome; obligations are bound with `aggregate_run` provenance and the
  single process invocation counts as the known first attempt. The run is
  judged as a whole: any failing test in it fails every obligation of every
  test that names the integration, so a suite with unrelated failures proves
  nothing. Narrow the command to the proof-bearing tests with
  `kibi proof inspect --update <id> --command "<command>" --json` (without
  `--command` the proposal is the `package.json` `test` script or the
  detected runner again), or make the run attributable per test: have the
  command write a `kibi.proof-test-report.v1` to the path in
  `KIBI_PROOF_TEST_REPORT` so each test is judged by its own steps. The
  shipped `kibi proof run-steps` does that from `proof/steps.json`
  (`[{test_id, steps: [[argv...]]}]`); use it as the integration command
  instead of writing a producer script.
- `producer: playwright` (or custom) — the child emits `kibi.proof-run.v1`
  itself (bundled reporter: `kibi-cli/playwright-reporter`).
- `producer: junit` / `tap` — Kibi converts the native report at `artifact`
  using each test's `proof_bindings`; standard formats carry no retry
  history, so attempts are reported as `unavailable` and fail the strict
  first-attempt policy closed.

Cosmetic edits (descriptions, labels) never stale proof. Execution-relevant
edits (command, artifact, targets, options, bindings, contract) change the
effective fingerprint and do.

## What counts toward proofTested

A requirement reaches `proofStatus: tested` only through its scenarios' tests, and a scenario test
counts only when it is an **end-to-end** test with a valid, fresh, passing
receipt for the current snapshot.

- The scope comes from the test entity's `verification_scope`
  (`end_to_end`, `integration`, `unit`), never from the integration id or the
  producer. Without `verification_scope`, a test tagged `e2e` (or whose
  `source` path contains `e2e`) counts as end-to-end; anything else is
  `unknown` scope.
- A `unit` or `integration` receipt is still recorded on the test entity, but
  it does not move `proofTested` for a behavioural requirement: the
  requirement keeps the `missing_passing_e2e` gap in `proofGaps`. The one
  exception is a scenario whose specifying requirements are all grounded only
  in component-scope UI predicates (`ui_pattern`, `same_pattern`,
  `pattern_marker`); a unit or integration test that renders the component
  may prove it.
- `coverage_depth` (`kb_coverage`, `kb_find_gaps`) follows the test's
  authored `status` (`passing`) and scope, not its receipts: a passing
  receipt does not change it, and a `passing` status without a fresh receipt
  proves nothing.

## Evidence levels

Every requirement row also carries `evidenceLevel`, the strength of what backs
it, and `evidence`, the entries that earned it (each with `kind`, `scope` and
`level`):

- `proved`: the requirement is `tested` and every applicable claim has a
  derived, code-scope binding from a fresh certificate that still re-checks
  (see Certificate proof kinds). The entry has `kind: certificate` and lists
  the tests. `claimSummary` counts claims per level and `unprovedClaims`
  lists the claims below proved.
- `tested`: `proofStatus` is `tested`; fresh E2E receipts cover every linked
  scenario.
- `asserted`: a person stands behind the statement (approved, or firm by
  `firmness` or a non-agent origin) but nothing current checks it.
- `unverified`: an agent wrote it, no person approved it, nothing checks it.

Report the level as it is. Never call an `asserted` or `unverified`
requirement proven or tested, and never call `tested` proved. Firmness is a
separate axis: it says how sure the person is, not how strong the evidence is.

## Certificate proof kinds

A contract's `kind` says what its evidence can reach. The runner kinds `e2e`
(the default), `example` and `property` support `tested`. The certificate
kinds support `proved`, and only when Kibi re-checks the certificate the test
left:

- `exhaustive`: the test runs a check on every member of a finite domain.
  Set `domain_source: { symbol_id: SYM-<domain> }` to the symbol that defines
  the domain (add `export: <name>` when the export is not named like the
  symbol's title), and import that symbol in the proof file. Kibi loads the
  export itself (bun, the workspace's tsx, or node; for a `.py` domain
  `KIBI_PYTHON`, the active or project `.venv`/`venv`, then `python3`:
  Enum values, dict keys, list/tuple/set items) and rejects a
  certificate that does not cover exactly its members, so a hand-listed or
  partial domain stays `tested`. An import from build output is mapped back
  to its source through `tsconfig.json` `outDir`/`rootDir`.
- `typecheck`: a witness file that stops compiling when a domain member
  goes unhandled (a switch ending in a `never` assignment, or a
  `satisfies Record<Domain, ...>` map). Set `witness.path` and
  `domain_source`; the witness must import the domain. Kibi compiles the
  witness itself (strict, with the workspace's TypeScript and the import
  resolution and declaration files of the nearest `tsconfig.json`), so
  `typescript` must be
  installed in the workspace (TypeScript 7 has no compiler API: add
  `typescript@6` as a dev dependency). With `proves`, Kibi decides each
  claim with its own witness and reports the fields or members that break
  it. When the test's compile failed, the rejection adds the first error
  Kibi's own compile of the witness reports.
- `arithmetic`: a claim on one `int` or `real` variable decided exactly from
  typed facts. Set `constraint_source: { fact_ids: [FACT-...] }` to the
  numeric `property_value` facts (one subject and property); the
  certificate's variable is their `property_key` and its assumptions are
  exactly their constraints. To read the value from the code instead, set
  `value_source: [{ symbol_id: SYM-<constant>, export: <name> }]`; Kibi
  evaluates the number export itself and adds `variable eq value` as an
  assumption. For a count claim over a collection ("exactly 32 tools") add
  `measure: count` and name the list, set, map or object export; Kibi uses
  its size, so do not add a number export just for the proof. A dotted
  export (`POLICY.eventLimit`) reads one field of an object export. A count
  claim needs only `value_source`. Naming the claim's own fact in
  `constraint_source` assumes the claim: without `value_source` Kibi counts
  that derivation as intent only (tested), and with it a code value that
  breaks the claim shows up as contradictory assumptions, which the
  rejection names.
  A claim that every member of a closed set has a property ("Every currency
  in GBP, ILS and ZAR must fail closed") is a set fact whose `property_key`
  names the property, whose `value_set` is the members and whose operator
  is `includes` (other members may have the property too, so two such
  claims over different sets do not contradict). Prove it with `rule`: Kibi
  checks the property on each listed member. The kinds that compare the
  whole set (`exhaustive`, `state_machine`) reject an `includes` fact.
- `smt`: an SMT-LIB query that declares the facts' property as a constant,
  asserts each `constraint_source` fact constraint and then the claim's
  negation. Kibi re-runs z3 or cvc5 on it and accepts only `unsat`.
- `rule`: decisions over finite domains. Set `predicate_source: {<predicate>:
  { symbol_id }}` to the function behind each predicate the claim uses (it
  takes the arguments in order and returns a boolean) and `domains: {<type>:
  { symbol_id }}` to the export listing each argument type's values. Kibi
  calls every function on every combination and model checks the claim's
  fact: a `kibi.logic.v1` rule fact (from `kb_model_requirement` with
  `logic`) must hold for every assignment, a predicate fact must be decided
  as it says, and a set fact whose `property_key` names a predicate needs it
  true for every member. A type name is also a one-argument predicate
  (`role(R)`) to range a variable. A failure names the assignment. A domain
  can come from the project instead of an export (`domains: {<type>:
  {source: {...}}}`, see `source` below). When the predicate is a test
  harness that drives real code (it calls the handler with each role), add
  `harness_for: [SYM-...]` naming that code; the claim binds with scope
  `harness`, which proves, and those symbols must be `covered_by` the test.
  Add `export: <name>` to a `predicate_source` entry when the function's
  export is not the symbol's title.
- `state_machine`: set `domain_source` to the transition table (object or
  Map from state to next states, or `[from, to]` pairs) or to a
  `next(state, event)` function with `domains: {state, event}`;
  `initial_source` names the initial state. Model "transitions must be one of
  a -> b, ..." as a `transitions` set fact (members `a->b`), and terminal,
  initial or reachable states as `terminal_states`, `initial_states` or
  `reachable_states` set facts; Kibi checks that projection exactly.
  Temporal claims use two more projections: "a cancelled invoice can never
  become paid" is a `reachable_pairs` fact with `operator: excludes` and
  member `cancelled->paid`, and "every path from draft to paid must pass
  through approved" is a `required_waypoints` fact with member
  `draft->paid via approved` (paid must be reachable from draft, and not
  once approved is removed). Any projection also takes `includes`,
  `subset_of` and `excludes`. Rules over a machine use `transition`,
  `reachable`, `initial`, `terminal`, `state`.
- `regex`: set `pattern_source` to a `RegExp`, a Python `re.compile(...)` or
  a string constant. Model "X must match `re`" as a string fact with
  `operator: matches` (a JavaScript pattern with the `u` flag, matched
  whole); Kibi decides exact language equality and reports the shortest
  string only one side accepts. Backreferences, lookaround, `\b`, the `g`,
  `y`, `m` and `v` flags, Python `\d`/`\w` without `re.ASCII` and
  non-ASCII letters under `i` are refused with the reason. An exact string
  fact (`eq`/`neq`) checks a constant.
- `source`: Kibi reads a project source itself and checks a set fact
  against what it read, so the test only runs the proof (it may write
  nothing, or `sourceCertificate({ testId })`). Set `source: {reader, ...}`:
  `json`/`yaml` (`file`, `path`, `select`, `field` to read one key of
  each list item, such as the `run` of each workflow step), `glob` (`pattern`, `capture`),
  `openapi` (`file`, `select: operations|unsecured_operations|...`),
  `references` (`files`, `extract: env|imports|calls|string_args|thrown|
  property`), `schema` (`format: drizzle|prisma|sql`, `select:
  tables|columns|required_columns|nullable_columns|foreign_keys`), `routes`
  (Hono or Express app export, `path_prefix`, `names_from`, `select:
  routes|middleware`) or `validator` (zod, valibot or pydantic, `select:
  fields|required_fields|optional_fields`). A member Kibi cannot read
  statically (a computed env name, a dynamic import, an env object handed
  to a variable) fails the read with its location, and so does an empty
  read (a glob matching no file, migrations with no `CREATE TABLE`), so a
  read is never silently partial. Model the claim as a set fact: `eq`
  (exactly), `includes` (at least), `subset_of` ("must be one of"),
  `excludes` ("must never use"); `property_key: required_fields` or
  `nullable_fields` (only `eq`/`includes`) with bare members `name` for
  "every table" (it also covers tables added later) or `table.name` for
  one; `middleware` with `includes` for "every route under /p must use M"
  (Kibi checks each route); `precedes` with `includes` and members
  `"A -> B"` for an order in a list ("the gate runs before the push"):
  A and B are both in the list and every A comes before every B. Name
  middleware with `names_from`: a
  zero-argument factory export such as `requireAuth()` names the
  middleware it returns `requireAuth`. Write the fact with `kb_model`
  (requirement mode, `operator` plus a list `value`) or `kb_upsert`. The
  receipt stales when a file the read touched changes, and the claim binds
  with scope `source`. `value_source` accepts `{source, measure: count}`.
  The builders need kibi-cli 2.33.0 or newer in the project. The env
  extractor reads `process.env`, `import.meta.env`, `Bun.env`,
  `Deno.env.get`, `os.environ` and `os.getenv`, through casts.

`arithmetic` and `smt` from `constraint_source` alone prove that the
knowledge base's facts entail the claim, not that code follows the facts:
their claim bindings have scope `intent` and the claim stays `tested`. Use
`value_source` (its symbols `covered_by` the test) for scope `code`. A test
whose numbers are not in typed facts or code constants stays `tested`.

Every certificate contract names the claims it proves in `proves:
[CLAIM-...]` (blocking `proof-contract-claims` from schema 12). Kibi derives
each claim's obligation from its grounding fact: a set fact (`value_type:
set`, `value_set: [...]`) needs the `exhaustive` domain or the `typecheck`
domain type to be exactly the set (with `property_key: required_fields`,
`typecheck` instead needs every member to be a required, non-nullable field
of the domain type); a numeric fact needs the `arithmetic` claim or the
negated `smt` assertion to be its constraint; rule, predicate, machine and
string facts need the `rule`, `state_machine` or `regex` checks above. The receipt
records one binding per claim: `derived` (checked, the only kind that
proves), `attested` (the fact has no derivation; counts as tested) or
`rejected` with the reason. Model an enumerated claim as a set fact and a
bound as a numeric fact before writing its certificate. `kibi proof explain
REQ-...` shows each claim with its bindings.

Build the certificate with `kibi-cli/proof-certificates`
(`exhaustiveCertificate`, `typecheckCertificate`, `arithmeticCertificate`,
`smtCertificate`, `ruleCertificate`, `stateMachineCertificate`,
`regexCertificate`, `sourceCertificate`; `readProjectSource` returns Kibi's
read for a test that wants to assert on it), fail the test when it records a failure
(`failedMembers`, `failedCalls`), and call `writeCodeCertificate`; it writes to the
directory `kibi prove` sets in `KIBI_PROOF_CERTIFICATES` and does nothing
elsewhere. A Python test writes the same `kibi.code-certificate.v1` JSON
to that directory itself. Wire the KB: the proof file symbol is
`executable_for` the test and named in `required_proofs`; the domain symbol
(and every symbol a rule, machine or pattern contract names) `implements`
the requirement and is `covered_by` the test; the test
`validates` one of the requirement's scenarios. `proved` is per claim: a
multi-claim requirement is proved only when certificates derive every
applicable claim, and reads `tested` with `n/m claims proved` otherwise. A
rejected certificate leaves the receipt at `tested` with
`certificate_rejection` naming why; fix the proof, never the receipt. If a
stored certificate stops re-checking later, coverage and `kibi proof
explain` list it under `certificateRejections`. Use a
certificate kind only when the domain or claim is genuinely finite or
decidable; an e2e test that samples cases stays `tested`.

## Evidence floors

Each current requirement accepts a weakest level, its floor: the
`required_evidence` field (`proved`, `tested`, `asserted` or `unverified`),
or, when absent, `tested` for a firm requirement and no floor otherwise.
`kb_check`'s `evidence-floor` rule fails while the level is below the floor;
coverage rows show it as `evidenceFloor` (`required`, `source`, `status`).
A requirement whose receipts are only older than the code is
`pending_reproof` and passes a plain check; `kibi check --fresh-evidence`
fails it, and is what CI runs after `kibi prove`.

Fix a finding by raising the level: add the scenario, the end-to-end
test with a proof contract and the receipts, or have a person approve the
requirement. Lower `required_evidence` only when a person decides the
requirement does not need that evidence, and say why in the requirement.

## Knowledge-base certificates

`kb_check` (`kibi check`) proves facts about the KB itself in its
`kb-consistency` rule and re-checks each answer with an independent checker:
property facts are consistent (a model per subject, property and scope, or an
irreducible contradiction core), predicate facts and allow/deny decisions are
consistent, and stored rules are stratified. It catches facts that contradict
only together, which the pairwise `domain-contradictions` rule misses. A
`kb-consistency` violation names the core facts and the requirements behind
them: supersede or change one of those requirements; never edit the facts so
the check passes. Quote a `kb-consistency-unresolved` diagnostic as
unresolved, never as consistent. Opposing rule pairs and scenario
feasibility are not certified yet; their own rules still decide them.

## Attempt semantics (factual, never optimistic)

- `attempts: {status: "complete", entries: [...]}` — known history; the
  strict policy requires a passing **first** entry.
- `attempts: {status: "unavailable"}` — unknown native history; the strict
  policy fails closed, except `aggregate_run` results, which are satisfied by
  the Kibi-launched process attempt when the run passed with exit code 0.
- `run.outcome` is authoritative: a failed, errored, cancelled, interrupted,
  or `no_results` run proves nothing, even with passing individual results.

## Common rejections

- `No proof integration configuration` — proof is not configured for this
  repository yet; run `kibi proof inspect --json`, review its
  `integrationPlan` and apply it with `kb_apply_plan`.
- `integration '<id>' ... is not configured` — the test names an integration
  the file lacks; plan it with `kibi proof inspect --update <id> --json`.
- `captured snapshot is not the live workspace snapshot` — the tree changed
  between capture and ingest; re-run `kibi prove`.
- `artifact command_argv does not match the configured command` — the
  artifact came from a different command than `integrations.json` configures.
- `attempt history unavailable` — the producer could not prove first-attempt
  success for a native-case obligation; use a producer with complete history
  or accept aggregate provenance.
- `proof_receipts is append-only` — receipts are append-only; update tests
  through the engine (which appends) or include the existing history when
  authoring test files directly.

## After code changes

Receipts bind to the contract, the test document (its links excluded) and
the code of the symbols they cover. A change to that code stales them:
re-run `kibi prove --stale` (or the affected selection), then confirm
`kb_status` and `kb_coverage` before handoff. Type-shape symbols covered by a
unit test count only while that unit test has a current passing receipt, so
prove unit tests that cover type-shape symbols too.

Full reference: [Proving requirements](https://looted.github.io/kibi/reference/proving.html)
(`docs/proving-requirements.md` in the Kibi repository).

## Debugging proof regressions

When the `evidence-floor` rule fails, diagnose first. Do not lower
`required_evidence` to make it pass.

1. Read the finding: it names the requirement, its level, its floor and where
   the floor comes from (`explicit` or `firmness`).
2. Identify the exact requirement and symbol responsible for the regression.
3. Use Kibi proof diagnostics rather than reverse-engineering
   `requirement_proof.pl`:

   ```bash
   kibi proof explain REQ-<id>
   kibi proof explain SYM-<id>
   kibi check --rules evidence-floor
   ```

4. For `missing_production_symbol_coverage`, inspect symbol role, owning
   requirement, `covered_by`, candidate test scope, the requirement scenario
   chain, and the current proof receipt. `kibi proof explain` prints those as
   three labeled blocks so they cannot be confused:
   `required_proofs` (TEST contract obligations), `executable_for` (test-code
   identity), and `covered_by` (production coverage candidates with primary
   plus optional secondary reasons).
5. A behavioral production symbol requires qualifying behavioral/E2E evidence
   under the current proof model.
6. Unit coverage can satisfy structural/type-shape requirements only when the
   symbol genuinely represents structural shape and the proof model allows it.
7. `executable_for` identifies executable test code. Never use it on
   production helpers merely to remove production coverage obligations.
8. Do not trust TEST names. Resolve
   `TEST -> proof_contract.required_proofs -> SYM -> source` and inspect what
   the executable test actually exercises. Kibi does not infer “this TEST name
   does not match that source file.”
9. A passing proof producer does not automatically make every authored
   `covered_by` relationship semantically correct.
10. Prefer one meaningful E2E scenario covering multiple internal functions
    plus focused unit tests for edge cases, rather than an E2E test per helper.
11. A `pending_reproof` finding under `--fresh-evidence` needs `kibi prove`
    for the tests behind the requirement, not a KB change.
