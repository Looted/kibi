---
"kibi-cli": patch
---

Running `kibi init` now completes an existing empty or partially initialized knowledge directory so bootstrap can proceed. Repeated initialization preserves authored knowledge, lifecycle metadata, symbols, and existing schema files.

Reconcile missing canonical directories, branch storage, ignore entries, and schema files instead of skipping setup whenever `.kb` exists. Refuse substituted directory paths and copy missing schema files without overwriting existing destinations.
