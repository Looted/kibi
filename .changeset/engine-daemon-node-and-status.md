---
"kibi-cli": patch
"kibi-runtime": patch
---

The engine daemon now starts with the same Node.js that runs `kibi` (or `KIBI_NODE_PATH` when set), instead of the first `node` on `PATH`. A host that runs Kibi through Node.js 22 by absolute path no longer gets an older daemon that fails to start. `kibi engine status` no longer hangs on SWI-Prolog 9.0, where the storage status query waited on an interactive prompt. Its `status` field is now the storage status object; before, it was the raw Prolog dict text.
