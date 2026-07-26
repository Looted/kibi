# SkillOpt operator guide

SkillOpt is an isolated research tool. It is not a runtime dependency of Kibi,
and the root package scripts only expose the supported command surface.

## Prerequisites

Real SkillOpt operations require the separately signed, operator-owned
`kibi-skillopt-trust-v1` bundle. Repository code only validates its client
contract; it never installs, signs, starts, or substitutes the privileged
ProviderSupervisor, EvaluatorAuthority, or Verifier services. Provision the
bundle noninteractively with exactly:

```bash
sudo /usr/libexec/kibi-skillopt-installer install --bundle <signed-bundle> --version kibi-skillopt-trust-v1
```

The installation must provide root-owned `/etc/kibi-skillopt/publisher.ed25519.pub`,
`/etc/kibi-skillopt/verifier-bundle.lock`, and
`/etc/kibi-skillopt/protocol-v1/*.schema.json`, plus the fixed launcher
`/usr/libexec/kibi-skillopt-verifier-launch`. The socket-activated services use
the distinct identities `kibi-skillopt-provider` (UID 61101),
`kibi-skillopt-evaluator` (UID 61102), and `kibi-skillopt-verifier` (UID 61103),
with durable state below `/var/lib/kibi-skillopt`. If any pinned path, digest,
identity, descriptor, seal, isolation primitive, CA, veth, or nft check differs,
preflight emits `EXTERNAL_PREREQUISITE_MISSING` or a typed no-go receipt before
runtime authorization, materialization, paid access, spawn, or adoption.

| Check | Command | Why |
| --- | --- | --- |
| Lock the isolated Python environment | `uv sync --project tools/skillopt --frozen` | Keeps the pinned SkillOpt toolchain fixed. |
| Verify the committed source lock | `uv run --project tools/skillopt python tools/skillopt/verify_pin.py` | Confirms the checked in commit, version, and receipt still match. |
| Run the isolated Python tests | `uv run --project tools/skillopt python -m unittest discover -s tools/skillopt/tests` | Checks the embedded evaluator without touching the main workspace. |

The repository-side readiness client is deliberately narrower than the
operator-owned launcher. Run it without fixture flags to verify the real
prerequisites:

```bash
bun run scripts/skillopt-eval/runtime/external-trust-client-cli.ts
```

If any service asset is absent, it exits nonzero with
`EXTERNAL_PREREQUISITE_MISSING`, the exact installer command above, and explicit
`processSpawned: false`, `providerContacted: false`, and `ledgerWritten: false`
fields. It does not fall back to an environment credential, `PATH` executable,
pathname socket, direct provider connection, or repository-owned broker.

## Trust-plane and paid-launch boundary

Root Authority authorization covers only the immutable corpus, evaluator,
query-set, baseline, verifier-release, and artifact-schema roots plus the frozen
schema/protocol version. It does not authorize source bytes, candidates,
invocations, matrices, generated snapshots, or generated artifacts.

After that authorization exists, the external ProviderSupervisor separately
binds the clean source root, baseline/one-shot/SkillOpt candidate hashes,
invocation hash, matrix ID, expected artifact-schema digest, exact model/request/
token/retry/time ceilings, integer micro-USD pricing, and total authorization.
Generated evaluator and verifier receipts chain back to this parent; their roots
must not claim equality with a Root Authority immutable root. Root Authority,
ProviderSupervisor, Evaluator, and zero-budget Verifier use distinct role keys.

The launcher must supply an already-connected control socket, authenticated
service pidfd, sealed authorization FD, and sealed snapshot/artifact FD. The
external supervisor—not repository code—authenticates peers, mints sealed
one-request capabilities, reserves integer authorization before forwarding,
reconciles invoices separately, retains debits across crashes, returns cached
idempotent receipts, and charges the conservative maximum when forwarding is
ambiguous. It also owns credentials, the authoritative ledger, DNS resolution,
TLS/provider sockets, and pinned-CA HTTPS enforcement with exact host, port,
SNI, selected pinned IP, and no redirects, proxies, or tunnels.

The isolated target MCP broker exposes only its fixed Kibi allowlist. In
addition to discovery, graph, check, and write operations, that list includes
`kb_semantic_advisor`, `kb_suggest_predicates`, `kb_model_requirement`, and
`kb_validate_upsert`; destructive delete and remote-network tools remain absent.
Provider/model output is untrusted data and cannot alter this list or policy.

## Package scripts

| Script | Command | Notes |
| --- | --- | --- |
| `skillopt:help` | `bun run scripts/skillopt-eval/cli.ts --help` | Prints the supported command set and workflow flags. |
| `skillopt:prototype` | `bun run scripts/skillopt-eval/cli.ts` | Legacy alias that still falls through to help. |
| `skillopt:preflight` | `bun run scripts/skillopt-eval/cli.ts preflight --run-id 00000000-0000-4000-8000-000000000091` | Codex-only evidence gate with no paid model calls. |
| `skillopt:canary` | `bun run scripts/skillopt-eval/cli.ts smoke --run-id 00000000-0000-4000-8000-000000000091` | Bounded two-model Codex capability canary; may incur paid model calls. |
| `skillopt:dry-run` | `bun run scripts/skillopt-eval/cli.ts dry-run --run-id 00000000-0000-4000-8000-000000000092` | Writes the zero-cost dry-run artifact tree. |
| `skillopt:prepare` | `bun run scripts/skillopt-eval/cli.ts prepare --run-id 00000000-0000-4000-8000-000000000092` | Same dry-run shape, with the prepare command name. |
| `skillopt:optimize` | `bun run scripts/skillopt-eval/cli.ts optimize --skill all --allow-paid --run-id <uuid>` | Runs the real Codex optimizer, applies automatic safety/surface gates, and adopts passing candidates; requires explicit paid-run acknowledgment. |
| `skillopt:fake:run` | `bun run scripts/skillopt-eval/cli.ts run --fake --run-id 00000000-0000-4000-8000-000000000093` | Runs the offline workflow without paid calls. |
| `skillopt:fake:resume` | `bun run scripts/skillopt-eval/cli.ts resume --fake --run-id 00000000-0000-4000-8000-000000000093` | Resumes the same offline workflow. |
| `skillopt:fake:status` | `bun run scripts/skillopt-eval/cli.ts run --fake --run-id 00000000-0000-4000-8000-000000000093 && bun run scripts/skillopt-eval/cli.ts status --run-id 00000000-0000-4000-8000-000000000093` | Boots a fake run, then reads back its state. |

## Direct CLI commands

Bun 1.3 requires an explicit `./` prefix when a single test file is passed to
`bun test`; the plan spelling without that prefix is interpreted as a name
filter and reports no matching files. Use the checked-in compatibility runner
for a stable focused invocation:

```bash
bun run scripts/skillopt-eval/test-preflight.ts
bun run scripts/skillopt-eval/test-preflight.ts --test-name-pattern 'preflight (accepts qualified host|rejects every unsupported primitive before spawn)'
```

| Command | Flags | Artifact root | Notes |
| --- | --- | --- | --- |
| `preflight` | `--run-id <uuid>` | `artifacts/skillopt/<run-id>` | Evidence gate for Codex-only setup checks. |
| `smoke` | `--run-id <uuid>` | `artifacts/skillopt/<run-id>` | Capability canary, still zero-cost. |
| `dry-run` | `--run-id <uuid>` | `artifacts/skillopt/<run-id>` | Creates `dry-run.json` and does not call a paid model. |
| `prepare` | `--run-id <uuid>` | `artifacts/skillopt/<run-id>` | Same zero-cost artifact shape as dry-run. |
| `optimize` | `--skill <id\|all>`, `--allow-paid`, `--max-steps 1..4`, `--run-id <uuid>` | `artifacts/skillopt/<run-id>` | Runs Codex-only SkillOpt generation after preflight/smoke, then automatically adopts candidates that pass safety and immutable-surface gates. |
| `evaluate` | `--fake`, `--run-id <uuid>` | `artifacts/skillopt/<run-id>` | Same offline rule as optimize. |
| `bundle` | `--fake`, `--run-id <uuid>` | `artifacts/skillopt/<run-id>` | Same offline rule as optimize. |
| `run` | `--fake`, `--run-id <uuid>` | `artifacts/skillopt/<run-id>` | Fake only until the bounded real smoke gate is enabled. |
| `resume` | `--fake`, `--run-id <uuid>` | `artifacts/skillopt/<run-id>` | Continues the same fake run root. |
| `status` | `--run-id <uuid>` | `artifacts/skillopt/<run-id>` | Reads the current state and does not mutate artifacts. |

The public script surface stops here. The separate report, approve, and adopt
helpers remain available for offline review artifacts and higher-assurance
behavioral evaluation.

## Artifact layout

| Path | Produced by | Meaning |
| --- | --- | --- |
| `artifacts/skillopt/<run-id>/dry-run.json` | `dry-run`, `prepare` | Zero-cost command receipt. |
| `artifacts/skillopt/<run-id>/run.lock` | `run`, `resume` | Run lock for the offline workflow. |
| `artifacts/skillopt/<run-id>/state.json` | `run`, `resume` | Current run state, which `status` reads back. |
| `artifacts/skillopt/<run-id>/ledger.jsonl` | `run`, `resume` | Append only cost ledger with price-equivalent entries. |
| `artifacts/skillopt/<run-id>/skills/` | `optimize` | Snapshot of canonical and candidate skill bodies. |
| `artifacts/skillopt/<run-id>/steps/` | `optimize` | Per-step candidate and development receipts. |
| `artifacts/skillopt/<run-id>/best_skill.md` | `optimize` | The current best candidate body. |
| `artifacts/skillopt/<run-id>/runtime_state.json` | `optimize` | Runtime state summary for the optimizer. |
| `artifacts/skillopt/<run-id>/history.json` | `optimize` | Step history for the optimizer. |
| `artifacts/skillopt/<run-id>/optimization-review.json` | `optimize` | Candidate hashes, automatic safety-gate results, and adoption receipts. |

## Automatic adoption gate

The real `optimize` command automatically adopts a generated candidate only after
the candidate body passes safety validation and its frontmatter/resources hashes
match the canonical surface. Adoption uses the transactional canonical-and-mirror
write path with rollback on mirror-sync failure. The command writes
`optimization-review.json` with the candidate hash, safety result, and adoption
receipt. It does not commit or push the resulting source change.
The receipt distinguishes `auto-adopted`, `unchanged`, and `blocked` outcomes so
the review artifact records whether a generated candidate changed the canonical
surface.

The separate report/proposal/approval workflow remains available for offline
artifacts and higher-assurance behavioral evaluation. Automatic safety adoption
must not be described as a behavioral evaluation pass.

## Price-equivalent semantics

`priceEquivalentEstimate.amount` is a USD price-equivalent, not an invoice.
Ledger entries use the `price-equivalent-estimate-not-invoice` kind so cost
tracking stays explicit and capped per request.

## Codex-only evidence

Preflight is a zero-cost setup gate. Smoke is a bounded two-model Codex evidence gate and may incur paid model calls. The run lock pins the host
shape to Codex, uses the existing login mode, and keeps the evaluator on curated
synthetic fixtures instead of raw provider output.

## Real optimization command

After the source branch is committed and clean, run:

```bash
bun run skillopt:verify-pin
bun run skillopt:preflight
bun run skillopt:canary
bun run skillopt:optimize --skill all --allow-paid --max-steps 1 --run-id <uuid>
```

Use a single canonical skill instead of `all` to bound the first run, for example
`--skill kibi-usage`. `--allow-paid` is mandatory and the command uses the
existing Codex login only. The command automatically adopts candidates that pass
the safety and immutable-surface gates; it does not commit, push, or publish.

## Recovery

If a fake run gets stuck or the state looks stale, delete the matching
`artifacts/skillopt/<run-id>` directory and rerun the same fake command with a
fresh run id. If the source lock changes, rerun `skillopt:verify-pin` before
starting another gate. If the run lock hashes do not match, start a new run id
instead of reusing the old root.
