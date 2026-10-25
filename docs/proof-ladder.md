# The requirement proof ladder

Consumer-facing reference for `proofStatus`, `proofStages`, `proofGaps`, and
`proofAdvisories` as reported by `kibi coverage --by req` and `kb_coverage`.
The authoritative implementation is `packages/core/src/requirement_proof.pl`
(proof version `kibi.requirement-proof.v4`); this document explains what each
stage means and what to do when it does not pass.

## Applicability: is the requirement in scope at all?

The ladder only evaluates **current** requirements. A requirement is current
when its `status` is one of:

- Canonical: `open`, `in_progress`, `closed`
- Legacy (accepted for backwards compatibility): `active`, `approved`

Everything else is out of scope by design. Two things can take a requirement
out of scope:

1. **Supersession** — a newer requirement links to it with `supersedes`.
2. **Status outside the vocabulary** — e.g. the ADR vocabulary `accepted`.
   Since that silently excludes the requirement from proof, `kibi check`
   reports it as a blocking `req-status-vocabulary` violation instead of
   letting it hide.

Out-of-scope requirements report:

```json
{
  "proofStatus": "not_applicable",
  "proofGaps": [],
  "proofStages": {
    "applicability": {
      "status": "not_applicable",
      "reason": "status 'accepted' is not a current requirement status"
    }
  }
}
```

The typed `reason` is what `not_applicable` used to hide: superseded
requirements say so; status-vocabulary mismatches name the offending status.

## Proof exemption: current but intentionally not E2E-provable

Some current requirements cannot be proven by end-to-end evidence —
toolchain-currency gates, architectural boundaries, quality-gate policy.
Parking them with an ADR status is exactly the trap above. Instead, mark them
explicitly in the requirement document:

```markdown
---
id: REQ-TOOLCHAIN-001
status: open
priority: must
proof_exempt: true
proof_exempt_reason: architectural boundary — verified by toolchain CI, not product E2E
---
```

`proof_exempt` requires a non-empty `proof_exempt_reason` (upsert validation
enforces the pairing, and the ladder ignores an exemption without a reason).
Exempt requirements report `not_applicable` with the author's reason attached,
so coverage can distinguish "cannot be proven" from "not proven yet".

To re-enter the proof ladder, remove both properties.

## The stages

For in-scope requirements the ladder evaluates nine stages, in order. Each
stage reports a `status` under its key in `proofStages`; `productionSymbols`
also carries a typed `reason` when it does not pass.

| # | Stage | Key in `proofStages` |
| --- | --- | --- |
| 1 | [Semantic inventory](#1-semantic-inventory) | `semanticInventory` |
| 2 | [Logic grounding](#2-logic-grounding) | `logicGrounding` |
| 3 | [Contradictions](#3-contradictions) | `contradictions` |
| 4 | [Scenarios](#4-scenarios) | `scenarios` |
| 5 | [Scenario tests](#5-scenario-tests) | `scenarioTests` |
| 6 | [Passing E2E tests](#6-passing-e2e-tests) | `passingE2e` |
| 7 | [Executable test symbols](#7-executable-test-symbols) | `executableSymbols` |
| 8 | [Production symbols](#8-production-symbols) | `productionSymbols` |
| 9 | [Source coordinates](#9-source-coordinates) | `sourceCoordinates` |

### 1. Semantic inventory

**Checks:** every assertive statement in the requirement's prose is listed in
its semantic inventory and classified as modeled, unresolved, missing or
nonlogical.

- `passed`: the inventory is complete and nothing in it is unresolved.
- `missing`: there is no inventory, an entry is classified as missing, or an
  entry is malformed.
- `unresolved`: at least one statement is classified as unresolved.

### 2. Logic grounding

**Checks:** each modeled claim is grounded by a strict property, predicate or
safe rule fact, one to one with the declared manifest.

- `passed`: every modeled claim has exactly one grounding fact.
- `missing`: a claim has no grounding fact or no manifest entry.
- `unresolved`: the grounding exists but does not line up (an extra or
  duplicate manifest entry, claim text that differs, an invalid or undeclared
  fact, an unsafe rule).

### 3. Contradictions

**Checks:** no other current requirement contradicts this one over shared
facts.

- `passed`: no conflict was found and grounding is complete.
- `blocked`: a conflict was found; `conflicts` names it.
- `unresolved`: the check could not finish, usually because logic grounding
  is incomplete, so the absence of a found conflict is not evidence of safety.

### 4. Scenarios

**Checks:** at least one scenario specifies the requirement (`specified_by`).

- `passed`: one or more valid scenarios are linked.
- `missing`: no scenario is linked, or a link points at a scenario that does
  not exist.
- `blocked`: a linked success scenario is infeasible; `infeasibleScenarios`
  names it.

### 5. Scenario tests

**Checks:** each linked scenario is validated by at least one test
(`verified_by` or `validates`).

- `passed`: every scenario has a test.
- `missing`: a scenario has no test, or links a test that does not exist.

### 6. Passing E2E tests

**Checks:** every linked scenario has at least one end-to-end test, and every
linked E2E test that bears proof carries a valid, fresh, passing
`kibi.proof-receipt.v1` receipt bound to the current snapshot, contract hash
and fingerprint.

- `passed`: every scenario obligation passed.
- `missing`: a scenario has no qualifying E2E test or receipt.
- `unresolved`: the evidence exists but does not qualify (for example a stale,
  failed or invalid receipt).

Per-scenario results are in `scenarioObligations`, each with the
`acceptedScopes` it allows. Unit and integration tests linked alongside the
E2E tests do not block. A UI pattern scenario also accepts component tests;
see [Component-scope proof](#component-scope-proof-for-ui-patterns).

### 7. Executable test symbols

**Checks:** each qualifying E2E test is linked to executable test code with
`executable_for`.

- `passed`: every qualifying test has executable code linked.
- `missing`: a test has no `executable_for` link; `missingTests` lists it.
- `blocked`: there are no passing E2E tests to check.

### 8. Production symbols

**Checks:** the production symbols that implement the requirement are covered
by the passing E2E tests (`covered_by`).

- `passed`: every production symbol is covered.
- `missing`: no production symbol implements the requirement, or some lack
  `covered_by` links; `uncoveredSymbols` lists them.
- `blocked`: there is no passing E2E evidence in the current snapshot
  (usually stale or missing receipts), so coverage cannot be evaluated.
  `reason` says so and points at `kibi prove`.

`explanations[]` gives each symbol a rollup reason and, for each rejected
`covered_by` candidate, a primary rejection code plus optional secondary codes.
See [Stage statuses, precisely](#stage-statuses-precisely).

### 9. Source coordinates

**Checks:** the requirement source and every linked test and production symbol
carry exact published coordinates.

- `passed`: all coordinates are present.
- `missing`: the requirement has no source, or a symbol has no coordinates;
  `missingSymbols` lists them.
- `blocked`: there are no linked symbols to check.

### Component-scope proof for UI patterns

A scenario whose specifying requirements are all grounded only in the built-in UI pattern
predicates (`ui_pattern`, `same_pattern`, `pattern_marker`, each linked with
`requires_predicate`, and no `requires_property` or `requires_rule`) accepts tests with
`verification_scope` `unit` or `integration` as well as `end_to_end`. Such a test still
needs a valid, fresh, passing receipt, `executable_for` code, and `covered_by` links for the
production symbols it proves. Its obligation reports
`acceptedScopes: [unit, integration, end_to_end]`; every other scenario reports
`[end_to_end]`.

The reason is cost, not leniency: a pattern ("this list is a line-and-dots timeline in
both variants") is fully observable by rendering one component in isolation, so demanding a
browser test per pattern would make E2E suites heavy for no extra evidence. The moment the
requirement also carries a layout fact such as `ui_container`, a strict property or a logic
rule, the scenario goes back to end-to-end proof. See [ui-requirements.md](./ui-requirements.md).

### Stage statuses, precisely

- `passed`: the stage's obligations hold.
- `missing`: the evidence is absent. The stage names what is missing
  (`missingTests`, `missingReceiptTests`, `uncoveredSymbols`,
  `missingSymbols`, ...), and `proofGaps` carries the blocking gap code.
- `unresolved`: evidence exists but is not conclusive (for example unresolved
  statements in the inventory, or a stale receipt).
- `blocked`: the stage found a hard stop or has nothing to evaluate:
  - `contradictions`: a conflicting requirement was found.
  - `scenarios`: a linked success scenario is infeasible.
  - `executableSymbols` and `productionSymbols`: there is no passing E2E
    evidence in the current snapshot (typically stale or missing receipts).
    `productionSymbols` says so in `reason`; `uncoveredSymbols` still lists
    every remaining production symbol, and each explanation uses
    `stage_blocked_no_passing_e2e` rather than implying the symbol itself
    lacks `covered_by`.
  - `sourceCoordinates`: there are no linked symbols to check.

`explanations[]` on `productionSymbols` never changes `status`, `reason`,
`uncoveredSymbols` or `proofStatus`. A rejected `covered_by` candidate carries
the earliest disqualifying `reason` and optional `secondaryReasons` already
known from cheaper checks. Tests outside the scenario chain do not have their
receipts read.

A `blocked` stage never silently counts as passing. A blocked
`contradictions` stage makes `proofStatus` `unresolved`; any other blocked
stage does the same unless another stage is `missing`, in which case
`proofStatus` is `missing`.

## Gaps, advisories, and status

- `proofGaps[]` — blocking only. Every entry carries a code (e.g.
  `missing_proof_receipt`, `missing_production_symbol_coverage`), a priority,
  a stage name, and a suggested repair action.
- `proofAdvisories[]` — explicitly non-blocking context. Receipt-completeness
  codes (`missing_proof_receipt`, `stale_proof_receipt`,
  `failed_proof_receipt`, `invalid_proof_receipt`, and
  `proof_contract_mismatch`) remain blocking for every linked E2E obligation;
  they are never downgraded because another scenario has a passing receipt.
- `proofStatus` — the headline:
  - `tested` — all stages passed (`proofGaps` is empty by invariant).
    Until `kibi.requirement-proof.v4` this value was `proven`; it was renamed
    because passing end-to-end tests are evidence, not proof.
  - `missing` — at least one stage is `missing` (evidence absent).
  - `unresolved` — evidence is inconclusive or a stage is `blocked`.
  - `not_applicable` — out of scope; see applicability above.
- `proofRepairs[]` — ranked concrete recovery actions derived from blocking
  gaps.

## Evidence levels

`proofStatus` says how far a requirement climbed the ladder. `evidenceLevel`
says how strong the evidence behind it is, and is never stronger than what
backs it:

| Level | Meaning | What earns it |
| --- | --- | --- |
| `proved` | A checker established the claim for every case and left a certificate a second program can re-check | A proof certificate. No proof kind issues one yet, so no requirement reaches this level today |
| `tested` | Passing runs on sampled cases, bound to the current code snapshot | `proofStatus: tested` |
| `asserted` | A person stands behind the statement, but nothing current checks it | `origin.approved_by`, or firm: `firmness: firm`, or no `firmness` and an origin other than `agent` |
| `unverified` | Stated, not approved, no evidence | Nothing: an agent wrote it and no person approved it |

Each row's `evidence[]` lists the entries that earned the level, each with
`kind` (`e2e`, `human_intent`), `scope` (`code` for what the tests exercised,
`intent` for what a person stated) and `level`; an `e2e` entry names its
passing `tests`, a `human_intent` entry its `basis` (`approved` or `firm`)
and, when there is one, the `ref` to the person's words. The coverage
summary counts rows per level under `evidenceLevels`.

Firmness and evidence level are separate axes. Firmness says how sure the
person is; the level says how strong the evidence is. A firm requirement at
`asserted` is the gap to close before relying on it.

## Evidence floors

Each current requirement also has a floor: the weakest evidence level it
accepts. The `evidence-floor` rule of `kibi check` fails while a
requirement's level is below its floor, so a regression is caught on the
requirement itself and no shared snapshot file has to be kept in step.

| Floor | Where it comes from |
| --- | --- |
| `required_evidence: proved \| tested \| asserted \| unverified` | Set on the requirement by its author |
| `tested` | No `required_evidence` and the requirement is firm (`firmness: firm`, or no `firmness` and an origin other than `agent`) |
| `unverified` (no floor) | No `required_evidence` and the requirement is not firm |

Coverage rows carry the floor as `evidenceFloor` with `required`, `source`
(`explicit` or `firmness`) and `status`: `met`, `below`, or `pending_reproof`
when the floor is `tested` and every gap only says the receipts are older
than the code. A plain `kibi check` lets `pending_reproof` pass, so a local
check catches grounding, contradiction and link regressions without
re-proving first. `kibi check --fresh-evidence` judges receipts as they are
and also needs a clean proof snapshot; run it right after `kibi prove`, as CI
does.

Requirements outside proof scope (`proof_exempt`, superseded or not current)
have no floor. Lowering a floor is a visible edit to the requirement, so
reviewers see it; give the reason in the requirement when you lower one.

The schema 11 upgrade (`kibi migrate --yes`) records `required_evidence:
asserted` on each current firm requirement that has no scenario verified by
an end-to-end test with a proof contract and a passing receipt, since it has
not reached `tested`; raise it once the requirement has an end-to-end proof.
Firm requirements whose proof has passed keep the `tested` floor, and the
migration lists them. Their proof can still have gaps it does not read, such
as a stale receipt or a production symbol without `covered_by`, so run
`kibi check --rules evidence-floor` after migrating and fix what it reports.

## Knowledge-base certificates

Evidence levels describe requirements. The `kb-consistency` rule of
`kibi check` (and `kb_check`) covers the knowledge base itself: it states a few theorems about the facts current requirements
name, finds a certificate for each, and re-checks every certificate with a
separate checker (`certificate_check.pl`) that never searches and never loads
the code that found the certificate.

| Theorem | Certificate when it holds | Certificate when it fails |
| --- | --- | --- |
| `properties_consistent` | A model per subject, property and scope: one value that satisfies every fact (a `forbid` fact counts as its negation) | An irreducible core: facts that admit no value together, with one model per dropped fact to show each is needed |
| `predicates_consistent` | A truth value per ground atom that every fact agrees with | Two facts that assert and deny the same atom |
| `decisions_consistent` | One allow or deny per decision key | Two facts with opposite effective decisions |
| `rules_stratified` | A stratum number per rule predicate: a head is at least its body's stratum, and above it across `not` | A negation cycle: a closed path of rule dependencies with a negated edge |

The property theorem is joint: facts that contradict only together, where
every pair still admits a value (for example `int >= 0`, `<= 1`, `!= 0`,
`!= 1`), are a contradiction here even though the pairwise
`domain-contradictions` rule is silent. A core whose facts are never valid at
the same time is reported as `property_unresolved`, not as a contradiction.
A context the checker cannot compare (mixed value types or units, an
operator other than `eq`/`neq` on a non-numeric value, an unknown polarity)
is unresolved and needs no certificate; it never counts as consistent.

A re-verified contradiction (a core, two disagreeing facts or a negation
cycle) is a blocking `kb-consistency` violation, and so is a certificate the
checker rejects. An unresolved context is a non-blocking
`kb-consistency-unresolved` diagnostic. `kibi check --staged` runs the rule
too, so a commit that introduces a joint contradiction is blocked. Opposing
rule pairs and scenario feasibility are not certified yet; their own
`kibi check` rules still decide them. Certificates are regenerated on each
run and are not committed: `kibi check --write-certificates <file>` saves the
bundle, and `kibi check --certificates <file>` re-checks a saved one and
prints each theorem's verdict (`proved`, `disproved` or `unresolved`).

## Common failure patterns

| Symptom | Usual cause | Fix |
| --- | --- | --- |
| `productionSymbols: blocked` | No passing E2E receipts in the current snapshot at all | Run `kibi prove` to refresh receipts, then re-check |
| `missing_symbol_coordinates` gap | Symbol has no coordinate entry; often `granularity_reason` missing so the coarse fallback was gated off | `kibi sync --refresh-symbol-coordinates` reports failed ids and reasons; add `symbol_role`/`granularity_reason` where the reason says to |
| Requirement missing from proof reports entirely | Non-current status or supersession | Coverage `--status not_applicable --by req` lists it with the typed applicability reason |
| `passingE2e.scenarioObligations` has a non-passed status | A linked scenario has no E2E test or one of its E2E proof-bearing tests lacks qualifying evidence | Inspect the scenario's `gaps`, repair every listed receipt, and run `kibi prove` |

## Related surfaces

- `kibi coverage --by req --status missing` (also: `tested`, `unresolved`,
  `not_applicable`) — enumerate exactly one proof-status slice; N/A rows
  include their applicability reason. The summary always reflects the whole
  KB.
- `kibi proof inspect` — detect test infrastructure, propose a proof
  integration, and return the reviewed plan that writes
  `.kb/proof/integrations.json` through `kb_apply_plan`.
- `kibi proof explain REQ-*` / `kibi proof explain SYM-*` — project the same
  Proof, labeling `required_proofs`, `executable_for`, and `covered_by`
  separately.
- `kibi check --rules evidence-floor` — fail every current requirement whose
  evidence level is below its floor (see [Evidence floors](#evidence-floors)).
  Without `--fresh-evidence`, gaps that only reflect stale evidence
  (`stale_proof_receipt`, `proof_contract_mismatch`, and production coverage
  whose symbols all have a qualifying candidate or a scenario-backed E2E
  candidate rejected solely for stale evidence) count as pending re-proof, so
  a local run catches semantic regressions without re-proving. Unit or
  integration scope, missing receipts, invalid evidence, and scenario-chain
  failures stay blocking.
- `bun run proof:gate` (this repository) — the integrity rules plus
  `evidence-floor`, as the pre-push hook and the KB merge workflow run them;
  CI runs it again with `--fresh-evidence` after `kibi prove --all`.
- `bun run proof:replay` (this repository) — replay the CI proof job's gate
  steps from `.github/workflows/proof.yml` in a clean clone of the committed
  HEAD, outside the repository tree, and stop at the first failing step.
- `kibi proof compact` — one-off: drop receipts that can no longer decide
  proof from a store written before `kibi prove` compacted histories on
  ingest. Coverage decisions are unchanged.
- `kibi proof prune --keep 1` — keep only the newest receipt per test,
  whether or not older ones still decide proof.
- `kibi proof migrate-legacy` — remove legacy `verification_receipts` blocks
  from tests that already carry a `proof_contract`.
- `docs/proving-requirements.md` — the runner-neutral proof pipeline:
  contracts, integrations, artifacts, and how `kibi prove` produces receipts.

Before pushing, run `kibi sync --refresh-symbol-coordinates` with the project-local
CLI, review and commit the generated changes, and run `bun run proof:prepush`.
If committing leaves the KB stale, sync it again before the check. This checks the
committed manifests, publish metadata (including exact GitHub owner casing),
and evidence floors (`scripts/proof-gate.sh`) using the project-local CLI. When
proof contracts, coverage links, or proof tooling change, also run
`bun run proof:replay` to reproduce the full CI gate on committed HEAD.

The repository's pre-commit framework configuration includes a `pre-push` stage
for the fast gate. Maintainers using that framework enable it with
`pre-commit install --hook-type pre-push`; tracking the configuration alone does
not install the hook. The fast gate checks the current clean checkout; use the
corresponding checkout when pushing another branch or an explicit ref.
