# Proving Requirements

This guide explains how a requirement goes from "implemented" to "proven":
fresh evidence from any proof producer, bound to the current code snapshot,
evaluated against explicit proof obligations, and recorded in append-only
proof history.

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

A requirement counts as **proven** only when every required proof obligation
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
| 1 | Native producer | Complete attempt history, native IDs, per-target results | Playwright with `kibi-cli/playwright-producer` |
| 2 | Standard-format adapter | Native-case outcomes; retry history per source format | pytest/JUnit XML, Go/TAP |
| 3 | Command proof | Aggregate process outcome bound to contracted obligations | `cargo test`, custom scripts |

Level 3 is the universal fallback: **if the project can run a command and
observe its exit code, the project can prove requirements with Kibi.**

## The canonical command: `kibi prove`

```bash
kibi prove --all            # prove every proof-bearing test
kibi prove --test TEST-004  # one test
kibi prove --requirement REQ-cli-check
kibi prove --integration self-proof
```

For each configured integration, `kibi prove`:

1. captures the workspace snapshot,
2. runs the integration's producer **once**,
3. revalidates the snapshot (proof execution must not change tracked state),
4. validates the complete `kibi.proof-run.v1` artifact,
5. evaluates it independently against every selected test's proof contract,
6. derives idempotent `kibi.proof-receipt.v1` receipts and appends them,
7. reports gaps with expected versus received values.

One suite run can satisfy many TEST contracts; unrelated results are ignored
per contract.

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
- `producer: command` lets Kibi synthesize the envelope from the process
  outcome (aggregate-run provenance).
- `producer: playwright` (or a custom id) expects the child to emit
  `kibi.proof-run.v1` at `KIBI_PROOF_OUTPUT`.
- `producer: junit` / `tap` make Kibi convert the native report at `artifact`
  into bound proof results using each test's `proof_bindings`.
- `description`, labels, and comments are cosmetic: editing them never
  invalidates proof. Execution-relevant edits (command, artifact, targets,
  options, bindings, contract) change the effective execution fingerprint and
  stale prior evidence.

`kibi init` never creates this file. Bootstrap authors it after repository
inspection and a reviewed plan. Greenfield repositories without a harness
record proof integration as **deferred** — Kibi does not install test
frameworks.

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
results. A failed run never proves anything, no matter how many results
passed before the failure.

## Environments and fingerprints

Producers provide typed environment dimensions (OS, architecture, runtime,
container digest, lockfile digest, database image, device, deployment).
Kibi canonicalizes the object and derives `environment_hash` itself.

Each receipt stores the effective **execution fingerprint** and its
components (contract, integration, command, bindings, producer). Diagnostics
can therefore name exactly which execution semantic drifted, e.g.
`command_argv`.

## Trust boundary

Local proof evidence is trusted as part of the local execution environment.
An out-of-process adapter can lie just as an in-process reporter can lie.
Kibi's guarantees are about binding, policy, freshness, and history — not
independent attestation. The envelope is designed so CI identities,
signatures, or attestations can be added later.

## Representative recipes

- **Web UI (Playwright, native producer):** register
  `kibi-cli/playwright-producer` in `playwright.config.ts`; add a
  `playwright` integration; obligations map to `SYM-PW-*` case symbols.
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
| `No proof integration configuration at .kb/proof/integrations.json` | Bootstrap has not configured proof | Run bootstrap; or author integrations with a reviewed plan |
| `artifact command_argv does not match the configured command` | Command drift | Run through `kibi prove` so the configured command executes |
| `captured snapshot is not the live workspace snapshot` | Tracked files changed between capture and ingest | Re-run `kibi prove`; do not edit the tree mid-proof |
| `run did not pass (outcome: …)` | Run-level failure despite passing results | Fix the run (setup/teardown/infrastructure); rerun |
| `attempt history unavailable` | Source format carries no retry data | Accept aggregate provenance, or use a producer with complete history |
| `missing proof result` | Producer never reported a required obligation | Ensure the obligation ran in the configured integration/target |
| `proof_receipts is append-only` | History was rewritten by hand | Update via the engine, which appends; never edit history |
| Receipts stale after code changes | Receipts bind to the snapshot at run time | Re-run `kibi prove` after the tree changes |

## For agent workflows

Bundled skill guidance is in `kibi-usage` → `resources/proof.md`
(`kb_skills_load` with `id: "kibi-usage"`, then `kb_skills_read`).
Deterministic discovery: `kibi proof inspect --json`.
