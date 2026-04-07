---
"kibi-cli": patch
---

fix(cli): eliminate 2-second false wait during PrologProcess startup under Bun

- `PrologProcess.waitForReady()` previously looped for up to 2000ms waiting for any stdout/stderr output from `swipl`.
- Under Bun v1.3.6, spawned `swipl` does not emit output until stdin is written, causing every `start()` to waste ~2 seconds.
- The fix sends `true.\n` to stdin immediately after spawn and waits for the `true.` response, reducing startup detection time from ~2000ms to ~50ms.
- This resolves the `temp-kb.test.ts` timeout under bare `bun test` and significantly speeds up all CLI tests that spawn Prolog processes.
