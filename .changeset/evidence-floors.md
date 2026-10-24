---
"kibi-core": minor
"kibi-cli": minor
"kibi-runtime": minor
"kibi-mcp": minor
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Requirements now state the evidence they need, and `kibi check` fails any current requirement whose evidence is below it.

A requirement can set `required_evidence` to `proved`, `tested`, `asserted` or `unverified`. Without it, a firm requirement needs `tested` evidence and any other requirement needs none. The new canonical `evidence-floor` rule of `kibi check` and `kb_check` reports every current requirement whose evidence level is below its floor, with the level, the floor, where the floor comes from and the proof gaps to fix. Requirements whose only gaps are receipts older than the code count as pending re-proof and pass; `kibi check --fresh-evidence`, meant for CI right after `kibi prove --all`, fails them and also needs a clean proof snapshot.

The floor replaces snapshot files of every requirement's proof gaps: a pull request that adds a requirement no longer edits a shared baseline, and the floor sits in the requirement a reviewer reads. `kibi proof impact`, which compared coverage with such a baseline, is removed; use `kibi check --rules evidence-floor` and `kibi proof explain <id>`.

**Migration:** the knowledge-base schema moves to version 11. `kibi migrate` writes `required_evidence: asserted` on every current firm requirement that has no scenario verified by an end-to-end test with a proof contract and a passing receipt, so an upgraded knowledge base passes; raise a floor to `tested` once the requirement has an end-to-end proof. Requirements that keep `tested` are listed, and `kibi check --rules evidence-floor` shows any whose proof still has gaps, such as a stale receipt. For the same reason, requirements `kibi bootstrap` imports from a person's documents are recorded with `required_evidence: asserted`, so a freshly bootstrapped knowledge base passes `kibi check`. A knowledge base below schema 11 is not judged by `evidence-floor` until it is upgraded. The kibi-usage skill (2.25.0) explains floors to agents.
