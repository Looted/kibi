---
"kibi-cli": patch
"kibi-runtime": patch
---

Stopping the engine daemon now releases the branch store cleanly, so `rdf/lock` and `.kibi-lock-owner.json` no longer stay behind after every stop or idle exit, and the idle exit happens on time even after the machine or VM was suspended. When Kibi does take over a lock whose holder died, `kb_status` and `kibi doctor` now say so instead of the takeover being visible only in a detached process's discarded output.

Technical summary: daemon shutdown runs `kb_detach` after a successful `kb_save` and fsync, then signals the SWI-Prolog child; when the detach did not complete it first gives the child up to 1 s to halt on stdin EOF and run its at_halt cleanup (`PrologProcess.terminate({ graceMs })`, which returns as soon as the child exits). Idle exit uses a wall-clock check (`lastActivityAt`, updated on every request and client close) on an unref'd interval of min(idle timeout, 30 s) instead of a one-shot timer. Before breaking a stale lock, `retryAttachAfterBreakingStaleLock` writes `<store>/.kibi-lock-takeover.json` (`brokenPid`, `reason`, `at`); `kb_status` lists it for 24 hours as a non-blocking `store_lock_taken_over` entry in the new `notices` field, and `kibi doctor`'s branch-store check reports it.
