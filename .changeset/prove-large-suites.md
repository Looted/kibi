---
"kibi-cli": minor
"kibi-runtime": patch
"kibi-mcp": patch
---

`kibi prove` and `kb_ingest_proof` now work with large test suites, and `kibi prove --test` on a Playwright integration runs only the selected tests' specs.

- A `kibi.proof-run.v1` artifact may carry up to 100,000 proof results (was 1,000). A Playwright reporter writes one result per case and project, so a suite with more than 1,000 cases could never get a receipt, not even for one test. An artifact over the cap is still rejected, and the error now states how many results it held. The protocol version is unchanged: the advertised `kb_ingest_proof` schema only raises `proof_results.maxItems`.
- Proof ingest accepts a Playwright run that `kibi prove` narrowed to the selected tests' `proof_bindings[].source_file` specs. Ingest used to refuse every narrowed run because its `command_argv` differed from the configured command, so narrowing never produced a receipt. A narrowed run is accepted for a test only when it ran every spec file that test is bound to, and only when each appended argument is a spec file of a test ingested from that run. The receipt records the command that ran; the execution fingerprint still binds the configured command.
- When proof ingest refuses an integration's artifact, `kibi prove` lists the refusal in `failures`, still prints the JSON summary with the other integrations' receipts, and does not record the refused integration as ingested, so `--resume` runs it again. Before, the refusal ended the command with no summary. Engine, lock and rollback errors still end the command.
- The JSON summary lists each integration that `--test`, `--requirement` or `--stale` could not narrow in a new `notNarrowed` field (`[{"integration", "reason"}]`), so a caller that reads only stdout learns why the whole suite ran.
- Ingest hashes the artifact once per ingest instead of once per test, and looks up each obligation's result by key, so a large run is evaluated in linear time.

No migration is needed.
