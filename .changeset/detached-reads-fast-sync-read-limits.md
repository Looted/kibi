---
"kibi-cli": minor
"kibi-mcp": minor
"kibi-runtime": minor
"kibi-plugin-builtin": patch
---

Kibi now answers questions on a CI checkout or any detached commit, compiles a cold knowledge base minutes faster, and can stop a runaway read before it blocks other agents. On a bare SHA, search, query, status, check, coverage and graph read a snapshot of that checkout and say so in every answer, while writes are refused with the command that fixes it. A cold `kibi sync` of the Kibi repository went from about 4 min 23 s to 19 s, and `--refresh-symbol-coordinates` from about 5 min 55 s to 26 s, with byte-identical results.

- Detached HEAD with zero or several local branches at HEAD: read-only operations (CLI routes, human commands, MCP tools) attach a read-only snapshot store (`kibi-internal/detached-head-snapshot`) compiled incrementally from the checkout's tracked sources, and add a `detached_head_read_only` warning diagnostic with the commit, branches at HEAD, store path and `writes: "refused"`. Write operations and `kibi sync` refuse with an actionable message (`git switch <branch>`, `git switch -c <branch>`, or `KIBI_BRANCH`). One branch at HEAD still attaches that branch exactly; no branch KB is ever guessed or written. `kibi engine stop/status` address the snapshot daemon, and `kibi gc` keeps the snapshot while it is in use.
- Sync: source-owned entity lookups before retracts run in batches of 200 instead of one engine round trip per path candidate; the Prolog client wakes on the answer frame instead of a 50 ms poll; TypeScript coordinate enrichment adds every source file before the first export check, so the type checker program is built once instead of once per file.
- Engine read limits: `KIBI_ENGINE_READ_TIME_LIMIT_MS` and `KIBI_ENGINE_READ_INFERENCE_LIMIT` (opt-in, unset by default) bound each read-only engine request with `call_with_time_limit/2` and `call_with_inference_limit/3`. A read that hits its limit fails with `QUERY_LIMIT_EXCEEDED` and `error.details.limitExceeded` (`kind`, `limit`) on the CLI and MCP envelopes, never with a partial answer; writes, module loads and sync compilation are never bounded.
