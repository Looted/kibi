---
"kibi-cli": patch
"kibi-core": patch
---

`kibi coverage`, `kibi proof impact`, and requirement health reports no longer break with "Predicate or file not found" once a project's proof receipt history grows large. Per-contract proof binding used to load every test together with its full receipt history in a single answer. Past the 8 MiB output cap, that answer terminated the engine's Prolog session, and later queries quietly ran in throwaway processes without the attached KB. The engine now reads only the small per-test data it needs, and it restarts and reattaches its session if a query ever overflows or times out. Failures are reported instead of being hidden behind stale results.

- Engine daemon: a lost interactive SWI session (output overflow, timeout, crash) is recycled before the next request. Recycling restarts the process, reattaches the branch store, and reloads the preloaded and client-loaded modules. The overflowing request still fails with the explicit ENOBUFS error.
- `PrologProcess`: once started, a lost process never falls back to one-shot execution; queries raise `PrologProcessTerminatedError` with the cause. New `oneShotMode`/`needsRestart()` accessors and an injectable `maxOutputBytes` cap.
- `runOperationJsonQuery`: isolated (one-shot or unstarted) ports report `oneShotMode` and receive the combined module-load + call goal.
- `perContractTestBindings`: reads the paged `kb_query_proof_contracts` projection (now carrying `source`) and propagates engine failures instead of silently returning `null`.
- `kb_query_proof_contracts` (kibi-core) matches both the in-session `kb:Key` and the reloaded `urn-kibi:Key` property URIs. Before this, a reloaded store projected no tests.
- Receipt-bearing bulk loads now page: proof ingest candidate selection, `kibi proof prune`, legacy receipt migration, and the full-KB quality projection (no unbounded all-entities probe).
