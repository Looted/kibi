---
"kibi-cli": patch
---

Fix staged freshness checks silently passing on large repositories

Kibi's pre-commit gate reads staged files through `git show` with Node's
default 1 MiB output buffer. Repositories with an authored symbol manifest
larger than that limit had the manifest silently skipped, so `kibi check
--staged` compared source symbols against stale HEAD state and could block
commits with false `symbols_manifest_stale` errors — or worse, wave through
genuinely stale artifacts. The Git execution buffer is now 64 MiB, so large
manifests and coordinate artifacts are read in full and freshness is judged
against what is actually staged.

- Raise the child-process buffer used by staged-file collection to 64 MiB
- Keep injected test executors unchanged; only the default executor grows
