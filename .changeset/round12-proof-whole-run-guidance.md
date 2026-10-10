---
"kibi-cli": minor
"kibi-runtime": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Agents setting up proof now learn up front that a `command` integration is judged as one run: when `kibi proof inspect` proposes the package's whole `test` script, `integrationPlanReason` (also printed in the human output now) says that any failing test in the run fails every proof obligation that names the integration, and how to narrow it. The new `kibi proof inspect --command "<command>"` option proposes that command instead of the detected one, so `kibi proof inspect --update <id> --command "…" --json` can narrow an existing integration to the proof-bearing tests. The kibi-usage proof resource also states that every `required_proofs[].symbol_id` must name an existing symbol entity (create it first) and that `proof_bindings[].source_file` must match that symbol's `sourceFile`.

Technical summary: `proposeProofIntegration` and `buildProofIntegrationPlan` accept an explicit argv (`--command`, parsed as space-separated words or a JSON array of strings) ahead of the `package.json` test script and the detected runner; a plan built from the package test script appends the whole-run note to its reason. kibi-usage 2.13.0 `resources/proof.md`, `docs/cli-reference.md` and `docs/proving-requirements.md` document the option and the whole-run semantics (the latter no longer suggests an update plan can switch to a native producer).
