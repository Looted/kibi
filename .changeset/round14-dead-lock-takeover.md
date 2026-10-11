---
"kibi-cli": patch
"kibi-runtime": patch
---

When an engine or a `kibi prove` run is killed while it holds the branch store, the next attach now records the takeover, so `kb_status` lists the `store_lock_taken_over` notice and `kibi doctor` reports it. Before, the notice never appeared in practice: the operating system releases a dead holder's lock, so the attach that the takeover record depended on never failed. `kibi doctor` now also reports a takeover on a branch store that is not compiled yet.

Technical summary: the new `noteDeadHolderBeforeAttach(kbPath)` in `prolog/store-lock.ts` reads the `rdf/lock` file a holder leaves only when it crashes or is killed (SWI deletes it on every detach and halt), classifies its holder (the ownership journal when it names the same pid, else the lock file's pid) with `decideStoreLockTakeover`, and returns a step that writes `<store>/.kibi-lock-takeover.json`; `EngineSession.boot` and the CLI runtime run it only after `kb_attach` succeeds. `recoverStaleJournalLock`, which the daemon and sync run before attaching, records the takeover before it removes a dead holder's `rdf/lock` and now treats an `EPERM` liveness probe as a live holder. `retryAttachAfterBreakingStaleLock` keeps its record for the `store_locked` path.
