---
"kibi-cli": patch
---

The journaled engine daemon now starts under Node, not only Bun. Hosts that spawn `engine-daemon.js` with Node 22.14 and earlier never set `import.meta.main`, so the process exited immediately and clients waited until timeout. The entry check now compares `argv[1]` to the module URL so `kibi` and unit tests can attach to a live daemon again.
