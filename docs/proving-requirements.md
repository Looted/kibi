# Proving Requirements

This guide explains how a requirement goes from "implemented" to "tested":
fresh evidence from any proof producer, bound to the current code snapshot,
evaluated against explicit proof obligations, and recorded in an ordered
proof history that only ever drops receipts that can no longer decide proof.

Kibi does not support test runners. Kibi supports **proof evidence**.
Playwright, pytest, JUnit, TAP, Go tests, shell commands, database harnesses,
device farms, and proprietary systems are all just producers of
`kibi.proof-run.v1` artifacts. Producers report what happened; **Kibi
evaluates proof**.

## The proof chain

```
REQ-* --specified_by--> SCEN-* --verified_by--> TEST-* <--executable_for-- SYM-*
                                                   ^----covered_by---- SYM-*
TEST-* --proof_contract--> obligations --integration--> configured producer
```

A requirement counts as **tested** (`proofStatus: tested`, evidence level
`tested`) only when every required proof obligation
on its contracted test has fresh, passing evidence at the required
`verification_scope` and `verification_perspective`:

- bound to the **current workspace snapshot**,
- bound to the current **proof contract hash** and **execution fingerprint**,
- derived from a validated `kibi.proof-run.v1` artifact (never caller-authored),
- the newest valid receipt within the 7-day freshness window.

## The three integration levels

Bootstrap picks the strongest available mechanism automatically; every project
has a floor.

| Level | Mechanism | Fidelity | Example |
| --- | --- | --- | --- |
| 1 | Native producer | Complete attempt history, native IDs, per-target results | Playwright with `kibi-cli/playwright-reporter` |
| 2 | Standard-format adapter | Native-case outcomes; retry history per source format | pytest/JUnit XML, Go/TAP |
| 3 | Command proof | Aggregate process outcome bound to contracted obligations | `cargo test`, custom scripts |

Level 3 is the universal fallback: **if the project can run a command and
observe its exit code, the project can prove requirements with Kibi.**

## The canonical command: `kibi prove`

```bash
kibi prove --all            # prove every proof-bearing test
kibi prove --test TEST-mcp-search-discovery  # one test
kibi prove --requirement REQ-cli-check
kibi prove --integration self-proof
kibi prove --stale          # only tests without a current passing receipt
kibi prove --all --resume   # continue an interrupted run
```

`--stale` narrows any selector (all tests by default) to the tests whose
receipt is missing, stale, failed or bound to an older contract, judged the
way coverage judges them, so re-proving after a change only reruns what the
change invalidated.

Receipts are written as each integration finishes, and `kibi prove` prints
each integration it starts and ingests on stderr. When a long run is stopped,
rerun the same selector with `--resume`: integrations already ingested at the
same workspace snapshot, for every test the run selects, are skipped (the
record lives in `.kb/proof/runs/prove-progress.json`). After the workspace
changes, `--resume` runs everything again.

When `--test`, `--requirement` or `--stale` selects a subset and the
integration's producer is `playwright`, a direct `playwright test` command is
narrowed to the selected tests' `proof_bindings[].source_file` spec files, so
proving one test runs its specs instead of the whole suite. Narrowing needs a
`source_file` on every selected test's bindings; otherwise, or when the
command is a wrapper such as `npm run e2e`, the whole integration runs and
`kibi prove` says why. Every producer gets the selected tests' bound files in
`KIBI_PROOF_SOURCE_FILES` (a JSON array), so a wrapper can narrow itself.

For each configured integration, `kibi prove`:

1. captures the workspace snapshot,
2. runs the integration's producer **once**,
3. revalidates the snapshot (proof execution must not change tracked state),
4. validates the complete `kibi.proof-run.v1` artifact,
5. evaluates it independently against every selected test's proof contract,
6. derives idempotent `kibi.proof-receipt.v2` receipts and appends them
   (re-checking any certificate the run left, see
   [Certificate proof kinds](#certificate-proof-kinds)),
7. reports gaps with expected versus received values.

One suite run can satisfy many TEST contracts; unrelated results are ignored
per contract.

### CI proof reuse for pull requests

The canonical `kibi.workspace-snapshot.v2` verification snapshot, rather than a
Git commit or branch name, identifies the source state proven by Kibi. On each
successful `develop` push, the strict proof workflow uploads a
`kibi-proof-attestation` artifact with the snapshot version and hash, source
commit, outcome, and workflow run provenance. The artifact is emitted only
after full proof, baseline enforcement, and report generation succeed.

For a PR targeting `master`, the same workflow checks out GitHub's merge
commit and computes its snapshot through Kibi's production snapshot code. It
reuses proof only for a same-repository `develop` PR whose head still equals
the current `develop` branch, whose checkout is the expected merge commit,
and whose exact head has one successful `develop` push proof run with a matching
attestation. If the canonical snapshots match, the workflow records a reused
proof decision and skips the full proof steps. If lookup, provenance, version,
or snapshot comparison is uncertain, it runs the full proof on the merge
checkout using the `master` KB branch identity.

For a same-repository PR targeting `develop`, the workflow compares the merge
commit's snapshot with the attestation of the PR's base commit instead. The
snapshot leaves out general `docs/`, release changesets and the derived `.kb/`
trees, so a PR that only changes those paths has the same snapshot as its
already proven base and skips the full proof. Any change to code, tests,
requirements, symbol manifests, `README.md` or the docs site changes the
snapshot and runs the full proof. Scheduled, manual, fork, and push proof runs
remain full runs.

Reuse is a CI gate decision only. It does not execute tests again, create new
proof receipts, or attach `master` to the `develop` KB branch. The decision
artifact and job summary say whether proof ran or was reused. Attestation
artifacts expire after seven days; expiration simply causes a full proof run.

## Proof contracts

A `TEST-*` entity declares its semantic obligations:

```yaml
verification_scope: end_to_end        # unit | integration | end_to_end
verification_perspective: consumer    # internal | consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof             # id in .kb/proof/integrations.json
  required_proofs:
    - symbol_id: SYM-e2e-packed-cli-check
      target: default                 # browser, runtime, db, device, or default
  success_policy: all_required_first_attempt
proof_bindings:                       # optional provenance metadata
  - symbol_id: SYM-e2e-packed-cli-check
    target: default
    native_id: documentation/tests/e2e/packed/cli-workflows.test.ts::check
```

Contracts are semantic. Native test IDs, aliases, and source coordinates live
in `proof_bindings`, not in the contract. Bindings never replace obligations;
they help adapters map native results to symbols.

### Explicit obligations, not Cartesian matrices

Each `required_proofs` entry is an explicit `(symbol_id, target)` pair. A
suite must demonstrate exactly what the contract declares — no implicit
`cases × projects` combinations.

## Certificate proof kinds

A test samples cases. When a requirement is about a finite domain (every
entity type, every evidence level, every built-in schema), a test can cover
every case, and Kibi can then report the requirement as **proved** instead of
tested. The contract says so with `kind`:

| Kind | Checker | Evidence it supports |
| --- | --- | --- |
| `e2e` (default), `example`, `property` | the test runner | tested |
| `exhaustive` | the test checks every member of a domain it imports from the code | proved |
| `typecheck` | Kibi compiles a witness that fails to compile when a member goes unhandled | proved |
| `arithmetic` | Kibi decides a one-variable claim exactly from the typed facts in `constraint_source` or the code constants in `value_source` | proved |
| `smt` | Kibi re-runs z3 or cvc5 on a query that asserts those assumptions and needs `unsat` | proved |

"Proved" here is what the certificate supports; a requirement is proved only
for the claims a certificate binds to (see "Binding a certificate to claims").

```yaml
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-evidence-levels-exhaustive
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-cli-evidence-levels   # the symbol that defines the domain
```

`exhaustive` and `typecheck` need `domain_source`; `typecheck` also needs
`witness: {path}`. `arithmetic` and `smt` need `constraint_source: {fact_ids:
[...]}`, the typed numeric `property_value` facts (one subject and property,
`value_type: int` or `number`) the claim rests on:

```yaml
  kind: arithmetic
  constraint_source:
    fact_ids: [FACT-RETRY-MIN, FACT-RETRY-MAX]   # retry_count >= 0, retry_count < 4
```

The arithmetic certificate's variable is the facts' `property_key`, its
assumptions are exactly the facts' constraints and its claim is what the
test proves from them; an SMT query declares the property as a constant and
asserts each fact constraint (`(assert (>= retry_count 0))`) before the
negated claim. These kinds prove that the knowledge base's facts entail the
claim; they say nothing about code that does not follow those facts, so pair
them with a test of the code when the code is what matters. A certificate-kind test leaves a `kibi.code-certificate.v1`
JSON file in the directory `kibi prove` names in `KIBI_PROOF_CERTIFICATES`
(outside `kibi prove` the variable is unset and nothing is written). The
`kibi-cli/proof-certificates` module builds and writes them:

```ts
import {
  exhaustiveCertificate,
  failedMembers,
  writeCodeCertificate,
} from "kibi-cli/proof-certificates";
import { EVIDENCE_LEVELS } from "../src/evidence-levels.js";

const certificate = await exhaustiveCertificate({
  testId: "TEST-evidence-levels-exhaustive",
  domain: { symbolId: "SYM-cli-evidence-levels", members: EVIDENCE_LEVELS },
  check(level) {
    // throw when the claim fails for this member
  },
});
writeCodeCertificate(certificate);
expect(failedMembers(certificate)).toEqual([]);
```

### Where the domain comes from

`domain_source.symbol_id` names the symbol that defines the domain. Kibi
loads that symbol's file and reads one export from it: the symbol's title by
default, or `domain_source.export` when the export has another name (a symbol
titled `ENTITY_LANES` whose export is `entityLanes`, or a module-level
anchor):

```yaml
  domain_source:
    symbol_id: SYM-order-status
    export: OrderStatus
```

- **TypeScript and JavaScript**: Kibi tries bun, then the workspace's own
  `tsx` (`node_modules/.bin/tsx`), then node with type stripping and a
  resolve hook that maps extensionless and `.js` relative imports to their
  `.ts` sources. A domain whose module imports runtime-only dependencies
  needs one of these runners to resolve them.
- **Compiled output**: when the proof file imports the domain from build
  output (`dist/status.js`), Kibi maps the import back to the source through
  the nearest `tsconfig.json` (`outDir` to `rootDir`) before checking that the
  proof file imports the domain.
- **Python**: a `.py` domain is loaded with the first interpreter found among
  `KIBI_PYTHON`, the active virtualenv (`VIRTUAL_ENV`), a `.venv` or `venv`
  directory from the domain file's directory up to the workspace root, then
  `python3` (or `python`) on `PATH`, so the domain's own dependencies import.
  It is imported under its package name so absolute and relative imports
  inside it resolve. When loading fails, the rejection quotes the exception
  line of the traceback (`ModuleNotFoundError: No module named 'x'`).
  An `Enum` contributes its member values, a `dict` its keys, and a list,
  tuple, set or frozenset its items. The proof file must import the module
  (`from app.status import OrderStatus`, `from .status import OrderStatus` or
  `import app.status`).

A Python test has no helper module: it writes the certificate JSON itself to
a file in the directory named by `KIBI_PROOF_CERTIFICATES` (skip writing when
the variable is unset):

```python
import json, os
from app.status import OrderStatus

members = [m.value for m in OrderStatus]
results = [{"member": str(m), "outcome": "passed"} for m in members]  # check each
directory = os.environ.get("KIBI_PROOF_CERTIFICATES")
if directory:
    os.makedirs(directory, exist_ok=True)
    with open(os.path.join(directory, "TEST-order-status-exhaustive.json"), "w") as f:
        json.dump({
            "version": "kibi.code-certificate.v1",
            "kind": "exhaustive",
            "test_id": "TEST-order-status-exhaustive",
            "domain": {"symbol_id": "SYM-order-status", "members": [str(m) for m in members]},
            "results": results,
        }, f)
```

### Wiring a certificate test into the KB

A certificate only counts when the KB links it to the requirement it proves:

1. The proof file is an executable test symbol: `required_proofs` names it
   and it links `executable_for` to the test.
2. The domain symbol links `implements` to the requirement and `covered_by`
   to the test (and to the requirement's end-to-end test).
3. The test `validates` a scenario that the requirement is `specified_by`;
   that scenario's end-to-end test still has to pass.
4. The test has a `proof_contract` with `kind` and `domain_source`, and the
   integration's command runs the proof file.
5. The contract names the requirement claims the certificate proves in
   `proves` (see below).

`kibi proof explain REQ-...` shows each link it found, and
`certificateRejections` says why a certificate did not count.

### Binding a certificate to claims

A requirement's prose is split into claims (its `semantic_inventory`), and
each modeled claim is grounded by one typed fact. A certificate proves claims,
not requirements: the contract names them in `proves`, and Kibi derives from
each claim's fact what the certificate has to establish.

```yaml
proof_contract:
  kind: exhaustive
  domain_source:
    symbol_id: SYM-cli-evidence-levels
  proves:
    - CLAIM-3F2A9C0D11E4B7A8   # "The evidence levels are proved, tested, asserted and unverified"
```

| The claim's fact | Kind | What the certificate must establish |
| --- | --- | --- |
| a set fact (`value_type: set`, `value_set: [...]`) | `exhaustive` | the domain Kibi loads is exactly the fact's set |
| a set fact | `typecheck` | the domain export, as a type, is exactly the fact's set (Kibi compiles a set-equality witness itself) |
| a numeric fact (`value_type: int` or `number`, a comparison) | `arithmetic` | the certificate's claim is the fact's constraint (negated for `polarity: forbid`) |
| a numeric fact | `smt` | the query asserts the negation of the fact's constraint |

A legacy `property_key: allowed_values` fact whose `value_string` joins the
members with `|` reads as a set fact. Each claim gets one binding per test,
recorded in the receipt's `claim_bindings`:

- **derived**: Kibi checked the certificate against the claim's own fact.
  Only a derived binding proves a claim.
- **attested**: the fact has no derivation (a boolean placeholder, a
  predicate, a rule, a free string). The author says the certificate
  expresses the claim; Kibi reports it and counts it as tested, never proved.
- **rejected**: the key is not a modeled claim of a current requirement the
  test reaches through its scenarios, its fact is the wrong shape for the
  kind (a set fact under `arithmetic`), or the certificate does not establish
  the obligation. The reason says which.

Exhaustive and typecheck bindings also need the `domain_source` symbol linked
`covered_by` the test, so a change to the domain stales the proof. An
arithmetic or SMT certificate that reads its assumptions from facts proves
only that the facts entail the claim; its binding has scope `intent` and the
claim stays tested. To prove that the code satisfies the claim, read the
value from the code with `value_source` (instead of or with
`constraint_source`), link those symbols `covered_by` the test, and the
binding has scope `code`:

```yaml
  kind: arithmetic
  value_source:
    - symbol_id: SYM-retry-config
      export: MAX_RETRIES          # a number export; Kibi reads it itself
  proves:
    - CLAIM-0A1B2C3D4E5F6071       # "Clients retry at most 3 times"
```

Kibi judges bindings at ingest and judges them again whenever it reports
evidence: a binding whose fact changed since ingest (another set, another
bound), whose claim is no longer modeled, or whose certificate no longer
re-checks against the obligation is rejected. `kibi prove` prints each
binding as it ingests a receipt.

From schema 12 the blocking `proof-contract-claims` rule reports a
certificate-kind contract without `proves` and a named claim no certificate of
its kind could prove. `kibi migrate` pins `proves` where the test reaches
exactly one claim its kind can derive and lists the other contracts.

### What `proved` covers

A requirement is **proved** when it is tested end to end and every applicable
claim (every normative claim of its inventory; nonlogical context spans are
not claims) has a derived, code-scope binding from a fresh, re-checked
certificate. Coverage reports `claimSummary` per requirement (applicable,
proved, attested, tested and unresolved claims), lists `unprovedClaims`, and
`kibi proof explain` shows each claim with its bindings. A requirement whose
claims are only partly proved is tested, and the table and the HTML report
show `n/m claims proved`. A claim that is not yet modeled keeps the
requirement below proved until it is.

`arithmetic` and `smt` certificates pay off only when the requirement rests on
typed numeric facts (bounds, limits, counts). For an enumerable domain use
`exhaustive` or `typecheck`.

Kibi never takes a certificate's word for it. At ingest it re-checks the
certificate (every member listed once and passed; the arithmetic decided by
the same interval reasoning as contradiction checks; the solver re-run), and
it checks the workspace. For an exhaustive proof Kibi loads the
`domain_source` symbol's export itself (with bun when it is on `PATH`, else
node with type stripping) and needs the certificate to cover exactly its
members (or, for non-primitive members, as many of them), so a hand-listed
subset is rejected; the proof file must also import the symbol. A typecheck
witness must import the domain, be the file in the workspace (its sha256) and
contain a `never` check, and Kibi compiles it itself with the workspace's
TypeScript under fixed strict options, so a test cannot report a pass the
compiler would not give. Arithmetic and SMT certificates must match their
`constraint_source` facts as described above. The receipt
(`kibi.proof-receipt.v2`) records `kind`,
`evidence_level`, the certificate and its digest (the sha256 of its canonical
JSON, computed by `code_certificates.pl`), or `certificate_rejection` with the
reason.

Whenever it reports evidence, Kibi re-checks the stored certificate's digest
and structure (and re-decides an arithmetic claim); the solver and workspace
checks run at ingest only. The digest is an unsigned hash: it catches edited
or corrupted receipts, not deliberate forgery, which review of the receipt
diff is for. A receipt that claimed proved but no longer re-checks counts as
tested, and coverage and `kibi proof explain` name the test and the reason
(`certificateRejections`).

A certificate strengthens end-to-end evidence; it never replaces the
journey test. `required_evidence: proved` makes the evidence-floor rule demand
proved, and its finding lists the claims no certificate derives
(`gapDetails.unprovedClaims`).

A `bun test` proof step that runs a `*.proof.test.*` file is never satisfied by
reused unit results, because reuse would leave no certificate.

## Integration configuration

Evidence production is configured in tracked, Kibi-managed
`.kb/proof/integrations.json`:

```json
{
  "version": "kibi.proof-integration.v1",
  "integrations": [
    {
      "id": "self-proof",
      "producer": "command",
      "command": ["node", "scripts/run-proof-producer.mjs"],
      "artifact": ".kb/proof/runs/self-proof.json",
      "targets": ["default"],
      "description": "Packed end-to-end step commands"
    },
    {
      "id": "web-e2e",
      "producer": "playwright",
      "command": ["npx", "playwright", "test"]
    },
    {
      "id": "api-tests",
      "producer": "junit",
      "command": ["pytest", "--junitxml=.kb/proof/runs/api-junit.xml"],
      "artifact": ".kb/proof/runs/api-junit.xml"
    }
  ]
}
```

- `command` is executed with `shell: false`, exactly as configured.
- The child environment always includes `KIBI_PROOF_RUN=1`. Runner
  configurations that must behave differently under a proof run (for example,
  Playwright `retries: 0`) should branch on this stable marker instead of
  guessing which output-path variable implies a proof run.
- `producer: command` lets Kibi synthesize the envelope from the process
  outcome (aggregate-run provenance). One process runs the steps of every
  selected test, so by default one failing step fails every test in the run.
  To have each test judged by its own steps, the command writes a
  `kibi.proof-test-report.v1` to the path in `KIBI_PROOF_TEST_REPORT` (see
  [per-test attribution](#per-test-attribution-for-command-integrations)).
- `producer: playwright` (or a custom id) expects the child to emit
  `kibi.proof-run.v1` at `KIBI_PROOF_OUTPUT`.
- `producer: junit` / `tap` make Kibi convert the native report at `artifact`
  into bound proof results using each test's `proof_bindings`.
- `description`, labels, and comments are cosmetic: editing them never
  invalidates proof. Execution-relevant edits (command, artifact, targets,
  options, bindings, contract) change the effective execution fingerprint and
  stale prior evidence.

`kibi init` never creates this file, and agents never hand-write it.
`kibi proof inspect --json` proposes a `command` integration for the
detected test runner (the `package.json` `test` script when there is one)
and returns `integrationPlan`, a hash-bound `kibi.migration-plan.v2` with one
`proof_integration_configure` action, plus the `contractDefaults` a
proof-bearing test's `proof_contract` uses. Review it, then apply it through
Kibi:

```bash
kibi proof inspect --json > inspection.json
jq '{plan: .integrationPlan, approvedPlanHash: .integrationPlan.planHash,
     approvedActionIds: [.integrationPlan.actions[].id]}' inspection.json \
  | kibi apply-plan --input -
```

MCP hosts pass the same three fields to `kb_apply_plan`. The plan binds the
hashes of the files the proposal came from (`package.json`, lockfiles,
runner configs) and is refused once one changed. A create plan is refused
once the file exists; `kibi proof inspect --update <id> --json` plans adding
or replacing one named integration and is bound to the file's current hash.
`--command "<command>"` (space-separated words or a JSON argv array)
proposes that command instead of the detected one, on a create or an update
plan. A `command` integration judges each selected test by the exit code of
the whole run, so when it runs the package's whole `test` script, any failing
test anywhere fails every proof obligation that names it and a suite with
unrelated failures proves nothing; `integrationPlanReason` says so. Narrow the
command to the proof-bearing tests (`kibi proof inspect --update <id>
--command "<command>" --json`) or have it write a per-test report (below). Greenfield repositories without a harness record proof integration
as **deferred** — Kibi does not install test frameworks.

## The canonical artifact: `kibi.proof-run.v1`

Most consumers never hand-write artifacts — `kibi prove` and its producers
do. Direct `kb_ingest_proof` calls are an integration path for custom
producers and agents.

```json
{
  "version": "kibi.proof-run.v1",
  "producer": { "name": "kibi-playwright-producer", "version": "1.0.1" },
  "executor": { "name": "playwright", "version": "1.57.0" },
  "integration": "web-e2e",
  "command_argv": ["npx", "playwright", "test", "--project=chromium"],
  "code_snapshot": "<64-hex snapshot captured before the run>",
  "environment": {
    "os": "linux",
    "arch": "x86_64",
    "runtime": { "name": "node", "version": "v24.15.0" },
    "artifacts": { "lockfile_digest": "<…>" }
  },
  "run": {
    "outcome": "passed",
    "exit_code": 0,
    "started_at": "2026-08-30T09:00:00.000Z",
    "finished_at": "2026-08-30T09:02:03.000Z"
  },
  "proof_results": [
    {
      "symbol_id": "SYM-PW-4F2A9C61B7D03E85",
      "target": "chromium",
      "outcome": "passed",
      "binding": "native_case",
      "native_id": "tests/checkout.spec.ts:4:5 › checkout › accepts a card",
      "attempts": {
        "status": "complete",
        "entries": [{ "outcome": "passed", "duration_ms": 2415 }]
      }
    }
  ]
}
```

Field contract:

| Field | Requirement |
| --- | --- |
| `version` | Literal `kibi.proof-run.v1` |
| `producer` | `{name, version?}` — the component that produced the artifact |
| `executor` | Optional `{name, version?}` — the underlying runner |
| `integration` | Configured integration id this run belongs to |
| `command_argv` | Non-empty; must equal the integration's configured command |
| `code_snapshot` | 64-hex; must equal the live snapshot captured before the run |
| `environment` | Typed JSON object; Kibi canonicalizes and hashes it |
| `run` | Run-level outcome, process exit code, ISO timestamps, optional `failure_phase` (`setup`, `collection`, `execution`, `teardown`, `infrastructure`) |
| `proof_results` | 1–1000 results, each shaped as below |

Each proof result:

| Field | Requirement |
| --- | --- |
| `symbol_id` | Non-empty stable proof symbol (`SYM-*`) |
| `target` | Ecosystem-neutral execution target |
| `outcome` | `passed`, `failed`, `timed_out`, `skipped`, `interrupted`, or `errored` |
| `binding` | `native_case` (individually observed) or `aggregate_run` (bound process outcome) |
| `native_id` | Optional native runner identity (provenance only) |
| `attempts` | `{status: "complete", entries: [{outcome, duration_ms?}]}` or `{status: "unavailable"}` |

### Attempt history is factual

Adapters report facts, never improve them. When a source format cannot prove
retry history, report `attempts: {status: "unavailable"}`. The strict
`all_required_first_attempt` policy:

- accepts complete history whose **first attempt** passed,
- rejects any known non-passing first attempt,
- **fails closed** on unavailable native history,
- accepts `aggregate_run` results only through the single Kibi-launched
  process invocation itself (the process attempt), which is known first-attempt
  evidence when the run passed with exit code 0.

### Run-level outcomes are authoritative

`run.outcome` — `passed`, `failed`, `errored`, `cancelled`, `timed_out`,
`interrupted`, `no_results` — is evaluated independently of individual
results. Under `all_required_first_attempt` a failed run never proves
anything, no matter how many results passed before the failure.

### `own_results_first_attempt`: one failing case does not erase a suite

A large end-to-end suite almost always has some failing or flaky case, and
under the strict policy that one case fails every receipt of the run. A
contract can opt into `success_policy: own_results_first_attempt` instead:

- a run whose outcome is `failed` in the `execution` phase (or with no phase)
  is judged per obligation, so an obligation whose own `native_case` result
  passed on its first attempt is proved even though other cases failed;
- the first-attempt rules above still apply to the obligation's own result;
- `aggregate_run` obligations still need the whole run to pass, because they
  have no result of their own;
- `errored`, `cancelled`, `timed_out`, `interrupted` and `no_results` runs,
  and failures in `setup`, `collection`, `teardown` or `infrastructure`, still
  refuse every obligation.

`kibi-cli/playwright-reporter` marks a run that only failed test cases as
`failure_phase: execution`; an error outside the test cases (config, global
setup, a spec that fails to load) is `setup`, a global timeout is `timed_out`
and an interrupted run is `interrupted`. Use the policy where the per-case
results are native, as with the Playwright reporter; keep the strict policy
where a run-level failure should block everything.

## Environments and fingerprints

Producers provide typed environment dimensions (OS, architecture, runtime,
container digest, lockfile digest, database image, device, deployment).
Kibi canonicalizes the object and derives `environment_hash` itself.

Each receipt stores the effective **execution fingerprint** and its
components (contract, integration, command, bindings, producer). Diagnostics
can therefore name exactly which execution semantic drifted, e.g.
`command_argv`.

## Receipt freshness scope

By default a receipt stays fresh until something *it depends on* changes, not
until any file in the workspace changes. Each receipt records a
`binding_hash` over:

- the test's `proof_contract`,
- the test document itself (excluding its `proof_receipts` history and its
  `links`, so adding or reordering a link does not invalidate the receipt;
  receipts written before links were excluded stay current), and
- the **code scope**: the current source-file content of every symbol in
  - the contract's `required_proofs` (the test's own executable code),
  - the test's `proof_bindings`, and
  - every production symbol linked `covered_by` this test.

Editing any of those files (or deleting one) changes the binding, so that
test's receipts go stale until `kibi prove` runs again. Edits elsewhere leave
them fresh. Keep `covered_by` links accurate: they decide which production
code a receipt vouches for. Set `KIBI_PROOF_BINDING_MODE=strict-snapshot` to
instead bind every receipt to the whole-workspace snapshot it was proven on.

Both the binding and the snapshot are computed from repository-relative paths
and file contents only, so a CI runner and a developer checkout of the same
commit agree:

- the workspace snapshot names each file by its repository-relative path in
  Unicode NFC, so a checkout whose filesystem reports decomposed names hashes
  the same as one that reports composed names, wherever the repository lives;
- a test document and each symbol's `sourceFile` are located through their
  normalized repository-relative path (`./a.ts`, `a\b.ts` and an absolute
  path inside the checkout all name the same file);
- a `sourceFile` that leaves the repository (a `..` escape or another
  machine's absolute path) contributes the fixed marker `outside-workspace`
  instead of whatever that path holds on the current machine.

## Receipt history compaction

Every `kibi prove` run appends one receipt per test, so a long-lived branch
would otherwise accumulate receipts that can no longer change any decision.
Ingest compacts each history as it appends
(`kibi.proof-receipt-compaction.v1`), keeping only:

- the newest receipt, and the newest passing receipt;
- for the current binding and for the live snapshot, the newest receipt per
  verification scope and contract hash — exactly the receipts coverage selects
  from.

Compaction is deterministic and only removes receipts: the kept receipts are
the originals, in their original order, so every coverage decision is the
same before and after. Stores written before compaction can be compacted
once with `kibi proof compact` (`--dry-run` reports what would be removed).

## Per-test attribution for command integrations

A `command` integration is one process. When it writes a
`kibi.proof-test-report.v1` to the path Kibi passes in
`KIBI_PROOF_TEST_REPORT`, each selected test is evaluated against its own
steps:

```json
{
  "version": "kibi.proof-test-report.v1",
  "tests": [
    {
      "test_id": "TEST-checkout",
      "outcome": "failed",
      "steps": [
        { "step_index": 1, "command": ["bun", "test", "checkout"], "outcome": "failed", "exit_code": 1 }
      ]
    }
  ]
}
```

Tests whose steps all passed receive passing receipts even when the process
exited non-zero; only tests with a failing step receive failing receipts. The
`kibi prove` summary lists `attribution: "per_test"` and the `failedSteps`
(test, step, command, outcome, exit code) for that integration. Attribution
fails closed: with no report, a report that omits or duplicates a selected
test, a test reported `passed` over a failing step, or a failing process whose
report blames no test, the whole run is evaluated as one unit as before
(`attribution: "aggregate"` with an `attributionReason`). A valid report in
which every test passed is also `per_test`. Kibi's own
`scripts/run-proof-producer.mjs` writes this report.

### `kibi proof run-steps`

Projects do not need their own producer script. Declare each proof-bearing
test's steps (argv arrays, no shell) in `proof/steps.json`:

```json
[
  { "test_id": "TEST-checkout", "steps": [["bun", "test", "./tests/checkout.test.ts"]] },
  { "test_id": "TEST-cart", "steps": [["node", "--test", "tests/cart.test.js"]] }
]
```

and make `kibi proof run-steps` the integration's command:

```json
{ "id": "unit", "producer": "command", "command": ["npx", "kibi", "proof", "run-steps"], "targets": ["default"] }
```

It runs the steps of the tests `kibi prove` selected, each distinct argv once
(in its own process group, with a timeout from `KIBI_PROOF_STEP_TIMEOUT_MS`),
and writes the per-test report, so each test gets its own receipt. Ctrl-C
during `kibi prove` stops the whole process group of the producer, so no test
worker is left running.

## Trust boundary

Local proof evidence is trusted as part of the local execution environment.
An out-of-process adapter can lie just as an in-process reporter can lie.
Kibi's guarantees are about binding, policy, freshness, and history — not
independent attestation. The envelope is designed so CI identities,
signatures, or attestations can be added later.

## Representative recipes

- **Web UI (Playwright, optional native producer):** register
  `kibi-cli/playwright-reporter` in `playwright.config.ts`; add a
  `playwright` integration; the reporter emits `kibi.proof-run.v1` with
  producer name `kibi-playwright-producer`. Obligations map to `SYM-PW-*`
  case symbols. Kibi does not depend on Playwright.
- **API (pytest via JUnit XML):** run `pytest --junitxml=…` with a `junit`
  integration; author `proof_bindings` mapping native test ids to symbols;
  attempt history is `unavailable` (standard JUnit XML has no retry data).
- **JVM/.NET libraries:** Maven/Gradle/dotnet produce JUnit XML; same adapter
  path as pytest.
- **Go/Rust:** `go test -json` or TAP-consuming harnesses via the `tap`
  integration; TAP has no retry history, so attempts are `unavailable`.
- **Database products:** a command integration that starts a cluster,
  migrates, writes, replicates, and reads; obligations bound with
  `aggregate_run` provenance.
- **CLI tools:** a command integration running the installed binary and
  asserting observed behavior.
- **Custom/proprietary runners:** emit `kibi.proof-run.v1` directly and call
  `kb_ingest_proof`, or wrap the run in a command integration.

Examples live in [docs/examples/proof](examples/proof/) and are validated
against the schema in CI.

## Common failures and fixes

| Error | Cause | Fix |
| --- | --- | --- |
| `No proof integration configuration at .kb/proof/integrations.json` | Proof is not configured for this repository yet | Run `kibi proof inspect --json` and apply its `integrationPlan` with `kb_apply_plan` / `kibi apply-plan` |
| `integration '<id>' … is not configured in .kb/proof/integrations.json` | A test names an integration the file lacks | Run `kibi proof inspect --update <id> --json` and apply the plan |
| `artifact command_argv does not match the configured command` | Command drift | Run through `kibi prove` so the configured command executes |
| `captured snapshot is not the live workspace snapshot` | Tracked files changed between capture and ingest | Re-run `kibi prove`; do not edit the tree mid-proof |
| `run did not pass (outcome: …)` | Run-level failure despite passing results | Fix the run (setup/teardown/infrastructure); rerun |
| `attempt history unavailable` | Source format carries no retry data | Accept aggregate provenance, or use a producer with complete history |
| `missing proof result` | Producer never reported a required obligation | Ensure the obligation ran in the configured integration/target |
| `proof_receipts is append-only` | History was rewritten by hand | Update via the engine (`kibi prove`, `kibi proof compact`); never edit history |
| Every test of a `command` integration failed for one step | The command wrote no `kibi.proof-test-report.v1` | Write the report to `KIBI_PROOF_TEST_REPORT`; the summary's `attributionReason` says why it was not used |
| Receipts stale after code changes | The edit touched code in a test's [freshness scope](#receipt-freshness-scope) | Re-run `kibi prove` for the affected tests |

## For agent workflows

Bundled skill guidance is in `kibi-usage` → `resources/proof.md`
(`kb_skills` with `action: "load"` and `id: "kibi-usage"`, then `action: "read"`).
Deterministic discovery: `kibi proof inspect --json`.
