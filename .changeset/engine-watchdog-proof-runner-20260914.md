---
"kibi-cli": patch
---

When a workspace disappears while Kibi is running, the detached engine now notices and shuts down so later commands do not inherit a stale lock or socket. Proof runs also reject packed suites that finish without executing a runnable test, which keeps reported verification aligned with work that actually ran.

- Add a bounded watchdog override for integration fixtures.
- Require a complete, non-empty TAP result from packed proof runs.
