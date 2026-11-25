---
"kibi-cli": minor
"kibi-mcp": minor
"kibi-agent-core": minor
"kibi-core": patch
"kibi-runtime": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-antigravity": patch
"kibi-vibe": patch
"kibi-zcode": patch
---

Kibi levels: a project chooses how hard Kibi holds the agent to its requirements.

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
