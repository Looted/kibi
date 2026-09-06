---
"kibi-cli": patch
---

Status and bootstrap activation no longer crash when a host (or a leaked test mock) omits the source-file list. `kibi status` now treats a missing glob result as "no source files" and still reports store and bootstrap posture.
