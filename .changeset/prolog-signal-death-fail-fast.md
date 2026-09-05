---
"kibi-cli": patch
---

The Kibi engine no longer waits out its full query timeout when the underlying SWI-Prolog child dies unexpectedly. Previously, if the interactive `swipl` process was killed by an external signal (for example the kernel OOM killer), the engine kept treating the dead child as healthy — `exitCode` stays null on signal deaths and `killed` only reflects Node-initiated kills — so in-flight queries hung for the entire 120-second timeout, fixture imports retried three times against a wedged daemon, and shutdown could stall behind the same dead-process query. Signal-killed children are now detected at startup and before/during every query, failing fast with a clear error instead of a silent multi-minute hang.

Technical summary: `PrologProcess.waitForReady`, `isProcessUsable`, and `isRunning` now also check `child.signalCode`; the query-timeout diagnostic message includes the terminating signal.
