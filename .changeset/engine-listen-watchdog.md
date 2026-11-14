---
"kibi-cli": patch
---

An engine daemon that fails to bind its socket no longer leaves its workspace watchdog running. The process that started it, such as a test run or a host embedding the engine, could otherwise be shut down a minute later once the workspace was removed.

- `runEngineDaemon` clears the workspace watchdog when `server.listen` fails, before it rethrows the error.
