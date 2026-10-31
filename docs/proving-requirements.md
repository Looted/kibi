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
| `rule` | Kibi calls the code's predicate functions on every combination of the finite domains the code exports and model checks a rule, predicate or every-member claim | proved |
| `state_machine` | Kibi reads the code's transition table or next-state function and checks the transitions, initial, terminal or reachable states a claim names | proved |
| `regex` | Kibi decides whether the code's pattern (or string constant) accepts exactly the strings a string fact describes | proved |
| `source` | Kibi reads a project source itself (a JSON or YAML file, a glob, an OpenAPI document, the references the code makes, a data schema, a route table, a validator) and decides a set, field or middleware claim against it | proved |

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

When the export is a list of records, such as an operation catalog,
`domain_source.field` names the field of each record that is the domain
member, and the certificate's members are that field's values
(`key: (operation) => operation.name` in `exhaustiveCertificate`). A record
without the field fails the read. `field` applies only to `exhaustive`.

```yaml
  domain_source:
    symbol_id: SYM-operation-catalog
    field: name
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
- **SWI-Prolog**: a `.pl` or `.plt` domain is loaded with the same
  SWI-Prolog Kibi runs on (`KIBI_SWIPL`, then the bundled runtime, then
  `swipl` on `PATH`). A module file loads as its module and a plain file into
  `user`. `export` names a predicate indicator (`status/1`, `phrase//1` or
  `operators:operator/2`), and the domain is the distinct solutions of its
  argument. For a predicate with more than one argument, `arg` names the
  1-based argument that holds the members (`arg` and `field` are not both
  allowed). Kibi refuses a read whose solutions leave that argument unbound,
  a predicate with more than 100,000 solutions, and a predicate with several
  arguments and no `arg`. Members are atoms and strings as text, numbers as
  written. The proof file must name the predicate and load its file
  (`:- use_module('../prolog/operators')`, `library(operators)` for a pack's
  `prolog/` directory, `consult/1` or a `:- [...]` list), or be the `.plt`
  file beside it. A value_source reads a predicate with one solution that is
  a number, and the rule, state_machine and regex kinds below read Prolog
  predicates too.

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

A SWI-Prolog test writes its certificate with the `kibi_certificate` module
the kibi-usage skill ships in `resources/prolog-proofs.md` (copy it into the
project's test directory). It reads the domain with `findall/3` over the
predicate, never a hand-written list:

```prolog
:- use_module('../prolog/operators').
:- use_module(kibi_certificate).
:- initialization(main, main).

operator_name(Name) :- operator(Name, _).

main :-
    findall(Name, operator_name(Name), All), list_to_set(All, Names),
    kibi_exhaustive_certificate('TEST-operators', 'SYM-operator', Names,
                                [N]>>atom(N), Certificate),
    kibi_write_certificate(Certificate).
```

```yaml
  domain_source:
    symbol_id: SYM-operator
    export: operator/2
    arg: 1
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
| a set fact with `property_key: required_fields` | `typecheck` | every member is a required, non-nullable field of the domain type (Kibi compiles that witness itself) |
| a set fact whose `property_key` names a predicate (`eq` or `includes`) | `rule` | the code decides the predicate true for every member |
| a rule fact (`kibi.logic.v1`, from `kibi model-requirement` with `logic`) | `rule`, `state_machine` | the rule holds for every assignment of its variables over the domains the code exports |
| a predicate fact (a ground atom, or a decision predicate such as `permission_rule`) | `rule`, `state_machine` | the code decides the atom as the fact says (for a decision predicate: the key arguments are allowed exactly when the effective decision is allow) |
| a set fact with `property_key` `transitions`, `states`, `initial_states`, `terminal_states` or `reachable_states` | `state_machine` | that projection of the machine is exactly the set (`transitions` members are spelled `from->to`) |
| a string fact (`eq`, `neq` or `matches`) | `regex` | the code's string meets the constraint, or the code's pattern accepts exactly the fact's string (`eq`), rejects it (`neq`) or accepts exactly the strings the fact's pattern matches (`matches`); `polarity: forbid` negates it, and a forbidden match means no string matches both |

A legacy `property_key: allowed_values` fact whose `value_string` joins the
members with `|` reads as a set fact. Each claim gets one binding per test,
recorded in the receipt's `claim_bindings`:

- **derived**: Kibi checked the certificate against the claim's own fact.
  Only a derived binding proves a claim.
- **attested**: the fact has no derivation for the kind (a boolean
  placeholder, a rule fact under `exhaustive`). The author says the
  certificate expresses the claim; Kibi reports it and counts it as tested,
  never proved.
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

A count claim over a collection reads the collection itself: with
`measure: count`, Kibi evaluates a list, set, map or object export and uses
its size, so "exactly 32 tools" needs no separate number kept beside the list
for the proof:

```yaml
  kind: arithmetic
  value_source:
    - symbol_id: SYM-tool-names
      export: TOOL_NAMES
      measure: count               # the number of members of TOOL_NAMES
  proves:
    - CLAIM-5D6E7F8091A2B3C4       # "There are exactly 32 tools"
```

A claim that every member of a closed set has a property ("Every currency in
GBP, ILS and ZAR must fail closed") is modeled as a set fact named for the
property: the semantic advisor proposes `property_key: fail_closed`,
`operator: includes` and `value_set: [GBP, ILS, ZAR]`, so the property stays in
the requirement instead of living only in the test. `includes` says every
listed member has the property and leaves the others open, so "every role in
owner and admin can invite" and "every role in owner, admin and member can
invite" are both valid facts; the code decides which holds. `eq` on a set
means exactly those members, and an `includes` fact contradicts an `eq` fact
on the same property only when it names a member the `eq` set leaves out.
A `rule` certificate derives an `includes` fact by checking the property on
each listed member, and a `typecheck` certificate derives one on
`required_fields`; the kinds that compare the whole set (`exhaustive`, a
set-equality `typecheck`, `state_machine`) reject an `includes` fact, because
they would read "at least these" as "exactly these".

Kibi judges bindings at ingest and judges them again whenever it reports
evidence: a binding whose fact changed since ingest (another set, another
bound), whose claim is no longer modeled, or whose certificate no longer
re-checks against the obligation is rejected. `kibi prove` prints each
binding as it ingests a receipt.

From schema 12 the blocking `proof-contract-claims` rule reports a
certificate-kind contract without `proves` and a named claim no certificate of
its kind could prove. `kibi migrate` pins `proves` where the test reaches
exactly one claim its kind can derive. For every other contract its review
lists each modeled claim the test reaches through its scenarios with the
binding a certificate of its kind would get (provable, attested only, or the
reason its kind cannot express the fact), so the person binding it knows which
keys to name and which facts to remodel.

### Rules, state machines and patterns

These kinds prove claims that are not numbers. In each one Kibi reads the
model from the code itself at ingest, with the same runners as an exhaustive
domain (TypeScript, JavaScript, Python or SWI-Prolog), needs the certificate to be that
model, and decides the claim exactly: nothing is sampled. Every symbol a
contract names must link `covered_by` the test.

A **rule** contract names the function behind each predicate the claims use
in `predicate_source`, and the export listing each argument type's values in
`domains`. Each function takes the predicate's arguments in order and returns
a boolean; Kibi calls it on every combination of its argument domains (up to
100,000 rows) and records the table. A rule holds when, for every assignment
of its variables, its head has the value the modality requires (true for
`assert`, `oblige` and `permit`, false for `deny` and `forbid`) wherever its
body holds and no exception applies. A domain's type name is also a
predicate of one argument that holds for its members (`role(R)`), so every
variable can be ranged over a domain. A failure names the assignment:

```yaml
  kind: rule
  predicate_source:
    can_share:
      symbol_id: SYM-can-share          # canShare(status, role) -> boolean
    archived:
      symbol_id: SYM-is-archived
      export: isArchived                # when the export is not the symbol's title
  domains:
    document_status:
      symbol_id: SYM-document-statuses  # ["draft", "active", "archived"]
    role:
      symbol_id: SYM-roles
  proves:
    - CLAIM-15C388CF1E89C595            # "Archived documents must never be shared"
```

```
rejected: the rule fails for V1=archived, V2=owner: the code decides can_share(archived, owner) is true, but the rule requires false
```

Rules with existential quantifiers, counts, temporal expressions or
durations are refused with the reason.

A **state_machine** contract names the transition table in `domain_source`:
an object or `Map` from each state to its next states (a list, a set, one
state, or an event map), or a list of `[from, to]` pairs. A next-state
function `next(state, event)` works too, with `domains: {state, event}` naming
the exports it is called on (a throw or `null` means no transition).
`initial_source` names the initial state, which reachable states need. A
statement such as "Invoice status transitions must be one of draft -> sent,
sent -> paid" is modeled as a `transitions` set fact; terminal, initial and
reachable states the same way. A rule over a machine can use `transition`,
`reachable` (one or more steps), `initial`, `terminal` and `state`.

A **regex** contract names the pattern in `pattern_source`: a `RegExp` or a
Python `re.compile(...)` (its flags included), or a string constant. A
dotted `export` (`BRAND.name`) reads one field of an object, dict or class
export, and the proof file counts as importing it when it imports `BRAND`. "Invoice
numbers must match `INV-[0-9]{6}`" is modeled as a string fact with
`operator: matches`, whose value is a JavaScript pattern (with the `u` flag)
that must match the whole string. Kibi compares the two languages exactly
(over well-formed UTF-16 strings, with each engine's own rules for `$`, `.`,
`\d` and case folding) and, when they differ, reports the shortest string
only one of them accepts:

```
rejected: the code's pattern /INV-\d{6}/ does not accept exactly the strings matching /INV-[0-9]{6}/: "0INV-000000" is in the code's pattern only
```

Only the regular subset is decided: backreferences, lookaround, `\b`,
Unicode property escapes, the `g`, `y`, `m` and `v` flags (Python
`MULTILINE`, `VERBOSE` and `LOCALE`), Python `\d` and `\w` without
`re.ASCII`, and non-ASCII letters under case-insensitive matching are refused
with the reason. The certificate builders are `ruleCertificate`,
`stateMachineCertificate` and `regexCertificate` in
`kibi-cli/proof-certificates`; `failedCalls` lists predicate calls that
threw.

In SWI-Prolog each symbol names a predicate indicator. A rule predicate is
called once per row with one argument per argument type and its success or
failure is the row's value; an arity that differs from the argument types is
refused. A transition table is a predicate of arity 2 (`From, To`) or 3
(`From, Event, To`) whose solutions are the edges; a next-state predicate
`next(State, Event, Next)` is driven over its `domains` instead. A pattern is
a predicate with one solution that is an atom or string, read like a string
constant. The `kibi_certificate` module has
`kibi_rule_certificate/4`, `kibi_machine_certificate/5` and
`kibi_pattern_certificate/4` for these kinds. One certificate reads one
language: a contract that mixes a Prolog domain with a TypeScript predicate
is refused.

### Project sources: routes, schemas, configuration and references

Many claims in a real product are about sets the project already declares:
every route under `/api` runs the auth middleware, every table has
`created_at`, the app reads only the environment variables in the deploy
docs, a module never imports `node:fs`, every validator field the API
accepts is a column of the table. A **source** proof reads that set from the
project itself and decides the claim; the test does not have to compute or
list anything. The contract names the source:

```yaml
  kind: source
  source:
    reader: routes
    file: src/app.ts
    export: app            # a Hono or Express app, or a function returning one
    path_prefix: /api
    names_from: [src/middleware.ts]   # name middleware by the export they are (or that makes them)
  proves:
    - CLAIM-...            # "Every route under /api must use requireAuth"
```

| Reader | Reads | `select` |
| --- | --- | --- |
| `json`, `yaml` | `file` at `path` (dotted, or a JSON pointer) | `keys`, `values`, `items` |
| `glob` | the files `pattern` matches (`capture: true` reads what each `*` and `**` matched, joined with `/`: `i18n/**/*.json` reads `finance/de` from `i18n/finance/de.json`) | |
| `openapi` | `file`'s operations (`GET /invoices`) | `operations`, `unsecured_operations`, `security_schemes`, `responses` |
| `references` | the code in `files` (TypeScript, JavaScript, Python, SWI-Prolog; Go, Java, C# and Rust through `kibi-plugin-treesitter`): `extract` `env`, `imports`, `calls`, `string_args` (with `callee`), `thrown` (the class of `throw new X()`, or the factory of `throw createX()`) or `property` (with `key`; not in Prolog) | |
| `schema` | `format: drizzle` or `prisma` (`file`), or `sql` migrations replayed in order (`files`); `table` filters by name or glob | `tables`, `columns`, `required_columns`, `nullable_columns`, `foreign_keys` |
| `routes` | a Hono or Express app's route table, with the middleware that runs before each route (mounted routers included); `path_prefix` keeps the routes under a prefix | `routes`, `middleware` |
| `validator` | a zod or valibot object (or one wrapped in refine, transform or pipe; any field that is a Standard Schema), or a pydantic model | `fields`, `required_fields`, `optional_fields` |
| `prolog` | `file`'s facts with `functor` (`requires/1` in `pack.pl`): argument `arg` (or the only one) of each, a list contributing its items, in file order | |

Details that decide what a reader sees:

- **Environment variables.** `extract: env` reads `process.env`,
  `import.meta.env` (without Vite's built-ins `MODE`, `BASE_URL`, `PROD`,
  `DEV`, `SSR`), `Bun.env` and `Deno.env.get` in TypeScript and JavaScript,
  and `os.environ` and `os.getenv` in Python, through casts
  (`(import.meta as X).env`), `!` and parentheses. An environment object, or
  `import.meta` itself, handed to a variable or a function fails the read,
  because its later reads could use any name. A framework's own runtime
  object (`globalThis._NGX_ENV_`) is not an environment object Kibi reads.
- **SQL migrations.** The replay reads `CREATE TABLE` (quoted and
  schema-qualified names such as `"public"."messages"` included), `DROP TABLE`
  and the `ALTER TABLE` actions that change columns, nullability or foreign
  keys, one or several per statement. Actions that change none of them (row
  level security, triggers, ownership, defaults, column types, statistics,
  replica identity, other constraints) are skipped. Function bodies in
  `$$ ... $$` stay whole. Dropping a foreign key by a name the replay never
  saw fails the read, unless the statement says `IF EXISTS`. A set of files
  with no `CREATE TABLE` fails the read, as does a glob that matches no file,
  so a mistyped pattern never proves a negative.
- **Middleware names.** `names_from` modules name middleware by the export it
  is, or by the export that makes it: a zero-argument factory such as
  `requireAuthentication()` that returns a fresh function per route is
  called once at read time and its result is recognised by its source text,
  so routes guarded by `requireAuthentication()` list `requireAuthentication`.
  Async functions, generators and classes are never called. Without
  `names_from` a middleware is its function's name, or `(anonymous)`.
- **SWI-Prolog.** The references reader and the `prolog` reader read a
  `.pl` or `.plt` file term by term with SWI-Prolog and run none of it: no
  directive, `initialization/1` or clause of the project executes. The file's
  own `op/3` directives, its module export list, the export lists of project
  modules it loads and the SWI-Prolog libraries it loads give the operators
  it is read with. `imports` lists each loaded file as written
  (`library(lists)`, `helpers`, `foreign(fastmath)`) from `use_module`,
  `ensure_loaded`, `consult`, `reexport`, `load_files`, `include`,
  `use_foreign_library` and `:- [...]`, in directives and in clause bodies.
  `calls` lists `Name/Arity` (`Module:Name/Arity` when qualified) of every
  goal in clause bodies and directives, walking control constructs, grammar
  rules (a non-terminal `n//0` is the call `n/2`), lambdas and the arguments
  of meta-predicates (the file's own `meta_predicate` declarations and
  SWI-Prolog's). `env` reads `getenv/2`; `string_args` the first argument of
  calls to `callee` (`format` or `format/2`); `thrown` the error of
  `throw(error(type_error(...), _))` (`type_error`), the functor of any other
  thrown term, and the `library(error)` helpers such as `domain_error/2`,
  while a rethrow of the ball `catch/3` caught is not a new error. A
  variable called as a goal or closure (`call(Goal)`, `maplist(G, L)`), a
  goal qualified by a variable module, a clause asserted from a variable and
  conditional compilation (`:- if(...)`) fail the read with their place.
- **Go, Java, C# and Rust.** The references reader hands these files to
  `kibi-plugin-treesitter`, which parses them in its bounded workers and
  compiles or runs nothing. Activate it for proofs in `package.json`:
  `{"package": "kibi-plugin-treesitter", "capabilities":
  {"kibi.reference-extractor.v1": {"mode": "augment"},
  "kibi.symbol-extractor.v2": {"mode": "augment"}}}`, with the package in
  `devDependencies`. A project without a `package.json` creates one that only
  holds this list. Proofs use the plugin only when its installed files match
  the release-qualified closure Kibi ships, so a modified or unqualified
  provider is never imported. Without it the read is refused with what to
  install, and `kibi init`, `kibi doctor` and `kb_plan_bootstrap` suggest it
  when such sources are tracked. Members are written as the code names them:
  `imports` lists Go import paths, Java imports (`java.util.*` for a
  wildcard), C# `using` targets and Rust `use` paths expanded from their
  groups (`std::io`, `std::io::Write`) plus `extern crate` names. `calls`
  lists `os.Getenv`, `System.out.println` (Java method references such as
  `System.out::println` too), `Console.WriteLine` and `std::env::var`; a
  method called on an expression Kibi cannot name, such as the result of
  another call, is `*.name` (`*.toList`). `env` reads `os.Getenv` and
  `os.LookupEnv`, `System.getenv("X")`,
  `Environment.GetEnvironmentVariable("X")`, and Rust's `env::var`,
  `env::var_os`, `env!` and `option_env!`. `string_args` reads the first
  argument of calls to `callee`. `thrown` lists the type of Go
  `panic(&ConfigError{})` (or the factory of `panic(errors.New(...))`) and of
  Java and C# `throw new X()`; a rethrow of the caught exception is not a new
  error. `property` reads keyed Go composite literals and C# object
  initializers (`new Options { Mode = "strict" }`); Java and Rust have none.
  A name computed at run time (`os.Getenv(name)`), the whole environment
  (`os.Environ()`, `System.getenv()`), reflection (Go `reflect` calls such as
  `MethodByName`, Java `Class.forName` and `Method.invoke`, C#
  `Type.GetType` and `Activator.CreateInstance`), a C# `dynamic` variable or
  `#if` block, a Rust `#[cfg(...)]` item other than `#[cfg(test)]` (whose
  items are skipped) and, for Rust `calls` and `thrown`, any macro
  invocation (`println!` included) fail the read with their place. A file
  that does not parse is refused with its line.
- **Importing the app.** The `routes`, `validator` and drizzle readers import
  the module, so it must load without side effects (no `listen`, no database
  connection at import). Export a factory or a wrapper when the app needs
  dependencies.

Every reader is exact or refuses: a member Kibi cannot read statically
(`process.env[name]`, a dynamic `import()`, an `ALTER TABLE` form it does not
know, a router mounted on a pattern) fails the read and names the file and
line, so a set claim is never decided over a set Kibi only partly saw.

The test leaves no certificate (or `sourceCertificate({testId})` from
`kibi-cli/proof-certificates`): Kibi reads the source at ingest and stores
its own read as the certificate. What the set fact means depends on its
property and operator:

| Fact | The source must |
| --- | --- |
| operator `eq`, `includes`, `subset_of` or `excludes` | have exactly, at least, only, or none of the members |
| property `required_fields` | have each member as a required, non-null field of every selected table or object; a bare name (`id`) applies to every table, including tables added later, while `table.field` names one table. Only `eq` and `includes` |
| property `nullable_fields` | have each member nullable. Only `eq` and `includes` |
| property `middleware` | run the members (by the operator) before every selected route |

The receipt's binding covers what the read depends on: each file it parses,
the list of files a glob matches, and the modules a drizzle schema, route
table or validator imports (through relative imports, tsconfig `paths`
including those inherited through `extends`, and workspace packages linked
into `node_modules`). Change any of them and the receipt is stale. A claim a
source proof derives is bound with scope `source`, so coverage and signoff
show that the proof rests on project files Kibi read.

The certificate builders (`sourceCertificate`, `readProjectSource`) are in
`kibi-cli/proof-certificates` from kibi-cli 2.33.0; a project that pins an
older kibi-cli has to upgrade before its tests can import them.

Sources also feed the other kinds. An arithmetic or smt `value_source` entry
`{source: {...}, measure: count}` counts the members ("at most 40 routes"),
and a rule domain `{source: {...}}` ranges a predicate over the members
("every route Kibi reads is guarded"); `readProjectSource` in
`kibi-cli/proof-certificates` gives the test the same members. A rule
predicate whose function is a test harness that drives the code (it calls
the handler for each role) says so with `harness_for: [SYM-...]`; its
claims are bound with scope `harness`.

The semantic advisor models these statements for you: "Every route under
/api must use requireAuth" (middleware, includes), "Every table must have id
and created_at" or "Every table in schema.ts must have a required org_id
column" (required_fields), "The deleted_at column of organizations must be
nullable" (nullable_fields), "Every environment variable the app reads must
be one of A, B or C" (subset_of), "The web app must never import node:fs" or
"... @supabase/supabase-js" (imports, excludes), "The top-level keys of
scenarios.json must be exactly groups and scenarios" (eq), and "The server
must expose at least 30 routes under /api/orgs" (count). A field claim needs
a schema word (table, object, schema, row, record, model, entity, type,
payload, DTO, or field, column or property next to the names): "Every
organization must have an owner" is about membership and stays a behavioural
claim. `kb_model` in requirement mode writes the same set facts when you pass
`operator` (`eq`, `includes`, `subset_of`, `excludes`) and a list `value`.

### Temporal claims on state machines

A state_machine set fact can name `reachable_pairs` (`from->to` pairs joined
by a path of one or more transitions) and `required_waypoints`
(`from->to via state`: the target is reachable and every path to it passes
through the state), and any machine projection can use `includes`,
`subset_of` or `excludes`. "A cancelled invoice can never become paid" is a
`reachable_pairs` fact with `excludes` (and "A member can never become
owner", with no machine named, one on subject `workflow`); "Every path from draft to paid must
pass through approved" is a `required_waypoints` fact. A failure names the
path or the state:

```
rejected: a path from draft reaches paid without passing through approved
```

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
`exhaustive` or `typecheck`; for decisions, lifecycles and formats use
`rule`, `state_machine` or `regex`; for routes, schemas, configuration and
the references the code makes use `source`.

Kibi never takes a certificate's word for it. At ingest it re-checks the
certificate (every member listed once and passed; the arithmetic decided by
the same interval reasoning as contradiction checks; the solver re-run), and
it checks the workspace. For an exhaustive proof Kibi loads the
`domain_source` symbol's export itself (with bun when it is on `PATH`, else
node with type stripping) and needs the certificate to cover exactly its
members (or, for non-primitive members, as many of them), so a hand-listed
subset is rejected; the proof file must also import the symbol. A typecheck
witness must import the domain and be the file in the workspace (its sha256),
and Kibi compiles it itself with the workspace's TypeScript under fixed strict
options, so a test cannot report a pass the compiler would not give. Imports
resolve the way the nearest `tsconfig.json` says (`module`,
`moduleResolution`, `paths`, ...), and the declaration files that tsconfig
includes (a `reset.d.ts`, for example) are part of the witness program;
without one, NodeNext. When the test's own compile failed, the rejection adds
the first error Kibi's compile of the witness reports, or that Kibi's compile
accepts it. TypeScript 7 ships
without the compiler API, so Kibi falls back to an older `typescript` further
up the workspace and otherwise asks for `typescript@6` as a dev dependency. A
contract without `proves` rests on the witness alone, so the witness must also
contain an exhaustiveness check, a `never` type or a `satisfies` map, read
from its syntax (the word in a comment does not count). With `proves`, Kibi
checks each claim with a witness it writes itself, and a rejection names the
fields that are missing, optional or nullable. Arithmetic and SMT certificates must match their
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
