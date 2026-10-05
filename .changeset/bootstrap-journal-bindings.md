---
"kibi-cli": patch
---

Approved bootstrap plans now apply when the current KB uses a journal generation and revision. A change to that revision still rejects the plan before writing.

Accept the existing journal snapshot format in bootstrap plan validation while retaining canonical hash, workspace, and live snapshot checks.
